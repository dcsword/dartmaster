const STATS = [
  { label: 'GAMES', key: 'games_played' },
  { label: 'WINS', key: 'games_won' },
  { label: 'WIN %', key: 'win_rate', format: value => `${value || 0}%` },
  { label: 'AVG/DART', key: 'avg_per_dart' },
  { label: 'BEST CO', key: 'highest_checkout', format: value => value || '—' },
  { label: 'BEST LEG', key: 'best_game_darts', format: value => (value ? `${value}d` : '—') },
];

export default function ProfileStatsGrid({ player }) {
  return (
    <div className="profile-stats-grid">
      {STATS.map(stat => (
        <div key={stat.label} className="card-sm profile-stat-card">
          <div className="label-xs profile-stat-label">{stat.label}</div>
          <div className="profile-stat-value">
            {stat.format ? stat.format(player[stat.key]) : player[stat.key] || 0}
          </div>
        </div>
      ))}
    </div>
  );
}
