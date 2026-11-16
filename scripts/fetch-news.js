// Coleta feeds RSS, agrupa notícias parecidas e grava public/news.json
import Parser from 'rss-parser';
import fs from 'node:fs';

// Confira cada URL (feeds mudam de endereço de vez em quando). Feeds que falharem são ignorados.
const FEEDS = [
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/' },
  { source: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml' },
  { source: 'Folha', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
  { source: 'UOL', url: 'https://rss.uol.com.br/feed/noticias.xml' },
  { source: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
  { source: 'Poder360', url: 'https://www.poder360.com.br/feed/' },
  { source: 'Valor', url: 'https://pox.globo.com/rss/valor' },
  { source: 'Carta', url: 'https://www.cartacapital.com.br/feed/' },
  { source: 'ICL', url: 'https://iclnoticias.com.br/feed/' },
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
  { source: 'Google', url: 'https://news.google.com/rss' },
  { source: 'GGN Nassif', url: 'https://jornalggn.com.br/feed/' },
  { source: 'Gazeta do povo', url: 'https://www.gazetadopovo.com.br/feed/rss/ultimas-noticias.xml' },
  { source: 'Revista Oeste', url: 'https://revistaoeste.com/feed/' },
  { source: 'Estadão', url: 'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/economia/?body=%7B%22layout%22:%22google-news%22%7D' },
  
];

const PER_FEED = 100;
const MAX_AGE_HOURS = 24;
const SIMILARITY = 0.45; // 0 a 1: quanto maior, mais rígido o agrupamento
const OUT = 'public/news.json';

const STOP = new Set('para como mais pelo pela pelos pelas sobre entre apos ainda depois contra desde sem sob essa esse esta este isso aquele tambem sera foram seus suas dele dela mesmo quando onde porque'.split(' '));

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tokens = (title) =>
  new Set(norm(title).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)));

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

const clean = (html = '') =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'noticias-do-dia/1.0' } });
const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
const items = [];

await Promise.all(
  FEEDS.map(async (f) => {
    try {
      const res = await fetch(f.url, {
        headers: { 'User-Agent': 'noticias-do-dia/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      const buf = await res.arrayBuffer();
      const ctype = res.headers.get('content-type') || '';
      const preview = new TextDecoder('ascii', { fatal: false }).decode(buf.slice(0, 200));
      const isIso =
        ctype.toLowerCase().includes('iso-8859-1') ||
        ctype.toLowerCase().includes('latin1') ||
        /encoding=["'](iso-8859-1|latin1|windows-1252)["']/i.test(preview);
      let text = isIso ? new TextDecoder('iso-8859-1').decode(buf) : new TextDecoder('utf-8').decode(buf);
      if (text.includes('<rss>') && !text.includes('<rss version')) {
        text = text.replace('<rss>', '<rss version="2.0">');
      }
      const feed = await parser.parseString(text);
      feed.items.slice(0, PER_FEED).forEach((it, rank) => {
        const date = it.isoDate ? new Date(it.isoDate).getTime() : Date.now();
        if (!it.title || !it.link || date < cutoff) return;
        items.push({
          title: it.title.trim(),
          link: it.link,
          date,
          rank, // posição no feed: quanto menor, mais destaque na redação
          summary: clean(it.contentSnippet || it.content || '').slice(0, 220),
          source: f.source,
          tokens: tokens(it.title),
        });
      });
    } catch (e) {
      console.error(`Falhou: ${f.source} (${e.message})`);
    }
  })
);

// Agrupamento simples: cada item entra no primeiro grupo parecido, ou cria um novo
const clusters = [];
for (const it of items.sort((a, b) => a.rank - b.rank)) {
  const hit = clusters.find((c) => jaccard(c.tokens, it.tokens) >= SIMILARITY);
  if (hit) hit.items.push(it);
  else clusters.push({ tokens: it.tokens, items: [it] });
}

const stories = clusters
  .map((c) => {
    const bySource = new Map();
    for (const it of c.items) if (!bySource.has(it.source)) bySource.set(it.source, it);
    const sources = [...bySource.values()];
    const lead = sources.slice().sort((a, b) => a.rank - b.rank)[0];
    const newest = Math.max(...c.items.map((i) => i.date));
    const bestRank = Math.min(...c.items.map((i) => i.rank));
    // Pontuação: mais portais cobrindo pesa mais; depois posição no feed; depois recência
    const ageH = (Date.now() - newest) / 3600000;
  // retira peso de recencia do artigo
    // const score = sources.length * 10 + (PER_FEED - bestRank) / 3 - ageH / 24;
    const score = sources.length;
    return {
      id: Buffer.from(lead.link).toString('base64url').slice(-16),
      title: lead.title,
      summary: lead.summary,
      link: lead.link,
      date: new Date(newest).toISOString(),
      score: Math.round(score * 10) / 10,
      sources: sources.map((s) => ({ name: s.source, title: s.title, link: s.link })),
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 150);

// Só reescreve (e gera commit) se algo mudou de fato
let previous = [];
try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')).stories; } catch { }
const strip = (l) => JSON.stringify(l.map(({ score, ...rest }) => rest));
if (strip(previous) === strip(stories)) {
  console.log('Sem mudanças.');
} else {
  fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), stories }));
  console.log(`${stories.length} notícias gravadas.`);
}
