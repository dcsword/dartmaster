export default function H2HSection({
  query,
  results,
  selected,
  h2h,
  loading,
  onSearch,
  onSelect,
}) {
  return (
    <div className="stats-h2h-section">
      <div className="label-xs stats-section-label">Head to head</div>

      <div className="stats-search-wrap">
        <input
          placeholder="Search for a player..."
          value={query}
          onChange={event => onSearch(event.target.value)}
          className="stats-search-input"
        />

        {results.length > 0 && (
          <div className="stats-search-results">
            {results.slice(0, 6).map(result => (
              <button key={result.id} className="stats-search-result" onClick={() => onSelect(result)}>
                <div
                  className="stats-search-avatar"
                  style={{ background: result.avatar_color || 'var(--accent)' }}
                >
                  {result.name[0].toUpperCase()}
                </div>
                <span className="stats-search-name">{result.name}</span>
                {result.username && <span className="stats-search-username">@{result.username}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="stats-loading-copy">Loading...</div>}

      {h2h && !loading && (
        h2h.totalH2H === 0 ? (
          <div className="card stats-empty-card">
            <p className="stats-empty-copy">No head to head games found against {selected?.name}</p>
          </div>
        ) : (
          <div className="card stats-h2h-card">
            <div className="stats-h2h-row">
              <div className="stats-h2h-player">
                <div className="stats-h2h-avatar" style={{ background: h2h.player1.avatar_color || 'var(--accent)' }}>
                  {h2h.player1.name[0].toUpperCase()}
                </div>
                <div className="stats-h2h-name">{h2h.player1.name}</div>
                <div className={`stats-h2h-score ${h2h.player1.wins > h2h.player2.wins ? 'stats-h2h-score-leading' : ''}`}>
                  {h2h.player1.wins}
                </div>
                <div className="stats-h2h-avg">avg {h2h.player1.avgPerDart}</div>
              </div>

              <div className="stats-h2h-vs">
                <div className="stats-h2h-vs-title">VS</div>
                <div className="stats-h2h-vs-copy">{h2h.totalH2H} games</div>
              </div>

              <div className="stats-h2h-player">
                <div className="stats-h2h-avatar" style={{ background: h2h.player2.avatar_color || '#4a9eff' }}>
                  {h2h.player2.name[0].toUpperCase()}
                </div>
                <div className="stats-h2h-name">{h2h.player2.name}</div>
                <div className={`stats-h2h-score ${h2h.player2.wins > h2h.player1.wins ? 'stats-h2h-score-leading' : ''}`}>
                  {h2h.player2.wins}
                </div>
                <div className="stats-h2h-avg">avg {h2h.player2.avgPerDart}</div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
