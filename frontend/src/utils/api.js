const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('dm_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),

  // Players
  searchPlayers: (q) => request('GET', `/players/search?q=${encodeURIComponent(q)}`),
  getPlayer: (id) => request('GET', `/players/${id}`),
  getPlayerGames: (id) => request('GET', `/players/${id}/games`),
  updateProfile: (body) => request('PATCH', '/players/me', body),

  // Games
  createGame: (body) => request('POST', '/games', body),
  getGame: (id) => request('GET', `/games/${id}`),
  submitTurn: (gameId, body) => request('POST', `/games/${gameId}/turn`, body),
  getHistory: (limit = 20, userIds = []) => {
    const params = new URLSearchParams({ limit });
    if (userIds.length > 0) params.set('userIds', userIds.join(','));
    return request('GET', `/games?${params.toString()}`);
  },
  getCheckout: (gameId, score, ruleset) =>
    request('GET', `/games/${gameId}/checkout?score=${score}&ruleset=${ruleset}`),
  getGameDetail: (id) => request('GET', `/games/${id}/detail`),

  // Stats
  getStats: (userId, range = 'all') => request('GET', `/stats/${userId}?range=${range}`),
  getH2H: (player1, player2) => request('GET', `/stats/h2h/compare?player1=${player1}&player2=${player2}`),
  createRoom: () => request('POST', '/rooms'),
  joinRoom: (code) => request('POST', '/rooms/join', { code }),
  getRoom: (code) => request('GET', `/rooms/${code}`),
  closeRoom: (code) => request('DELETE', `/rooms/${code}`),
};
