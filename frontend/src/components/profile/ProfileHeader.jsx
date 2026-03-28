export default function ProfileHeader({ player, isOwn, isEditing, onToggleEdit }) {
  const avatarColor = player.avatar_color || 'var(--accent)';
  const fullName = [player.first_name, player.last_name].filter(Boolean).join(' ');

  return (
    <div className="profile-section">
      <div className="profile-header-row">
        <div className="profile-avatar-large" style={{ background: avatarColor }}>
          {player.name[0].toUpperCase()}
        </div>
        <div className="profile-header-copy">
          <h1 className="profile-title">{player.name}</h1>
          {player.username && <div className="profile-accent-copy">@{player.username}</div>}
          {fullName && <div className="profile-muted-copy">{fullName}</div>}
          {player.bio && <div className="profile-bio">"{player.bio}"</div>}
          <div className="profile-meta-row">
            {player.country && (
              <span className="profile-muted-chip">
                📍 {player.city ? `${player.city}, ` : ''}{player.country}
              </span>
            )}
            {player.preferred_hand && (
              <span className="profile-muted-chip">
                🎯 {player.preferred_hand === 'left' ? 'Left' : 'Right'} handed
              </span>
            )}
          </div>
        </div>

        {isOwn && (
          <button
            onClick={onToggleEdit}
            className={`profile-edit-button ${isEditing ? 'profile-edit-button-active' : ''}`}
          >
            {isEditing ? 'Cancel' : '✏️ Edit'}
          </button>
        )}
      </div>
    </div>
  );
}
