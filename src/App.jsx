import { useEffect, useMemo, useState } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openIds, setOpenIds] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    fetch(`./news.json?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar notícias');
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

  const currentDate = useMemo(() => {
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, []);

  const lastUpdated = useMemo(() => {
    if (!data?.updatedAt) return '';
    const date = new Date(data.updatedAt);
    if (Number.isNaN(date.getTime())) return '';
    const time = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (date.toDateString() === new Date().toDateString()) {
      return `Última atualização às ${time}`;
    }
    const day = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    return `Última atualização em ${day} às ${time}`;
  }, [data?.updatedAt]);

  const toggleItem = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const stories = data?.stories ?? [];
  const displayedStories = stories.slice(0, visibleCount);

  return (
    <main className="container">
      <header>
        <div className="brand">Notícias</div>
        <h1 className="current-date">{currentDate}</h1>
      </header>

      {loading && !data && (
        <div className="state-message">Carregando as principais notícias…</div>
      )}

      {error && (
        <div className="state-message">Não foi possível carregar as notícias.</div>
      )}

      {!loading && !error && stories.length === 0 && (
        <div className="state-message">Nenhuma notícia encontrada.</div>
      )}

      <ul className="news-list">
        {displayedStories.map((s) => {
          const isOpen = openIds.has(s.id);
          const storyTime = s.date ? new Date(s.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          const sourcesList =
            s.sources && s.sources.length > 0
              ? s.sources
              : [{ name: 'Fonte original', title: s.title, link: s.link }];

          return (
            <li
              key={s.id}
              className={`news-item ${isOpen ? 'is-open' : ''}`}
            >
              <button
                type="button"
                className="news-trigger"
                onClick={() => toggleItem(s.id)}
                aria-expanded={isOpen}
              >
                <h2 className="headline">{s.title}</h2>
              </button>

              <div className="sources-panel">
                {s.summary && <p className="source-summary">{s.summary}</p>}

                <ul className="sources-list">
                  {sourcesList.map((src, idx) => (
                    <li key={idx}>
                      <a
                        href={src.link || s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        <span className="source-name">{src.name}</span>
                        <span className="source-title" title={src.title || s.title}>
                          {src.title || s.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>

      {stories.length > visibleCount && (
        <button
          type="button"
          className="load-more-btn"
          onClick={() => setVisibleCount((prev) => prev + 25)}
        >
          Carregar mais notícias ({stories.length - visibleCount} restantes)
        </button>
      )}

      {lastUpdated && (
        <footer className="footer">
          <time dateTime={data.updatedAt}>{lastUpdated}</time>
        </footer>
      )}
    </main>
  );
}
