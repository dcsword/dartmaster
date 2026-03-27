import { useNavigate, useParams } from 'react-router-dom';
import { GameDartSlots } from '../components/game/GameDartSlots';
import { GameInputPanel } from '../components/game/GameInputPanel';
import { GameLegResult } from '../components/game/GameLegResult';
import { GameMatchBar } from '../components/game/GameMatchBar';
import { GamePhoneOpponents, GameScoreboard } from '../components/game/GameScoreboard';
import { useGameState } from '../hooks/useGameState';
import '../styles/game.css';

function CheckoutPill({ checkout, compact = false }) {
  if (!checkout) return null;

  return (
    <div className={`checkout-pill ${compact ? '' : 'game-checkout-pill'}`}>
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)' }} />
      <span style={{ fontSize: compact ? '10px' : '13px', color: 'var(--green)', fontWeight: 600 }}>
        {checkout.join(compact ? '→' : ' → ')}
      </span>
    </div>
  );
}

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const gameState = useGameState(id);

  if (gameState.loading) return <div className="page-loading">Loading game...</div>;
  if (!gameState.game) return <div className="page-error">{gameState.error || 'Game not found'}</div>;

  const { game, currentPlayer, currentTeam, currentScore, checkout, darts, legResult } = gameState;

  if (legResult) {
    return <GameLegResult legResult={legResult} onContinue={gameState.dismissLegResult} />;
  }

  const inputPanel = (
    <GameInputPanel
      multiplier={gameState.multiplier}
      setMultiplier={gameState.setMultiplier}
      darts={darts}
      remaining={currentScore}
      error={gameState.error}
      submitting={gameState.submitting}
      onAddDart={gameState.addDart}
      onBust={gameState.handleBust}
      onSubmit={gameState.submitTurn}
    />
  );

  const dartSlots = (
    <GameDartSlots darts={darts} onUndo={gameState.undoDart} />
  );

  return (
    <>
      <div className="game-phone-only game-phone-shell">
        <GameMatchBar game={game} onQuit={() => navigate('/')} />

        <div className="game-phone-header">
          <div className="game-avatar game-avatar--md" style={{ background: currentPlayer?.avatar_color || 'var(--accent)' }}>
            {(currentPlayer?.name || '?')[0].toUpperCase()}
          </div>
          <div className="game-phone-header__body">
            <div className="game-phone-header__name">{currentTeam ? `${currentTeam.name} · ` : ''}{currentPlayer?.name}</div>
            <div className="game-phone-header__meta">DART {darts.length + 1} OF 3</div>
          </div>
          {checkout && darts.length === 0 && <CheckoutPill checkout={checkout} compact />}
        </div>

        <div className="game-phone-score">
          <div className="game-score-hero game-score-hero--phone" style={{ color: 'var(--accent)' }}>{currentScore}</div>
          <div className="label-xs" style={{ marginTop: '3px' }}>remaining</div>
        </div>

        <div className="game-phone-opponents">
          <GamePhoneOpponents
            game={game}
            currentPlayerIdx={gameState.currentPlayerIdx}
            currentTeamIdx={gameState.currentTeamIdx}
          />
        </div>

        <div className="game-phone-darts">{dartSlots}</div>
        <div className="game-phone-input">{inputPanel}</div>
      </div>

      <div className="game-landscape-only game-landscape-shell">
        <GameMatchBar game={game} onQuit={() => navigate('/')} />
        <div className="game-landscape-content">
          <div className="game-landscape-score">
            <div className="game-landscape-player">
              <div className="game-avatar game-avatar--lg" style={{ background: currentPlayer?.avatar_color || 'var(--accent)' }}>
                {(currentPlayer?.name || '?')[0].toUpperCase()}
              </div>
              <div className="game-landscape-player__body">
                <div className="game-landscape-player__name">{currentTeam ? `${currentTeam.name} · ` : ''}{currentPlayer?.name}</div>
                <div className="game-landscape-player__meta">DART {darts.length + 1} OF 3</div>
              </div>
              {checkout && darts.length === 0 && <CheckoutPill checkout={checkout} />}
            </div>

            <div className="game-score-hero game-score-hero--tablet" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
              {currentScore}
            </div>
            <div className="label-xs" style={{ marginBottom: '14px' }}>remaining</div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <GameScoreboard
                game={game}
                currentPlayerIdx={gameState.currentPlayerIdx}
                currentTeamIdx={gameState.currentTeamIdx}
                remaining={currentScore}
              />
            </div>

            <div style={{ marginTop: '12px' }}>{dartSlots}</div>
          </div>

          <div className="game-landscape-input">
            <div className="label-xs" style={{ marginBottom: '10px' }}>Score entry</div>
            {inputPanel}
          </div>
        </div>
      </div>

      <div className="game-desktop-col game-desktop-shell">
        <div className="game-col-left">
          <GameMatchBar game={game} onQuit={() => navigate('/')} />
          <div style={{ padding: '16px 0' }}>
            <GameScoreboard
              game={game}
              currentPlayerIdx={gameState.currentPlayerIdx}
              currentTeamIdx={gameState.currentTeamIdx}
              remaining={currentScore}
            />
          </div>
          <div style={{ marginTop: 'auto' }}>{dartSlots}</div>
        </div>

        <div className="game-col-center">
          <div className="game-score-hero game-score-hero--desktop" style={{ color: 'var(--accent)' }}>
            {currentScore}
          </div>
          <div className="label-xs" style={{ marginTop: '12px' }}>
            remaining · {currentTeam ? `${currentTeam.name} · ` : ''}{currentPlayer?.name}
          </div>
          {checkout && darts.length === 0 && <CheckoutPill checkout={checkout} />}
          <div style={{ marginTop: '24px' }}>{dartSlots}</div>
        </div>

        <div className="game-col-right">
          <div className="label-xs" style={{ marginBottom: '12px' }}>Score entry</div>
          {inputPanel}
        </div>
      </div>
    </>
  );
}
