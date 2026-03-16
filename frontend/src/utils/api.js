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

  // Games
  createGame: (body) => request('POST', '/games', body),
  getGame: (id) => request('GET', `/games/${id}`),
  submitTurn: (gameId, body) => request('POST', `/games/${gameId}/turn`, body),
  getHistory: (limit = 20) => request('GET', `/games?limit=${limit}`),
  getCheckout: (gameId, score, ruleset) =>
    request('GET', `/games/${gameId}/checkout?score=${score}&ruleset=${ruleset}`),
};
