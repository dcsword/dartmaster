import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { code: codeFromUrl } = useParams();
  const { user } = useAuth();

  const [code, setCode] = useState(codeFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [joined, setJoined] = useState(null);
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);

  // Auto-join if code came from URL (QR scan)
  useEffect(() => {
    if (codeFromUrl) handleJoin(codeFromUrl);
  }, []);

  async function handleJoin(codeOverride) {
    const joinCode = (codeOverride || code).toUpperCase().trim();
    if (!joinCode || joinCode.length < 6) {
      setError('Enter a valid 6-character code');
      return;
    }
    if (!user) {
      setError('You must be signed in to join a room');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await api.joinRoom(joinCode);

      // Save joining user's ID to localStorage so their history is trackable on this device
      const stored = JSON.parse(localStorage.getItem('dm_guest_ids') || '[]');
      if (room.joiningUserId && !stored.includes(room.joiningUserId)) {
        stored.push(room.joiningUserId);
        localStorage.setItem('dm_guest_ids', JSON.stringify(stored));
      }

      setJoined(room);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    setScanning(true);
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerInstance.current = new Html5Qrcode('qr-reader');
      await scannerInstance.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          // Extract code from URL or plain text
          const match = decodedText.match(/\/join\/([A-Z0-9]{6})/i);
          const extractedCode = match ? match[1].toUpperCase() : decodedText.toUpperCase().trim();
          await stopScanner();
          setCode(extractedCode);
          handleJoin(extractedCode);
        },
        () => {} // ignore scan errors
      );
    } catch (err) {
      setError('Could not access camera');
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerInstance.current) {
      try { await scannerInstance.current.stop(); } catch {}
      scannerInstance.current = null;
    }
    setScanning(false);
  }

  if (joined) {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontSize: '36px', color: 'var(--accent)', marginBottom: '8px' }}>Joined!</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
          You joined <strong style={{ color: 'var(--text)' }}>{joined.members.find(m => m.id === joined.host_id)?.name}'s</strong> room
        </p>

        <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '12px' }}>PLAYERS IN ROOM</p>
          {joined.members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: m.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {m.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{m.name}</span>
              {m.id === joined.host_id && <span style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: 'auto' }}>host</span>}
            </div>
          ))}
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
          Wait for the host to start the game
        </p>
        <button className="btn-ghost" onClick={() => navigate('/')}>Back to home</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ← Back
      </button>

      <h1 style={{ fontSize: '42px', color: 'var(--accent)', marginBottom: '8px' }}>JOIN ROOM</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>Enter the code or scan the QR shown by the host</p>

      {!user && (
        <div style={{ background: 'rgba(232,89,60,0.1)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--accent)' }}>
          You must be <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/login')}>signed in</span> to join a room
        </div>
      )}

      {/* Code input */}
      <div style={{ marginBottom: '16px' }}>
        <input
          placeholder="Enter 6-character code (e.g. A3K7PX)"
          value={code}
          maxLength={6}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          style={{ textAlign: 'center', fontSize: '22px', fontFamily: 'Barlow Condensed', letterSpacing: '0.2em' }}
        />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>}

      <button className="btn-primary" onClick={() => handleJoin()} disabled={loading || !user} style={{ marginBottom: '12px' }}>
        {loading ? 'Joining...' : 'Join Room'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* QR Scanner */}
      {!scanning ? (
        <button className="btn-ghost" onClick={startScanner} disabled={!user} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📷 Scan QR Code
        </button>
      ) : (
        <div>
          <div id="qr-reader" style={{ borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '12px' }}></div>
          <button className="btn-ghost" onClick={stopScanner}>Cancel scan</button>
        </div>
      )}

      <script src="https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js"></script>
    </div>
  );
}
