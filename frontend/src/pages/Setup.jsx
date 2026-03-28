import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSetupState } from '../hooks/useSetupState';
import MatchSettingsSection from '../components/setup/MatchSettingsSection';
import SinglesSetupSection from '../components/setup/SinglesSetupSection';
import TeamsSetupSection from '../components/setup/TeamsSetupSection';
import '../styles/setup.css';

export default function Setup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const setup = useSetupState(user);

  return (
    <div className="setup-page">
      <button onClick={() => navigate('/')} className="setup-back-link">← Back</button>
      <h1 className="setup-title">NEW GAME</h1>

      <div className="setup-section">
        <p className="label-xs setup-section-title">GAME MODE</p>
        <div className="setup-mode-row">
          {['singles', 'teams'].map(mode => (
            <button
              key={mode}
              className={`tag ${setup.mode === mode ? 'active' : ''}`}
              onClick={() => setup.setMode(mode)}
            >
              {mode === 'singles' ? '👤 Singles' : '👥 Teams'}
            </button>
          ))}
        </div>
      </div>

      <MatchSettingsSection
        ruleset={setup.ruleset}
        format={setup.format}
        legsPerSet={setup.legsPerSet}
        setsPerMatch={setup.setsPerMatch}
        activePreset={setup.activePreset}
        onRulesetChange={setup.setRuleset}
        onPresetApply={setup.applyPreset}
        onFormatChange={setup.updateFormat}
        onLegsChange={setup.updateLegsPerSet}
        onSetsChange={setup.updateSetsPerMatch}
        matchSummary={setup.matchSummary}
      />

      {setup.mode === 'singles' ? (
        <SinglesSetupSection
          user={setup.user}
          room={setup.room}
          roomLoading={setup.roomLoading}
          players={setup.players}
          setPlayers={setup.setPlayers}
          playerListRef={setup.playerListRef}
          playerDragIdx={setup.playerDragIdx}
          playerDragOver={setup.playerDragOver}
          onCreateRoom={setup.handleCreateRoom}
          onCloseRoom={setup.handleCloseRoom}
          onPlayerDragStart={setup.handlePlayerDragStart}
          onPlayerDragOver={setup.handlePlayerDragOver}
          onPlayerDrop={setup.handlePlayerDrop}
          onAddPlayer={setup.addPlayer}
        />
      ) : (
        <TeamsSetupSection
          teams={setup.teams}
          setTeams={setup.setTeams}
          teamListRef={setup.teamListRef}
          teamDragIdx={setup.teamDragIdx}
          teamDragOver={setup.teamDragOver}
          onTeamDragStart={setup.handleTeamDragStart}
          onTeamDragOver={setup.handleTeamDragOver}
          onTeamDrop={setup.handleTeamDrop}
          onAddTeam={setup.addTeam}
        />
      )}

      {setup.error && <p className="setup-error">{setup.error}</p>}

      <button
        className="btn-primary setup-start-button"
        onClick={setup.handleStart}
        disabled={setup.loading}
      >
        {setup.loading ? 'STARTING...' : 'START GAME 🎯'}
      </button>
    </div>
  );
}
