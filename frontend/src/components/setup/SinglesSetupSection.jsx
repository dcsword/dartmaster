import PlayerRow from './PlayerRow';
import RoomPanel from './RoomPanel';

export default function SinglesSetupSection({
  user,
  room,
  roomLoading,
  players,
  setPlayers,
  playerListRef,
  playerDragIdx,
  playerDragOver,
  onCreateRoom,
  onCloseRoom,
  onPlayerDragStart,
  onPlayerDragOver,
  onPlayerDrop,
  onAddPlayer,
}) {
  return (
    <div className="setup-section">
      <div className="setup-section-header">
        <p className="label-xs">PLAYERS (max 4)</p>
        {user && !room && (
          <button onClick={onCreateRoom} disabled={roomLoading} className="setup-outline-button">
            {roomLoading ? '...' : '🔗 Create room'}
          </button>
        )}
      </div>

      <p className="setup-muted-copy setup-section-help">⠿ Drag to reorder · Player 1 throws first</p>

      {room && (
        <RoomPanel room={room} onClose={onCloseRoom} players={players} setPlayers={setPlayers} />
      )}

      <div ref={playerListRef} className="setup-stack">
        {players.map((player, index) => (
          <PlayerRow
            key={index}
            player={player}
            index={index}
            total={players.length}
            listRef={playerListRef}
            onUpdate={updated => setPlayers(prev => prev.map((currentPlayer, currentIndex) => (
              currentIndex === index ? updated : currentPlayer
            )))}
            onRemove={() => setPlayers(prev => prev.filter((_, currentIndex) => currentIndex !== index))}
            onDragStart={onPlayerDragStart}
            onDragOver={onPlayerDragOver}
            onDrop={onPlayerDrop}
            isDragging={playerDragOver === index && playerDragIdx.current !== null && playerDragIdx.current !== index}
          />
        ))}
      </div>

      {players.length < 4 && (
        <button className="btn-ghost setup-top-gap-md" onClick={onAddPlayer}>
          + Add Player
        </button>
      )}
    </div>
  );
}
