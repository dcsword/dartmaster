export default function JoinRoomForm({
  user,
  code,
  loading,
  error,
  scanning,
  onCodeChange,
  onJoin,
  onLogin,
  onStartScanner,
  onStopScanner,
  onBack,
}) {
  return (
    <div className="join-room-page">
      <button onClick={onBack} className="join-room-back">← Back</button>

      <h1 className="join-room-title">JOIN ROOM</h1>
      <p className="join-room-copy">Enter the code or scan the QR shown by the host</p>

      {!user && (
        <div className="join-room-warning">
          You must be <span className="join-room-link" onClick={onLogin}>signed in</span> to join a room
        </div>
      )}

      <div className="join-room-input-wrap">
        <input
          placeholder="Enter 6-character code (e.g. A3K7PX)"
          value={code}
          maxLength={6}
          onChange={event => onCodeChange(event.target.value.toUpperCase())}
          onKeyDown={event => event.key === 'Enter' && onJoin()}
          className="join-room-code-input"
        />
      </div>

      {error && <p className="join-room-error">{error}</p>}

      <button className="btn-primary join-room-primary" onClick={() => onJoin()} disabled={loading || !user}>
        {loading ? 'Joining...' : 'Join Room'}
      </button>

      <div className="join-room-divider">
        <div className="join-room-divider-line" />
        <span className="join-room-divider-copy">or</span>
        <div className="join-room-divider-line" />
      </div>

      {!scanning ? (
        <button className="btn-ghost join-room-scan-button" onClick={onStartScanner} disabled={!user}>
          📷 Scan QR Code
        </button>
      ) : (
        <div>
          <div id="qr-reader" className="join-room-scanner" />
          <button className="btn-ghost" onClick={onStopScanner}>Cancel scan</button>
        </div>
      )}
    </div>
  );
}
