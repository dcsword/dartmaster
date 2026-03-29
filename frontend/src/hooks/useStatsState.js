import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { GuestSessionStore } from '../utils/guestSessions';

function readGuestUserId() {
  try {
    return GuestSessionStore.getCurrentGuestId();
  } catch (err) {
    console.warn('Could not read guest stats identity:', err.message);
    return null;
  }
}

export function useStatsState(user) {
  const userId = user?.id || readGuestUserId();
  const [range, setRange] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const searchTimer = useRef(null);

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
  }, [range, userId]);

  function handleSearch(value) {
    setQuery(value);
    setSelected(null);
    setH2h(null);
    clearTimeout(searchTimer.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const response = await api.searchPlayers(value.trim());
        setResults(response.filter(player => player.id !== userId));
      } catch (err) {
        console.warn('Player search failed:', err.message);
        setResults([]);
      }
    }, 300);
  }

  async function handleSelect(player) {
    setSelected(player);
    setResults([]);
    setQuery(player.name);
    setH2hLoading(true);

    try {
      const data = await api.getH2H(userId, player.id);
      setH2h(data);
    } catch (err) {
      console.warn('Head-to-head lookup failed:', err.message);
      setH2h(null);
    } finally {
      setH2hLoading(false);
    }
  }

  return {
    userId,
    range,
    stats,
    loading,
    query,
    results,
    selected,
    h2h,
    h2hLoading,
    setRange,
    handleSearch,
    handleSelect,
  };
}
