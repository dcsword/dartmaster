import { GuestSessionStore } from './guestSessions';

function getParticipantIds(game) {
  if (!game) return [];
  if (game.mode === 'singles') return (game.players || []).map(player => player.id);
  return (game.teams || []).flatMap(team => (team.players || []).map(player => player.id));
}

export const GameAccess = {
  rememberGameParticipants(gameId, participantIds) {
    const participantToken = participantIds
      .map(participantId => GuestSessionStore.getGuestToken(participantId))
      .find(Boolean);

    if (participantToken) {
      GuestSessionStore.saveGameAccessToken(gameId, participantToken);
    }
  },

  rememberGameFromState(game) {
    if (!game?.id) return;
    this.rememberGameParticipants(game.id, getParticipantIds(game));
  },

  getViewToken(gameId) {
    return GuestSessionStore.getGameAccessToken(gameId);
  },

  getCurrentTurnToken(game, currentPlayer) {
    if (!currentPlayer?.id) return null;
    return GuestSessionStore.getGuestToken(currentPlayer.id) || null;
  },
};
