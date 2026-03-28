import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, getAccessToken } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileEditForm from '../components/profile/ProfileEditForm';
import ProfileStatsGrid from '../components/profile/ProfileStatsGrid';
import ProfileRecentGames from '../components/profile/ProfileRecentGames';
import DeleteAccountPanel from '../components/profile/DeleteAccountPanel';
import '../styles/profile.css';

function createProfileForm(player) {
  return {
    name: player.name || '',
    first_name: player.first_name || '',
    last_name: player.last_name || '',
    username: player.username || '',
    bio: player.bio || '',
    country: player.country || '',
    city: player.city || '',
    preferred_hand: player.preferred_hand || '',
    birthday: player.birthday ? player.birthday.split('T')[0] : '',
    avatar_color: player.avatar_color || '#e8293c',
    theme_color: player.theme_color || '#e8293c',
  };
}

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login, logout, applyTheme } = useAuth();
  const isOwn = user?.id === id;

  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    Promise.all([api.getPlayer(id), api.getPlayerGames(id)])
      .then(([nextPlayer, nextGames]) => {
        setPlayer(nextPlayer);
        setGames(nextGames);
        setForm(createProfileForm(nextPlayer));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaveError('');

    try {
      const updated = await api.updateProfile(form);
      setPlayer(prev => ({ ...prev, ...updated }));

      if (isOwn) {
        const storedUser = JSON.parse(localStorage.getItem('dm_user') || '{}');
        const nextUser = { ...storedUser, ...updated };
        localStorage.setItem('dm_user', JSON.stringify(nextUser));
        login(nextUser, getAccessToken());
        if (updated.theme_color) applyTheme(updated.theme_color);
      }

      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteAccount();
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!player) return <div className="page-error">Player not found</div>;

  return (
    <Layout>
      <div className="page with-nav">
        <ProfileHeader
          player={player}
          isOwn={isOwn}
          isEditing={editing}
          onToggleEdit={() => setEditing(!editing)}
        />

        {editing && (
          <ProfileEditForm
            form={form}
            setForm={setForm}
            saveError={saveError}
            saving={saving}
            onSave={handleSave}
            applyTheme={applyTheme}
          />
        )}

        <ProfileStatsGrid player={player} />
        <ProfileRecentGames games={games} onSelectGame={gameId => navigate(`/game/${gameId}/detail`)} />

        {isOwn && (
          <DeleteAccountPanel
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            deleteInput={deleteInput}
            setDeleteInput={setDeleteInput}
            deleteError={deleteError}
            deleting={deleting}
            onDelete={handleDeleteAccount}
          />
        )}

        {isOwn && (
          <div className="sidebar-hidden-only profile-mobile-signout">
            <button onClick={() => { logout(); navigate('/'); }}>Sign out</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
