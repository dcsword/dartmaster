export default function DeleteAccountPanel({
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteInput,
  setDeleteInput,
  deleteError,
  deleting,
  onDelete,
}) {
  return (
    <div className="profile-delete-section">
      {!showDeleteConfirm ? (
        <div className="profile-delete-row">
          <div>
            <div className="profile-delete-title">Delete account</div>
            <div className="profile-delete-copy">Permanently removes your account and all data</div>
          </div>
          <button onClick={() => setShowDeleteConfirm(true)} className="profile-delete-trigger">
            Delete
          </button>
        </div>
      ) : (
        <div className="profile-delete-card">
          <div className="profile-delete-warning">⚠️ This cannot be undone</div>
          <p className="profile-delete-copy profile-delete-body">
            Your account, game history, and stats will be permanently deleted. Type <strong style={{ color: 'var(--text)' }}>DELETE</strong> to confirm.
          </p>
          <input
            placeholder="Type DELETE to confirm"
            value={deleteInput}
            onChange={event => setDeleteInput(event.target.value)}
            style={{ borderColor: 'rgba(255,77,77,0.3)' }}
          />
          {deleteError && <p className="profile-error">{deleteError}</p>}
          <div className="profile-delete-actions">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteInput('');
              }}
              className="btn-ghost"
              style={{ flex: 1, fontSize: '13px' }}
            >
              Cancel
            </button>
            <button onClick={onDelete} disabled={deleting} className="profile-delete-submit">
              {deleting ? 'Deleting...' : 'Delete my account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
