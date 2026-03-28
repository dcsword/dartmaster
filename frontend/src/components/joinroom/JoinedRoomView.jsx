export default function JoinedRoomView({ joined, onBackHome }) {
  const hostName = joined.members.find(member => member.id === joined.host_id)?.name;

  return (
    <div className="join-room-page join-room-success-page">
      <div className="join-room-success-icon">✅</div>
      <h1 className="join-room-success-title">Joined!</h1>
      <p className="join-room-copy join-room-success-copy">
        You joined <strong className="join-room-host-name">{hostName}'s</strong> room
      </p>

      <div className="card join-room-members-card">
        <p className="join-room-members-label">PLAYERS IN ROOM</p>
        {joined.members.map(member => (
          <div key={member.id} className="join-room-member-row">
            <div className="join-room-member-avatar" style={{ background: member.avatar_color || 'var(--accent)' }}>
              {member.name[0].toUpperCase()}
            </div>
            <span className="join-room-member-name">{member.name}</span>
            {member.id === joined.host_id && <span className="join-room-member-host">host</span>}
          </div>
        ))}
      </div>

      <p className="join-room-success-copy">Wait for the host to start the game</p>
      <button className="btn-ghost" onClick={onBackHome}>Back to home</button>
    </div>
  );
}
