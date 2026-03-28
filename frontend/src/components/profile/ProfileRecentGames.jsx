export default function ProfileRecentGames({ games, onSelectGame }) {
  return (
    <>
      <div className="label-xs profile-section-label">Recent games</div>
      {games.length === 0 && <p className="profile-empty-copy">No finished games yet.</p>}
      <div className="profile-games-list">
        {games.slice(0, 10).map(game => (
          <div
            key={game.id}
            className="card profile-game-row"
            onClick={() => onSelectGame(game.id)}
          >
            <div className="profile-game-result">
              <span style={{ fontSize: '14px' }}>{game.won ? '🏆' : '·'}</span>
              <span className={game.won ? 'profile-game-result-win' : 'profile-game-result-loss'}>
                {game.won ? 'Win' : 'Loss'}
              </span>
              <span className="tag profile-game-tag">{game.ruleset.replace(/_/g, ' ')}</span>
            </div>
            <span className="profile-game-date">{new Date(game.finished_at).toLocaleDateString('en-GB')}</span>
          </div>
        ))}
      </div>
    </>
  );
}
