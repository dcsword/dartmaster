import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COUNTRIES = [
  '', 'Turkey', 'Netherlands', 'United Kingdom', 'Germany', 'France', 'Spain',
  'Italy', 'United States', 'Canada', 'Australia', 'Belgium', 'Sweden',
  'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal', 'Other'
];

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const isOwn = user?.id === id;

  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({});

  useEffect(() => {
    Promise.all([api.getPlayer(id), api.getPlayerGames(id)])
      .then(([p, g]) => {
        setPlayer(p);
        setGames(g);
        setForm({
          name: p.name || '',
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          username: p.username || '',
          bio: p.bio || '',
          country: p.country || '',
          city: p.city || '',
          preferred_hand: p.preferred_hand || '',
          birthday: p.birthday ? p.birthday.split('T')[0] : '',
          avatar_color: p.avatar_color || '#e8593c',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await api.updateProfile(form);
      setPlayer(prev => ({ ...prev, ...updated }));
      // Update auth context so name/username reflects everywhere
      if (isOwn) {
        const stored = JSON.parse(localStorage.getItem('dm_user') || '{}');
        const newUser = { ...stored, ...updated };
        localStorage.setItem('dm_user', JSON.stringify(newUser));
        login(newUser, localStorage.getItem('dm_token'));
      }
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>Loading...</div>;
  if (!player) return <div style={{ padding: '24px' }}>Player not found</div>;

  const displayName = player.name;
  const fullName = [player.first_name, player.last_name].filter(Boolean).join(' ');

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>← Back</button>

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: player.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {displayName[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '32px', color: 'var(--text)', lineHeight: 1 }}>{displayName}</h1>
          {player.username && <p style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '2px' }}>@{player.username}</p>}
          {fullName && <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>{fullName}</p>}
          {player.bio && <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>"{player.bio}"</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            {player.country && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>📍 {player.city ? `${player.city}, ` : ''}{player.country}</span>}
            {player.preferred_hand && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>🎯 {player.preferred_hand === 'left' ? 'Left handed' : 'Right handed'}</span>}
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Member since {new Date(player.created_at).getFullYear()}</span>
          </div>
        </div>
        {isOwn && (
          <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', color: 'var(--muted)', fontSize: '13px', flexShrink: 0 }}>
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: 'var(--accent)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '4px' }}>EDIT PROFILE</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>First name</p>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" />
            </div>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Last name</p>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" />
            </div>
          </div>

          <div>
            <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Display name (shown on scoreboard)</p>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Display name" />
          </div>

          <div>
            <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Username</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '15px' }}>@</span>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="username" style={{ paddingLeft: '28px' }} />
            </div>
          </div>

          <div>
            <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Bio (max 160 chars)</p>
            <input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 160) }))} placeholder="Playing darts since 2018..." />
            <p style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '3px', textAlign: 'right' }}>{form.bio.length}/160</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Country</p>
              <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c || 'Select country'}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>City</p>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Birthday</p>
              <input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
            </div>
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>Throwing hand</p>
              <select value={form.preferred_hand} onChange={e => setForm(f => ({ ...f, preferred_hand: e.target.value }))}>
                <option value="">Select</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </div>
          </div>

          <div>
            <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '8px' }}>Avatar color</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['#e8593c', '#2dcb75', '#4a9eff', '#f0a050', '#b060e0', '#40c0b0', '#e0b040', '#e04060'].map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.avatar_color === c ? '3px solid var(--text)' : '3px solid transparent', transition: 'border 0.15s' }} />
              ))}
            </div>
          </div>

          {saveError && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>{saveError}</p>}

          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'GAMES', value: player.games_played || 0 },
          { label: 'WINS', value: player.games_won || 0 },
          { label: 'WIN %', value: `${player.win_rate || 0}%` },
          { label: 'AVG / DART', value: player.avg_per_dart || 0 },
          { label: 'BEST CHECKOUT', value: player.highest_checkout || '—' },
          { label: 'BEST GAME', value: player.best_game_darts ? `${player.best_game_darts} darts` : '—' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '6px' }}>{s.label}</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '24px', color: 'var(--text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent games */}
      <h2 style={{ fontSize: '24px', color: 'var(--accent)', marginBottom: '12px' }}>RECENT GAMES</h2>
      {games.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No finished games yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {games.slice(0, 10).map(g => (
          <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }} onClick={() => navigate(`/game/${g.id}/detail`)}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px' }}>{g.won ? '🏆' : '·'}</span>
              <span style={{ fontSize: '13px', color: g.won ? 'var(--green)' : 'var(--muted)' }}>{g.won ? 'Win' : 'Loss'}</span>
              <span className="tag" style={{ fontSize: '11px', padding: '2px 8px' }}>{g.ruleset.replace(/_/g, ' ')}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(g.finished_at).toLocaleDateString('en-GB')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
