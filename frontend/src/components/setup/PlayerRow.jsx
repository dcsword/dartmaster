import DragHandle from './DragHandle';

export default function PlayerRow({
  player,
  index,
  total,
  listRef,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) {
  return (
    <div
      data-row-index={index}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={event => {
        event.preventDefault();
        onDragOver(index);
      }}
      onDrop={() => onDrop()}
      className={`setup-row ${isDragging ? 'setup-row-dragging' : ''}`}
    >
      <DragHandle
        index={index}
        listRef={listRef}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
      <div className="setup-avatar setup-avatar-lg" style={{ background: player.color }}>
        {player.name ? player.name[0].toUpperCase() : index + 1}
      </div>
      <div className="setup-input-wrap">
        <input
          placeholder={player.isOwner ? 'You' : `Player ${index + 1}`}
          value={player.name}
          readOnly={player.isOwner}
          onChange={event => onUpdate({ ...player, name: event.target.value })}
          style={{ width: '100%', background: player.isOwner ? 'var(--surface)' : undefined }}
        />
        {player.isOwner && <div className="setup-inline-badge setup-inline-badge-accent">you</div>}
        {player.userId && !player.isOwner && <div className="setup-inline-badge setup-inline-badge-success">✓</div>}
      </div>
      {!player.isOwner && total > 1 ? (
        <button onClick={onRemove} className="setup-icon-button setup-icon-button-danger">×</button>
      ) : (
        <div className="setup-icon-spacer" />
      )}
    </div>
  );
}
