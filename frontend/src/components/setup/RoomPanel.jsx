import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../utils/api';
import { COLORS } from '../../constants/setupOptions';

export default function RoomPanel({ room, onClose, players, setPlayers }) {
  if (!room) return null;

  const [liveRoom, setLiveRoom] = useState(room);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const pollRef = useRef(null);
  const roomCode = room.code;
  const expiresAt = room.expires_at;
  const hostId = room.host_id;

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#f0ede8', light: '#14141c' },
    }).then(setQrDataUrl).catch(console.error);

    pollRef.current = setInterval(async () => {
      try {
        const updatedRoom = await api.getRoom(room.code);
        setLiveRoom(updatedRoom);
      } catch (err) {
        console.warn('Room poll failed:', err.message);
      }
    }, 3000);

    function tick() {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    tick();
    const timerRef = setInterval(tick, 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef);
    };
  }, [joinUrl, roomCode, expiresAt]);

  function addMember(member) {
    if (players.some(player => player.userId === member.id)) return;

    const emptyIndex = players.findIndex(player => !player.name.trim() && !player.isOwner);
    if (emptyIndex >= 0) {
      setPlayers(prev => prev.map((player, index) => (
        index === emptyIndex
          ? {
              ...player,
              name: member.name,
              userId: member.id,
              color: member.avatar_color || COLORS[emptyIndex % COLORS.length],
            }
          : player
      )));
      return;
    }

    if (players.length < 4) {
      setPlayers(prev => [
        ...prev,
        {
          name: member.name,
          userId: member.id,
          color: member.avatar_color || COLORS[prev.length % COLORS.length],
          isOwner: false,
        },
      ]);
    }
  }

  return (
    <div className="card setup-room-panel">
      <div className="setup-room-header">
        <div>
          <p className="setup-subcopy" style={{ marginBottom: '4px' }}>ROOM CODE</p>
          <div className="setup-room-code">{roomCode}</div>
        </div>
        <div className="setup-room-expiry">
          <p className="setup-muted-copy" style={{ marginBottom: '2px' }}>Expires in</p>
          <p className={`setup-room-timer ${timeLeft === 'Expired' ? 'setup-room-timer-expired' : ''}`}>{timeLeft}</p>
        </div>
      </div>

      {qrDataUrl && (
        <div className="setup-room-qr">
          <img src={qrDataUrl} alt="Room QR" className="setup-room-qr-image" />
          <p className="setup-muted-copy" style={{ marginTop: '8px' }}>Friends scan this or type the code above</p>
        </div>
      )}

      <div className="setup-room-members">
        <p className="setup-subcopy">
          IN ROOM ({liveRoom?.members?.length || 0})
          {(liveRoom?.members?.length || 0) === 1 && <span className="setup-muted-copy" style={{ marginLeft: '8px' }}>· waiting for friends...</span>}
        </p>

        {(liveRoom?.members || []).map(member => {
          const alreadyAdded = players.some(player => player.userId === member.id);
          const isHost = member.id === hostId;

          return (
            <div key={member.id} className="setup-room-member">
              <div className="setup-avatar setup-avatar-md" style={{ background: member.avatar_color || 'var(--accent)' }}>
                {member.name[0].toUpperCase()}
              </div>
              <span className="setup-room-member-name">{member.name}</span>
              {isHost && <span className="setup-inline-badge setup-inline-badge-accent">host</span>}
              {!isHost && (
                alreadyAdded
                  ? <span className="setup-inline-badge setup-inline-badge-success">✓ added</span>
                  : <button onClick={() => addMember(member)} className="setup-outline-button">+ Add</button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-ghost" onClick={onClose} style={{ fontSize: '13px' }}>Close room</button>
    </div>
  );
}
