import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const RANGES = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '7d',  label: 'Last 7 days' },
];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card-sm" style={{ textAlign: 'center', flex: 1 }}>
      <div className="label-xs" style={{ marginBottom: '6px' }}>{label}</div>
      <div style={{
        fontFamily: 'Barlow Condensed', fontSize: '36px', fontWeight: 800, lineHeight: 1,
        color: accent ? 'var(--accent)' : 'var(--text)',
      }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

function H2HSection({ myId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef(null);

  function handleSearch(val) {
    setQuery(val);
    setSelected(null);
    setH2h(null);
    clearTimeout(searchTimer.current);
    if (val.trim().length >= 2) {
      searchTimer.current = setTimeout(async () => {
        try {
          const r = await api.searchPlayers(val.trim());
          setResults(r.filter(p => p.id !== myId));
        } catch (err) {
          console.warn('Player search failed:', err.message);
          setResults([]);
        }
      }, 300);
    } else {
      setResults([]);
    }
  }

  async function handleSelect(player) {
    setSelected(player);
    setResults([]);
    setQuery(player.name);
    setLoading(true);
    try {
      const data = await api.getH2H(myId, player.id);
      setH2h(data);
    } catch (err) {
      console.warn('Head-to-head lookup failed:', err.message);
      setH2h(null);
    }
    finally { setLoading(false); }
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <div className="label-xs" style={{ marginBottom: '12px' }}>Head to head</div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          placeholder="Search for a player..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          style={{ width: '100%' }}
        />
        {results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '4px', overflow: 'hidden' }}>
            {results.slice(0, 6).map(r => (
              <div key={r.id} onClick={() => handleSelect(r)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: r.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {r.name[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{r.name}</span>
                {r.username && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>@{r.username}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <div style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '24px' }}>Loading...</div>}

      {h2h && !loading && (
        <div>
          {h2h.totalH2H === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No head to head games found against {selected?.name}</p>
            </div>
          ) : (
            <>
              {/* H2H score */}
              <div className="card" style={{ padding: '20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Player 1 */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: h2h.player1.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 auto 6px' }}>
                      {h2h.player1.name[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{h2h.player1.name}</div>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '52px', fontWeight: 800, color: h2h.player1.wins > h2h.player2.wins ? 'var(--accent)' : 'var(--muted)', lineHeight: 1 }}>
                      {h2h.player1.wins}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>avg {h2h.player1.avgPerDart}</div>
                  </div>

                  {/* VS */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '20px', fontWeight: 700, color: 'var(--muted2)' }}>VS</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{h2h.totalH2H} games</div>
                  </div>

                  {/* Player 2 */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: h2h.player2.avatar_color || '#4a9eff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 auto 6px' }}>
                      {h2h.player2.name[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{h2h.player2.name}</div>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '52px', fontWeight: 800, color: h2h.player2.wins > h2h.player1.wins ? 'var(--accent)' : 'var(--muted)', lineHeight: 1 }}>
                      {h2h.player2.wins}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>avg {h2h.player2.avgPerDart}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Determine which user to show stats for
  const userId = user?.id || (() => {
    try {
      const ids = JSON.parse(localStorage.getItem('dm_guest_ids') || '[]');
      return ids[0] || null;
    } catch (err) {
      console.warn('Could not read guest stats identity:', err.message);
      return null;
    }
  })();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.getStats(userId, range)
      .then(setStats)
      .catch(err => {
        console.warn('Stats lookup failed:', err.message);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [userId, range]);

  if (!userId) {
    return (
      <Layout>
        <div className="page with-nav">
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '48px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9, marginBottom: '6px' }}>STATS</h1>
          <div className="card" style={{ textAlign: 'center', padding: '32px', marginTop: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
            <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '14px' }}>Sign in to see your stats</p>
            <button className="btn-primary" onClick={() => navigate('/login')} style={{ maxWidth: '200px', margin: '0 auto' }}>Sign In</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page with-nav">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '48px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9 }}>STATS</h1>
            {user && <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>@{user.username || user.name}</p>}
          </div>
          {user && (
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: user.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              onClick={() => navigate(`/player/${user.id}`)}>
              {user.name[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Range tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--bg3)', borderRadius: 'var(--radius-xs)', padding: '4px' }}>
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '6px', background: range === r.value ? 'var(--accent)' : 'transparent', color: range === r.value ? '#fff' : 'var(--muted)', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
              {r.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2].map(i => <div key={i} style={{ height: '80px', background: 'var(--bg3)', borderRadius: 'var(--radius)', opacity: 0.5 }} />)}
          </div>
        )}

        {stats && !loading && (
          <>
            {/* Win/loss row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <StatCard label="GAMES" value={stats.totalGames} />
              <StatCard label="WINS" value={stats.wins} accent />
              <StatCard label="LOSSES" value={stats.losses} />
            </div>

            {/* Second row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <StatCard label="WIN %" value={`${stats.winRate}%`} accent />
              <StatCard label="AVG / DART" value={stats.avgPerDart || '—'} sub="last 10 games" />
            </div>

            {/* Third row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <StatCard
                label="CHECKOUT %"
                value={stats.checkoutOpps > 0 ? `${stats.checkoutPercent}%` : '—'}
                sub={stats.checkoutOpps > 0 ? `${stats.checkoutHits}/${stats.checkoutOpps} attempts` : 'no data yet'}
              />
              <StatCard
                label="180s"
                value={stats.max180s || '—'}
                sub={stats.max180s > 0 ? 'maximum scores' : 'none yet'}
                accent={stats.max180s > 0}
              />
            </div>

            {/* No games message */}
            {stats.totalGames === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '24px', marginTop: '8px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>
                  No finished games {range !== 'all' ? `in the last ${range === '30d' ? '30 days' : '7 days'}` : 'yet'}
                </p>
                <button className="btn-ghost" onClick={() => navigate('/setup')} style={{ maxWidth: '160px', margin: '0 auto', fontSize: '13px' }}>Play Now</button>
              </div>
            )}

            {/* H2H section — only for registered users */}
            {user && <H2HSection myId={user.id} />}
          </>
        )}

      </div>
    </Layout>
  );
}
