import { useRef, useState } from 'react';
import { COLORS } from '../../constants/setupOptions';
import DragHandle from './DragHandle';

export default function TeamCard({
  team,
  teamIndex,
  totalTeams,
  teamListRef,
  onTeamUpdate,
  onTeamRemove,
  onTeamDragStart,
  onTeamDragOver,
  onTeamDrop,
  isTeamDragging,
}) {
  const playerListRef = useRef(null);
  const playerDragIdx = useRef(null);
  const [playerDragOver, setPlayerDragOver] = useState(null);

  function handlePlayerDragStart(index) {
    playerDragIdx.current = index;
  }

  function handlePlayerDragOver(index) {
    setPlayerDragOver(index);
  }

  function handlePlayerDrop() {
    const from = playerDragIdx.current;
    const to = playerDragOver;
    if (from === null || to === null || from === to) {
      playerDragIdx.current = null;
      setPlayerDragOver(null);
      return;
    }

    const updatedPlayers = [...team.players];
    const [movedPlayer] = updatedPlayers.splice(from, 1);
    updatedPlayers.splice(to, 0, movedPlayer);
    onTeamUpdate({ ...team, players: updatedPlayers });

    playerDragIdx.current = null;
    setPlayerDragOver(null);
  }

  return (
    <div
      data-row-index={teamIndex}
      draggable
      onDragStart={() => onTeamDragStart(teamIndex)}
      onDragOver={event => {
        event.preventDefault();
        onTeamDragOver(teamIndex);
      }}
      onDrop={() => onTeamDrop()}
      className="card"
      style={{ padding: '16px', opacity: isTeamDragging ? 0.4 : 1, transition: 'opacity 0.15s' }}
    >
      <div className="setup-team-header">
        <DragHandle
          index={teamIndex}
          listRef={teamListRef}
          onDragStart={onTeamDragStart}
          onDragOver={onTeamDragOver}
          onDrop={onTeamDrop}
        />
        <input
          placeholder={`Team ${teamIndex + 1} name`}
          value={team.name}
          onChange={event => onTeamUpdate({ ...team, name: event.target.value })}
          style={{ fontWeight: 600, flex: 1 }}
        />
        {totalTeams > 2 && (
          <button onClick={onTeamRemove} className="setup-icon-button setup-icon-button-danger">×</button>
        )}
      </div>

      <div className="setup-team-players">
        <p className="setup-subcopy">PLAYERS · ⠿ drag to reorder</p>
        <div ref={playerListRef} className="setup-stack-sm">
          {team.players.map((player, playerIndex) => (
            <div
              key={playerIndex}
              data-row-index={playerIndex}
              draggable
              onDragStart={() => handlePlayerDragStart(playerIndex)}
              onDragOver={event => {
                event.preventDefault();
                handlePlayerDragOver(playerIndex);
              }}
              onDrop={() => handlePlayerDrop()}
              className={`setup-row ${playerDragOver === playerIndex && playerDragIdx.current !== null && playerDragIdx.current !== playerIndex ? 'setup-row-dragging' : ''}`}
            >
              <DragHandle
                index={playerIndex}
                listRef={playerListRef}
                onDragStart={handlePlayerDragStart}
                onDragOver={handlePlayerDragOver}
                onDrop={handlePlayerDrop}
              />
              <div
                className="setup-avatar setup-avatar-md"
                style={{ background: player.color || COLORS[playerIndex % COLORS.length] }}
              >
                {player.name ? player.name[0].toUpperCase() : playerIndex + 1}
              </div>
              <input
                placeholder={`Player ${playerIndex + 1}`}
                value={player.name}
                style={{ flex: 1 }}
                onChange={event => {
                  const updatedPlayers = team.players.map((currentPlayer, currentIndex) => (
                    currentIndex === playerIndex
                      ? { ...currentPlayer, name: event.target.value }
                      : currentPlayer
                  ));
                  onTeamUpdate({ ...team, players: updatedPlayers });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
