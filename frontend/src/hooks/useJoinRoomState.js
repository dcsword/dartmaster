import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

function rememberJoinedUserId(joiningUserId) {
  if (!joiningUserId) return;
  try {
    const stored = JSON.parse(localStorage.getItem('dm_guest_ids') || '[]');
    if (!stored.includes(joiningUserId)) {
      stored.push(joiningUserId);
      localStorage.setItem('dm_guest_ids', JSON.stringify(stored.slice(-20)));
    }
  } catch (err) {
    console.warn('Could not remember joined user id:', err.message);
  }
}

export function useJoinRoomState(codeFromUrl, user) {
  const [code, setCode] = useState(codeFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [joined, setJoined] = useState(null);
  const scannerInstance = useRef(null);

  async function stopScanner() {
    if (scannerInstance.current) {
      try {
        await scannerInstance.current.stop();
      } catch (err) {
        console.warn('QR scanner stop failed:', err.message);
      }
      scannerInstance.current = null;
    }
    setScanning(false);
  }

  async function handleJoin(codeOverride) {
    const joinCode = (codeOverride || code).toUpperCase().trim();
    if (!joinCode || joinCode.length < 6) {
      setError('Enter a valid 6-character code');
      return;
    }

    if (!user) {
      setError('You must be signed in to join a room');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const room = await api.joinRoom(joinCode);
      rememberJoinedUserId(room.joiningUserId);
      setJoined(room);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    setScanning(true);
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerInstance.current = new Html5Qrcode('qr-reader');
      await scannerInstance.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async decodedText => {
          const match = decodedText.match(/\/join\/([A-Z0-9]{6})/i);
          const extractedCode = match ? match[1].toUpperCase() : decodedText.toUpperCase().trim();
          await stopScanner();
          setCode(extractedCode);
          handleJoin(extractedCode);
        },
        () => {}
      );
    } catch (err) {
      setError('Could not access camera');
      setScanning(false);
    }
  }

  useEffect(() => {
    if (codeFromUrl) handleJoin(codeFromUrl);
  }, [codeFromUrl]);

  return {
    code,
    loading,
    error,
    scanning,
    joined,
    setCode,
    handleJoin,
    startScanner,
    stopScanner,
  };
}
