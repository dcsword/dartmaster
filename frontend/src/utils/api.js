const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('dm_token');
}

// Lazy ref to AuthContext's refreshAccessToken — set by AuthProvider
let _refreshFn = null;
export function setRefreshFn(fn) { _refreshFn = fn; }

async function request(method, path, body, isRetry = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  // Auto-refresh on expired token (once)
  if (!res.ok && data.code === 'TOKEN_EXPIRED' && !isRetry && _refreshFn) {
    const newToken = await _refreshFn();
    if (newToken) return request(method, path, body, true); // retry once with new token
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register:    (body)           => request('POST', '/auth/register', body),
  login:       (body)           => request('POST', '/auth/login', body),
  googleLogin: (idToken)        => request('POST', '/auth/google', { idToken }),
  refresh:     (refreshToken)   => request('POST', '/auth/refresh', { refreshToken }),
  logout:      (refreshToken)   => request('POST', '/auth/logout', { refreshToken }),
  deleteAccount: ()               => request('DELETE', '/auth/account'),

  // Players
  searchPlayers: (q)    => request('GET', `/players/search?q=${encodeURIComponent(q)}`),
  getPlayer:     (id)   => request('GET', `/players/${id}`),
  getPlayerGames:(id)   => request('GET', `/players/${id}/games`),
  updateProfile: (body) => request('PATCH', '/players/me', body),

  // Games
  createGame:  (body)               => request('POST', '/games', body),
  getGame:     (id)                 => request('GET', `/games/${id}`),
  submitTurn:  (gameId, body)       => request('POST', `/games/${gameId}/turn`, body),
  getHistory:  (limit = 20, userIds = []) => {
    const params = new URLSearchParams({ limit });
    if (userIds.length > 0) params.set('userIds', userIds.join(','));
    return request('GET', `/games?${params.toString()}`);
  },
  getCheckout: (gameId, score, ruleset) =>
    request('GET', `/games/${gameId}/checkout?score=${score}&ruleset=${ruleset}`),
  getGameDetail: (id) => request('GET', `/games/${id}/detail`),

  // Stats
  getStats: (userId, range = 'all') => request('GET', `/stats/${userId}?range=${range}`),
  getH2H:   (p1, p2)               => request('GET', `/stats/h2h/compare?player1=${p1}&player2=${p2}`),

  // Rooms
  createRoom: ()     => request('POST', '/rooms'),
  joinRoom:   (code) => request('POST', '/rooms/join', { code }),
  getRoom:    (code) => request('GET', `/rooms/${code}`),
  closeRoom:  (code) => request('DELETE', `/rooms/${code}`),
};
