import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { RANGES } from '../constants/statsOptions';
import { useStatsState } from '../hooks/useStatsState';
import StatsHeader from '../components/stats/StatsHeader';
import StatsSummaryGrid from '../components/stats/StatsSummaryGrid';
import H2HSection from '../components/stats/H2HSection';
import '../styles/stats.css';

export default function Stats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const statsState = useStatsState(user);

  if (!statsState.userId) {
    return (
      <Layout>
        <div className="page with-nav">
          <h1 className="stats-title stats-title-spaced">STATS</h1>
          <div className="card stats-empty-signin">
            <div className="stats-empty-icon">📊</div>
            <p className="stats-empty-copy">Sign in to see your stats</p>
            <button className="btn-primary stats-signin-button" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page with-nav">
        <StatsHeader user={user} onProfileClick={() => navigate(`/player/${user.id}`)} />

        <div className="stats-range-tabs">
          {RANGES.map(rangeOption => (
            <button
              key={rangeOption.value}
              onClick={() => statsState.setRange(rangeOption.value)}
              className={`stats-range-button ${statsState.range === rangeOption.value ? 'stats-range-button-active' : ''}`}
            >
              {rangeOption.label}
            </button>
          ))}
        </div>

        {statsState.loading && (
          <div className="stats-skeleton-list">
            {[1, 2].map(index => <div key={index} className="stats-skeleton-card" />)}
          </div>
        )}

        {statsState.stats && !statsState.loading && (
          <>
            <StatsSummaryGrid stats={statsState.stats} />

            {statsState.stats.totalGames === 0 && (
              <div className="card stats-empty-card">
                <p className="stats-empty-copy">
                  No finished games {statsState.range !== 'all' ? `in the last ${statsState.range === '30d' ? '30 days' : '7 days'}` : 'yet'}
                </p>
                <button className="btn-ghost stats-play-button" onClick={() => navigate('/setup')}>Play Now</button>
              </div>
            )}

            {user && (
              <H2HSection
                query={statsState.query}
                results={statsState.results}
                selected={statsState.selected}
                h2h={statsState.h2h}
                loading={statsState.h2hLoading}
                onSearch={statsState.handleSearch}
                onSelect={statsState.handleSelect}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
