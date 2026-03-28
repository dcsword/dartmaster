export default function StatsHeader({ user, onProfileClick }) {
  return (
    <div className="stats-header">
      <div>
        <h1 className="stats-title">STATS</h1>
        {user && <p className="stats-user-copy">@{user.username || user.name}</p>}
      </div>
      {user && (
        <div
          className="stats-avatar"
          style={{ background: user.avatar_color || 'var(--accent)' }}
          onClick={onProfileClick}
        >
          {user.name[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}
