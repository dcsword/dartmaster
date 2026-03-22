import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';


const AVATAR_COLORS = ['#e8293c','#2dcb75','#00d4ff','#f0a030','#b060e0','#40c0b0','#4a9eff','#e04060'];
const THEME_OPTIONS = [
  { color: '#e8293c', label: 'Red',  desc: 'Default' },
  { color: '#00d4ff', label: 'Cyan', desc: 'Electric' },
  { color: '#f0a030', label: 'Amber', desc: 'Warm' },
  { color: '#2dcb75', label: 'Green', desc: 'Fresh' },
];
const COUNTRIES = ['','Turkey','Netherlands','United Kingdom','Germany','France','Spain','Italy','United States','Canada','Australia','Belgium','Sweden','Norway','Denmark','Finland','Poland','Portugal','Other'];

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login, logout, applyTheme } = useAuth();
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
        setPlayer(p); setGames(g);
        setForm({ name: p.name || '', first_name: p.first_name || '', last_name: p.last_name || '', username: p.username || '', bio: p.bio || '', country: p.country || '', city: p.city || '', preferred_hand: p.preferred_hand || '', birthday: p.birthday ? p.birthday.split('T')[0] : '', avatar_color: p.avatar_color || '#e8293c', theme_color: p.theme_color || '#e8293c' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      const updated = await api.updateProfile(form);
      setPlayer(prev => ({ ...prev, ...updated }));
      if (isOwn) {
        const stored = JSON.parse(localStorage.getItem('dm_user') || '{}');
        const newUser = { ...stored, ...updated };
        localStorage.setItem('dm_user', JSON.stringify(newUser));
        login(newUser, localStorage.getItem('dm_token'));
        if (updated.theme_color) applyTheme(updated.theme_color);
      }
      setEditing(false);
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!player) return <div className="page-error">Player not found</div>;

  const avatarColor = player.avatar_color || 'var(--accent)';
  const fullName = [player.first_name, player.last_name].filter(Boolean).join(' ');

  return (
    <Layout>
    <div className="page with-nav">

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {player.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{player.name}</h1>
            {player.username && <div style={{ fontSize: '13px', color: 'var(--accent)', marginTop: '2px' }}>@{player.username}</div>}
            {fullName && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{fullName}</div>}
            {player.bio && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', fontStyle: 'italic' }}>"{player.bio}"</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
              {player.country && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>📍 {player.city ? `${player.city}, ` : ''}{player.country}</span>}
              {player.preferred_hand && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>🎯 {player.preferred_hand === 'left' ? 'Left' : 'Right'} handed</span>}
            </div>
          </div>
          {/* Edit button — always visible when own profile */}
          {isOwn && (
            <button onClick={() => setEditing(!editing)} style={{ flexShrink: 0, background: editing ? 'var(--accent-tint)' : 'transparent', border: `1px solid ${editing ? 'var(--accent-glow)' : 'var(--border)'}`, borderRadius: 'var(--radius-xs)', padding: '8px 12px', color: editing ? 'var(--accent)' : 'var(--muted)', fontSize: '12px' }}>
              {editing ? 'Cancel' : '✏️ Edit'}
            </button>
          )}
        </div>
        {/* Sign out — below header, mobile only (sidebar has it on tablet+) */}
        {isOwn && (
          <button
            className="sidebar-hidden-only"
            onClick={() => { logout(); navigate('/'); }}
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '10px', color: 'var(--muted)', fontSize: '13px' }}>
            Sign out
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="label-xs" style={{ color: 'var(--accent)' }}>Edit Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><div className="label-xs" style={{ marginBottom: '4px' }}>First name</div><input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="First name" /></div>
            <div><div className="label-xs" style={{ marginBottom: '4px' }}>Last name</div><input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" /></div>
          </div>
          <div><div className="label-xs" style={{ marginBottom: '4px' }}>Display name</div><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Display name" /></div>
          <div>
            <div className="label-xs" style={{ marginBottom: '4px' }}>Username</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px' }}>@</span>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="username" style={{ paddingLeft: '28px' }} />
            </div>
          </div>
          <div><div className="label-xs" style={{ marginBottom: '4px' }}>Bio (max 160)</div><input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 160) }))} placeholder="Playing darts since 2018..." /><div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', textAlign: 'right' }}>{form.bio.length}/160</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><div className="label-xs" style={{ marginBottom: '4px' }}>Country</div><select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>{COUNTRIES.map(c => <option key={c} value={c}>{c || 'Select'}</option>)}</select></div>
            <div><div className="label-xs" style={{ marginBottom: '4px' }}>City</div><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><div className="label-xs" style={{ marginBottom: '4px' }}>Birthday</div><input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} /></div>
            <div><div className="label-xs" style={{ marginBottom: '4px' }}>Throwing hand</div><select value={form.preferred_hand} onChange={e => setForm(f => ({ ...f, preferred_hand: e.target.value }))}><option value="">Select</option><option value="right">Right</option><option value="left">Left</option></select></div>
          </div>
          <div>
            <div className="label-xs" style={{ marginBottom: '8px' }}>Avatar color</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, cursor: 'pointer', border: `3px solid ${form.avatar_color === c ? 'var(--text)' : 'transparent'}`, transition: 'border 0.15s' }} />
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div className="label-xs" style={{ marginBottom: '4px' }}>App theme color</div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>Changes the accent color throughout the entire app for you</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {THEME_OPTIONS.map(t => (
                <div key={t.color} onClick={() => { setForm(f => ({ ...f, theme_color: t.color })); applyTheme(t.color); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: t.color,
                    border: `3px solid ${form.theme_color === t.color ? 'var(--text)' : 'transparent'}`,
                    transition: 'border 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {form.theme_color === t.color && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', opacity: 0.9 }} />}
                  </div>
                  <div style={{ fontSize: '10px', color: form.theme_color === t.color ? 'var(--text)' : 'var(--muted)', fontWeight: form.theme_color === t.color ? 600 : 400 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
          {saveError && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{saveError}</div>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '24px' }}>
        {[
          { label: 'GAMES', value: player.games_played || 0 },
          { label: 'WINS', value: player.games_won || 0 },
          { label: 'WIN %', value: `${player.win_rate || 0}%` },
          { label: 'AVG/DART', value: player.avg_per_dart || 0 },
          { label: 'BEST CO', value: player.highest_checkout || '—' },
          { label: 'BEST LEG', value: player.best_game_darts ? `${player.best_game_darts}d` : '—' },
        ].map(s => (
          <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
            <div className="label-xs" style={{ marginBottom: '5px' }}>{s.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '26px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent games */}
      <div className="label-xs" style={{ marginBottom: '12px' }}>Recent games</div>
      {games.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No finished games yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {games.slice(0, 10).map(g => (
          <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }} onClick={() => navigate(`/game/${g.id}/detail`)}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>{g.won ? '🏆' : '·'}</span>
              <span style={{ fontSize: '13px', color: g.won ? 'var(--green)' : 'var(--muted)', fontWeight: 500 }}>{g.won ? 'Win' : 'Loss'}</span>
              <span className="tag" style={{ fontSize: '10px', padding: '2px 8px' }}>{g.ruleset.replace(/_/g, ' ')}</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(g.finished_at).toLocaleDateString('en-GB')}</span>
          </div>
        ))}
      </div>

    </div>
    </Layout>
  );
}