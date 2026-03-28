import { AVATAR_COLORS, COUNTRIES, THEME_OPTIONS } from '../../constants/profileOptions';

export default function ProfileEditForm({
  form,
  setForm,
  saveError,
  saving,
  onSave,
  applyTheme,
}) {
  return (
    <div className="card profile-edit-card">
      <div className="label-xs profile-edit-title">Edit Profile</div>

      <div className="profile-grid">
        <div>
          <div className="label-xs profile-field-label">First name</div>
          <input value={form.first_name} onChange={event => setForm(current => ({ ...current, first_name: event.target.value }))} placeholder="First name" />
        </div>
        <div>
          <div className="label-xs profile-field-label">Last name</div>
          <input value={form.last_name} onChange={event => setForm(current => ({ ...current, last_name: event.target.value }))} placeholder="Last name" />
        </div>
      </div>

      <div>
        <div className="label-xs profile-field-label">Display name</div>
        <input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Display name" />
      </div>

      <div>
        <div className="label-xs profile-field-label">Username</div>
        <div className="profile-username-wrap">
          <span className="profile-username-prefix">@</span>
          <input
            value={form.username}
            onChange={event => setForm(current => ({ ...current, username: event.target.value.replace(/\s/g, '').toLowerCase() }))}
            placeholder="username"
            style={{ paddingLeft: '28px' }}
          />
        </div>
      </div>

      <div>
        <div className="label-xs profile-field-label">Bio (max 160)</div>
        <input
          value={form.bio}
          onChange={event => setForm(current => ({ ...current, bio: event.target.value.slice(0, 160) }))}
          placeholder="Playing darts since 2018..."
        />
        <div className="profile-counter">{form.bio.length}/160</div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="label-xs profile-field-label">Country</div>
          <select value={form.country} onChange={event => setForm(current => ({ ...current, country: event.target.value }))}>
            {COUNTRIES.map(country => <option key={country} value={country}>{country || 'Select'}</option>)}
          </select>
        </div>
        <div>
          <div className="label-xs profile-field-label">City</div>
          <input value={form.city} onChange={event => setForm(current => ({ ...current, city: event.target.value }))} placeholder="City" />
        </div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="label-xs profile-field-label">Birthday</div>
          <input type="date" value={form.birthday} onChange={event => setForm(current => ({ ...current, birthday: event.target.value }))} />
        </div>
        <div>
          <div className="label-xs profile-field-label">Throwing hand</div>
          <select value={form.preferred_hand} onChange={event => setForm(current => ({ ...current, preferred_hand: event.target.value }))}>
            <option value="">Select</option>
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
        </div>
      </div>

      <div>
        <div className="label-xs profile-field-label profile-spacing-sm">Avatar color</div>
        <div className="profile-color-row">
          {AVATAR_COLORS.map(color => (
            <div
              key={color}
              onClick={() => setForm(current => ({ ...current, avatar_color: color }))}
              className={`profile-color-swatch ${form.avatar_color === color ? 'profile-color-swatch-active' : ''}`}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>

      <div className="profile-theme-section">
        <div className="label-xs profile-field-label">App theme color</div>
        <p className="profile-muted-copy profile-spacing-sm">Changes the accent color throughout the entire app for you</p>
        <div className="profile-theme-row">
          {THEME_OPTIONS.map(theme => (
            <div
              key={theme.color}
              onClick={() => {
                setForm(current => ({ ...current, theme_color: theme.color }));
                applyTheme(theme.color);
              }}
              className="profile-theme-option"
            >
              <div
                className={`profile-theme-swatch ${form.theme_color === theme.color ? 'profile-theme-swatch-active' : ''}`}
                style={{ background: theme.color }}
              >
                {form.theme_color === theme.color && <div className="profile-theme-swatch-dot" />}
              </div>
              <div className={`profile-theme-label ${form.theme_color === theme.color ? 'profile-theme-label-active' : ''}`}>
                {theme.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {saveError && <div className="profile-error">{saveError}</div>}
      <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
    </div>
  );
}
