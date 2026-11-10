import { useEffect, useMemo, useState } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('destaques');
  const [source, setSource] = useState('todos');
  const [compact, setCompact] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    fetch(`./news.json?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error('Falha na requisição');
        return r.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const allSources = useMemo(
    () => [...new Set((data?.stories ?? []).flatMap((s) => s.sources.map((x) => x.name)))].sort(),
    [data]
  );

  const filteredList = useMemo(() => {
    let list = data?.stories ?? [];

    if (source !== 'todos') {
      list = list.filter((s) => s.sources.some((x) => x.name === source));
    }

    if (tab === 'recentes') {
      return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // destaques já vem classificado por score decrescente
    return list;
  }, [data, tab, source]);

  const displayedStories = useMemo(
    () => filteredList.slice(0, visibleCount),
    [filteredList, visibleCount]
  );

  return (
    <div className="container">
      <header className="header">
        <div className="header-brand">
          <h1>Notícias</h1>
          {data?.updatedAt && (
            <p className="header-subtitle">
              Atualizado às {new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </header>

      <section className="controls">
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'destaques'}
            onClick={() => {
              setTab('destaques');
              setVisibleCount(25);
            }}
          >
            Destaques
          </button>
          <button
            role="tab"
            aria-selected={tab === 'recentes'}
            onClick={() => {
              setTab('recentes');
              setVisibleCount(25);
            }}
          >
            Mais recentes
          </button>
        </div>

        <div className="controls-right">
          <div className="filter-select-wrapper">
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setVisibleCount(25);
              }}
              aria-label="Filtrar por portal"
            >
              <option value="todos">Todos os portais</option>
              {allSources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`btn-mode ${compact ? 'active' : ''}`}
            onClick={() => setCompact(!compact)}
            title={compact ? 'Alternar para visão com resumo' : 'Alternar para visão compacta'}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>{compact ? 'Compacto' : 'Detalhado'}</span>
          </button>
        </div>
      </section>

      {loading && !data && (
        <div className="status-message">
          <div className="spinner"></div>
          <p>Carregando as principais notícias…</p>
        </div>
      )}

      {error && (
        <div className="status-message error">
          <p>Não foi possível carregar as notícias no momento.</p>
        </div>
      )}

      {!loading && !error && data && filteredList.length === 0 && (
        <div className="status-message empty">
          <p>Nenhuma notícia encontrada para o portal selecionado.</p>
          <button
            className="btn-load-more"
            style={{ marginTop: '12px' }}
            onClick={() => setSource('todos')}
          >
            Ver todos os portais
          </button>
        </div>
      )}

      <main className={`news-feed ${compact ? 'compact-feed' : ''}`}>
        {displayedStories.map((s, index) => {
          const leadSource = s.sources?.[0]?.name || 'Notícia';
          const otherSources = (s.sources || []).filter((x) => x.name !== leadSource);
          const isTopLead = tab === 'destaques' && source === 'todos' && index === 0;

          return (
            <article key={s.id} className={`story-entry ${isTopLead ? 'is-lead' : ''}`}>
              <div className="story-meta">
                <span className="source-tag">{leadSource}</span>
                {s.sources.length > 1 && (
                  <span className="multi-source-pill" title={`${s.sources.length} portais noticiando este fato`}>
                    {s.sources.length} portais
                  </span>
                )}
                {isTopLead && <span className="lead-pill">Destaque</span>}
              </div>

              <h2 className="story-headline">
                <a href={s.link} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </h2>

              {!compact && s.summary && (
                <p className="story-summary">{s.summary}</p>
              )}

              {otherSources.length > 0 && (
                <div className="other-sources">
                  <span className="other-sources-label">Também em:</span>
                  <div className="other-sources-list">
                    {otherSources.map((src) => (
                      <a
                        key={src.name}
                        href={src.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="other-source-link"
                        title={src.title || src.name}
                      >
                        {src.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </main>

      {filteredList.length > visibleCount && (
        <div className="load-more-container">
          <button
            className="btn-load-more"
            onClick={() => setVisibleCount((prev) => prev + 25)}
          >
            Carregar mais notícias ({filteredList.length - visibleCount} restantes)
          </button>
        </div>
      )}

      <footer className="footer">
        <p>Os links levam diretamente às matérias originais nos portais jornalísticos.</p>
      </footer>
    </div>
  );
}
