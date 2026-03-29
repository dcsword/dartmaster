const GUEST_IDS_KEY = 'dm_guest_ids';
const GUEST_NAMES_KEY = 'dm_guest_map';
const GUEST_TOKENS_KEY = 'dm_guest_tokens';
const GAME_ACCESS_KEY = 'dm_game_access_tokens';
const CURRENT_GUEST_ID_KEY = 'dm_current_guest_id';
const MAX_STORED_GUESTS = 20;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function capObjectEntries(obj, keysToKeep = []) {
  const next = { ...obj };
  const allKeys = Object.keys(next);
  if (allKeys.length <= MAX_STORED_GUESTS) return next;

  const removable = allKeys.filter(key => !keysToKeep.includes(key));
  const overflow = allKeys.length - MAX_STORED_GUESTS;
  removable.slice(0, overflow).forEach(key => delete next[key]);
  return next;
}

export const GuestSessionStore = {
  getGuestIds() {
    return readJson(GUEST_IDS_KEY, []);
  },

  addGuestId(guestId) {
    const ids = this.getGuestIds();
    if (ids.includes(guestId)) return ids;
    const nextIds = [...ids, guestId].slice(-MAX_STORED_GUESTS);
    writeJson(GUEST_IDS_KEY, nextIds);
    return nextIds;
  },

  rememberGuestName(name, guestId) {
    const normalizedName = name.trim().toLowerCase();
    const names = readJson(GUEST_NAMES_KEY, {});
    names[normalizedName] = guestId;
    writeJson(GUEST_NAMES_KEY, capObjectEntries(names, [normalizedName]));
  },

  saveGuestSession(guestId, token) {
    this.addGuestId(guestId);
    if (!token) return;
    const tokens = readJson(GUEST_TOKENS_KEY, {});
    tokens[guestId] = token;
    writeJson(GUEST_TOKENS_KEY, capObjectEntries(tokens, [guestId]));
  },

  getGuestToken(guestId) {
    const tokens = readJson(GUEST_TOKENS_KEY, {});
    return tokens[guestId] || null;
  },

  setCurrentGuestId(guestId) {
    if (!guestId) return;
    this.addGuestId(guestId);
    localStorage.setItem(CURRENT_GUEST_ID_KEY, guestId);
  },

  getCurrentGuestId() {
    const currentGuestId = localStorage.getItem(CURRENT_GUEST_ID_KEY);
    if (currentGuestId) return currentGuestId;

    const guestIds = this.getGuestIds();
    return guestIds.length === 1 ? guestIds[0] : null;
  },

  saveGameAccessToken(gameId, token) {
    if (!token) return;
    const accessTokens = readJson(GAME_ACCESS_KEY, {});
    accessTokens[gameId] = token;
    writeJson(GAME_ACCESS_KEY, capObjectEntries(accessTokens, [gameId]));
  },

  getGameAccessToken(gameId) {
    const accessTokens = readJson(GAME_ACCESS_KEY, {});
    return accessTokens[gameId] || null;
  },
};
