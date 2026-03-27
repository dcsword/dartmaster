function ScoreRow({ name, score, isActive, avatarColor, showAvatar = true }) {
  return (
    <div className={`game-score-row ${isActive ? 'game-score-row--active' : ''}`}>
      {showAvatar && (
        <div className="game-avatar game-avatar--md" style={{ background: avatarColor || 'var(--muted2)' }}>
          {name[0].toUpperCase()}
        </div>
      )}
      <span className={`game-score-row__name ${isActive ? 'game-score-row__name--active' : ''}`}>
        {name}{isActive ? ' ▶' : ''}
      </span>
      <span className={`game-score-medium ${isActive ? 'game-score-row__score--active' : 'game-score-row__score'}`}>
        {score}
      </span>
    </div>
  );
}

export function GameScoreboard({ game, currentPlayerIdx, currentTeamIdx, remaining }) {
  return (
    <div className="game-scoreboard">
      {game.mode === 'singles' && game.players.map((player, playerIndex) => (
        <ScoreRow
          key={player.id}
          name={player.name}
          score={playerIndex === currentPlayerIdx ? remaining : player.score}
          isActive={playerIndex === currentPlayerIdx}
          avatarColor={player.avatar_color}
        />
      ))}

      {game.mode === 'teams' && game.teams.map((team, teamIndex) => (
        <ScoreRow
          key={team.id}
          name={team.name}
          score={teamIndex === currentTeamIdx ? remaining : team.score}
          isActive={teamIndex === currentTeamIdx}
          showAvatar={false}
        />
      ))}
    </div>
  );
}

export function GamePhoneOpponents({ game, currentPlayerIdx, currentTeamIdx }) {
  if (game.mode === 'singles') {
    return game.players
      .filter((_, index) => index !== currentPlayerIdx)
      .map(player => (
        <div key={player.id} className="game-opponent-row">
          <div className="game-avatar game-avatar--sm" style={{ background: player.avatar_color || 'var(--muted2)' }}>
            {player.name[0].toUpperCase()}
          </div>
          <span className="game-opponent-row__name">{player.name}</span>
          <span className="game-score-small game-opponent-row__score">{player.score}</span>
        </div>
      ));
  }

  return game.teams
    .filter((_, index) => index !== currentTeamIdx)
    .map(team => (
      <div key={team.id} className="game-opponent-row">
        <span className="game-opponent-row__name">{team.name}</span>
        <span className="game-score-small game-opponent-row__score">{team.score}</span>
      </div>
    ));
}
