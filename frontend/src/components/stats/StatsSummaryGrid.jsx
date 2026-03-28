function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card-sm stats-card">
      <div className="label-xs stats-card-label">{label}</div>
      <div className={`stats-card-value ${accent ? 'stats-card-value-accent' : ''}`}>{value}</div>
      {sub && <div className="stats-card-sub">{sub}</div>}
    </div>
  );
}

export default function StatsSummaryGrid({ stats }) {
  return (
    <>
      <div className="stats-grid-row">
        <StatCard label="GAMES" value={stats.totalGames} />
        <StatCard label="WINS" value={stats.wins} accent />
        <StatCard label="LOSSES" value={stats.losses} />
      </div>

      <div className="stats-grid-row">
        <StatCard label="WIN %" value={`${stats.winRate}%`} accent />
        <StatCard label="AVG / DART" value={stats.avgPerDart || '—'} sub="last 10 games" />
      </div>

      <div className="stats-grid-row">
        <StatCard
          label="CHECKOUT %"
          value={stats.checkoutOpps > 0 ? `${stats.checkoutPercent}%` : '—'}
          sub={stats.checkoutOpps > 0 ? `${stats.checkoutHits}/${stats.checkoutOpps} attempts` : 'no data yet'}
        />
        <StatCard
          label="180s"
          value={stats.max180s || '—'}
          sub={stats.max180s > 0 ? 'maximum scores' : 'none yet'}
          accent={stats.max180s > 0}
        />
      </div>
    </>
  );
}
