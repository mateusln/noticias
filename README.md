# Notícias do dia

Agregador estático: GitHub Actions coleta RSS a cada 30 min → `public/news.json` → site React (Vite) no Cloudflare Pages.

## Rodar local
```bash
npm install
npm run fetch   # gera public/news.json
npm run dev
```

## Publicar (custo zero)
1. Crie um repositório **público** no GitHub e suba o projeto.
2. Em *Settings → Actions → General → Workflow permissions*, marque **Read and write**.
3. Cloudflare Pages → *Create project* → conecte o repositório. Build: `npm run build`, saída: `dist`.
4. Aba *Actions* → execute `update-news` manualmente uma vez. A partir daí roda sozinho.
5. Em *Custom domains* do Pages, aponte o seu domínio.

## Ajustes
- Feeds: `FEEDS` em `scripts/fetch-news.js` (confira se as URLs ainda funcionam).
- Agrupamento: `SIMILARITY` (menor = junta mais títulos). Janela: `MAX_AGE_HOURS`.
- Ranking de "Destaques": nº de portais cobrindo + posição no feed + recência.
