const BASE = import.meta.env.VITE_API_URL || '/api';
let accessToken = null;

function getToken() {
  return accessToken;
}

// Lazy ref to AuthContext's refreshAccessToken — set by AuthProvider
let _refreshFn = null;
export function setRefreshFn(fn) { _refreshFn = fn; }
export function setAccessToken(token) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }

async function request(method, path, body, options = {}) {
  const { isRetry = false, authToken = null, skipAuthRefresh = false } = options;
  const headers = { 'Content-Type': 'application/json' };
  const token = authToken || getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  // Auto-refresh on expired token (once)
  const shouldAttemptRefresh = !skipAuthRefresh && !isRetry && _refreshFn && !authToken && (
    data.code === 'TOKEN_EXPIRED' || (res.status === 401 && !token)
  );
  if (!res.ok && shouldAttemptRefresh) {
    const newToken = await _refreshFn();
    if (newToken) return request(method, path, body, { ...options, isRetry: true }); // retry once with new token
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register:    (body)           => request('POST', '/auth/register', body, { skipAuthRefresh: true }),
  login:       (body)           => request('POST', '/auth/login', body, { skipAuthRefresh: true }),
  googleLogin: (idToken)        => request('POST', '/auth/google', { idToken }, { skipAuthRefresh: true }),
  refresh:     ()               => request('POST', '/auth/refresh', undefined, { skipAuthRefresh: true }),
  logout:      ()               => request('POST', '/auth/logout', undefined, { skipAuthRefresh: true }),
  deleteAccount: ()               => request('DELETE', '/auth/account'),

  // Players
  searchPlayers: (q)    => request('GET', `/players/search?q=${encodeURIComponent(q)}`),
  getPlayer:     (id)   => request('GET', `/players/${id}`),
  getPlayerGames:(id)   => request('GET', `/players/${id}/games`),
  updateProfile: (body) => request('PATCH', '/players/me', body),

  // Games
  createGame:  (body)               => request('POST', '/games', body),
  getGame:     (id, options)        => request('GET', `/games/${id}`, undefined, options),
  submitTurn:  (gameId, body, options) => request('POST', `/games/${gameId}/turn`, body, options),
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
