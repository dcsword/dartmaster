import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJoinRoomState } from '../hooks/useJoinRoomState';
import JoinRoomForm from '../components/joinroom/JoinRoomForm';
import JoinedRoomView from '../components/joinroom/JoinedRoomView';
import '../styles/join-room.css';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { code: codeFromUrl } = useParams();
  const { user } = useAuth();
  const joinRoomState = useJoinRoomState(codeFromUrl, user);

  if (joinRoomState.joined) {
    return <JoinedRoomView joined={joinRoomState.joined} onBackHome={() => navigate('/')} />;
  }

  return (
    <JoinRoomForm
      user={user}
      code={joinRoomState.code}
      loading={joinRoomState.loading}
      error={joinRoomState.error}
      scanning={joinRoomState.scanning}
      onCodeChange={joinRoomState.setCode}
      onJoin={joinRoomState.handleJoin}
      onLogin={() => navigate('/login')}
      onStartScanner={joinRoomState.startScanner}
      onStopScanner={joinRoomState.stopScanner}
      onBack={() => navigate('/')}
    />
  );
}
