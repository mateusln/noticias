import { useEffect, useMemo, useState } from 'react';

const fmtTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

function Story({ s, big }) {
  return (
    <article className={big ? 'story big' : 'story'}>
      <h2><a href={s.link} target="_blank" rel="noopener noreferrer">{s.title}</a></h2>
      {s.summary && <p className="summary">{s.summary}</p>}
      <p className="meta">
        <time dateTime={s.date}>{fmtTime(s.date)}</time>
        {s.sources.length > 1 && <span className="count">{s.sources.length} portais</span>}
      </p>
      <p className="sources">
        {s.sources.map((src) => (
          <a key={src.name} href={src.link} target="_blank" rel="noopener noreferrer">{src.name}</a>
        ))}
      </p>
    </article>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('destaques');
  const [source, setSource] = useState('todos');

  useEffect(() => {
    fetch(`./news.json?t=${Date.now()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const allSources = useMemo(
    () => [...new Set((data?.stories ?? []).flatMap((s) => s.sources.map((x) => x.name)))].sort(),
    [data]
  );

  const list = useMemo(() => {
    let l = data?.stories ?? [];
    if (source !== 'todos') l = l.filter((s) => s.sources.some((x) => x.name === source));
    if (tab === 'recentes') return [...l].sort((a, b) => new Date(b.date) - new Date(a.date));
    return l.slice(0, 30); // já vem ordenado por pontuação
  }, [data, tab, source]);

  return (
    <div className="page">
      <header>
        <h1>Notícias do dia</h1>
        {data?.updatedAt && <p className="updated">Atualizado às {fmtTime(data.updatedAt)}</p>}
      </header>

      <nav className="controls">
        <div role="tablist" className="tabs">
          {['destaques', 'recentes'].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === 'destaques' ? 'Destaques' : 'Mais recentes'}
            </button>
          ))}
        </div>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filtrar por portal">
          <option value="todos">Todos os portais</option>
          {allSources.map((n) => <option key={n}>{n}</option>)}
        </select>
      </nav>

      {error && <p className="state">Não foi possível carregar as notícias. Tente de novo em instantes.</p>}
      {!error && !data && <p className="state">Carregando…</p>}
      {data && !list.length && (
        <p className="state">Ainda não há notícias. Rode <code>npm run fetch</code> ou execute o workflow no GitHub.</p>
      )}

      <main className="grid">
        {list.map((s, i) => <Story key={s.id} s={s} big={tab === 'destaques' && i < 3} />)}
      </main>

      <footer>Os títulos levam às matérias originais, publicadas por cada portal.</footer>
    </div>
  );
}
