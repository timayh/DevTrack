import {
  BarChart3,
  Bug,
  Camera,
  CheckSquare,
  ChevronDown,
  Eye,
  EyeOff,
  Folder,
  Home,
  LockKeyhole,
  LogOut,
  Settings as SettingsIcon,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import '../styles/Settings.css';
import {
  changeLocalPassword,
  clearLocalSession,
  readLocalSession,
  updateLocalProfile,
} from '../utils/authStorage';
import { updateStoredBugUserName } from '../utils/bugStorage';
import { updateStoredProjectUserName } from '../utils/projectStorage';

const navigationItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Projects', icon: Folder, path: '/projects' },
  { label: 'My Tasks', icon: CheckSquare, path: '/tasks' },
  { label: 'Report', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings', active: true },
];

const getInitials = (name = 'DevTrack User') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const Settings = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readLocalSession());
  const [nickname, setNickname] = useState(session?.nickname || '');
  const [profileImage, setProfileImage] = useState(session?.profileImage || '');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const profileMenuRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const closeProfile = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
    };

    document.addEventListener('pointerdown', closeProfile);
    return () => document.removeEventListener('pointerdown', closeProfile);
  }, [profileOpen]);

  useEffect(() => {
    if (!notice) return undefined;
    const dismissTimer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(dismissTimer);
  }, [notice]);

  const handleLogout = () => {
    clearLocalSession();
    navigate('/login', { replace: true });
  };

  const handlePhotoChange = (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';

    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setNotice({ type: 'error', message: 'Choose a JPG, PNG, or WebP image.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      setNotice({ type: 'error', message: 'Profile photos must be 1 MB or smaller.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProfileImage(String(reader.result));
    reader.onerror = () => setNotice({ type: 'error', message: 'That image could not be read.' });
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();

    if (trimmedNickname && trimmedNickname.length < 2) {
      setNotice({ type: 'error', message: 'Nickname must contain at least 2 characters.' });
      return;
    }

    const result = updateLocalProfile(session.id, {
      nickname: trimmedNickname,
      profileImage,
    });

    if (!result) {
      setNotice({ type: 'error', message: 'Your local account could not be found.' });
      return;
    }

    setSession(result.session);
    setNickname(result.user.nickname);
    const displayName = result.user.nickname || result.user.fullName;
    updateStoredBugUserName(result.user.id, displayName);
    updateStoredProjectUserName(result.user.id, displayName);
    setNotice({ type: 'success', message: 'Profile updated successfully.' });
  };

  const handlePasswordChange = (field, value) => {
    setPasswords((current) => ({ ...current, [field]: value }));
    setPasswordError('');
  };

  const togglePassword = (field) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPasswordError('Complete all password fields.');
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordError('Your new password must contain at least 8 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwords.current === passwords.next) {
      setPasswordError('Choose a password different from your current password.');
      return;
    }

    const result = await changeLocalPassword(session.id, passwords.current, passwords.next);

    if (!result.ok) {
      setPasswordError(result.reason === 'incorrect-password'
        ? 'Your current password is incorrect.'
        : 'Your local account could not be found.');
      return;
    }

    setPasswords({ current: '', next: '', confirm: '' });
    setNotice({ type: 'success', message: 'Password changed successfully.' });
  };

  const displayName = session?.nickname || session?.fullName;

  return (
    <div className="dashboard-page settings-page">
      <aside className="dashboard-sidebar">
        <button className="dashboard-brand" type="button" onClick={() => navigate('/')}>
          <span className="dashboard-brand-mark" aria-hidden="true"><Bug /></span>
          <span>Dev<span>Track</span></span>
        </button>

        <nav className="dashboard-navigation" aria-label="Application navigation">
          {navigationItems.map(({ label, icon: Icon, active, path }) => (
            <button
              className={active ? 'is-active' : ''}
              type="button"
              key={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => !active && navigate(path)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <span className="sidebar-ring" aria-hidden="true">✳</span>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar settings-topbar">
          <span className="settings-topbar-label">Account preferences</span>
          <div className="dashboard-account">
            <div className="account-menu-wrap" ref={profileMenuRef}>
              <button
                className="account-button"
                type="button"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="account-avatar">
                  {session?.profileImage
                    ? <img src={session.profileImage} alt="" />
                    : getInitials(displayName)}
                </span>
                <span className="account-name">{displayName}</span>
                <ChevronDown aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="account-dropdown">
                  <span>{session?.email}</span>
                  <button type="button" onClick={handleLogout}><LogOut /> Log Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && (
          <div className={`dashboard-notice settings-notice is-${notice.type}`} role="status" aria-live="polite">
            <span>{notice.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        <main className="settings-content">
          <header className="settings-heading">
            <span>ACCOUNT SETTINGS</span>
            <h1>Make DevTrack feel like yours.</h1>
            <p>Update how your profile appears and keep your local account secure.</p>
          </header>

          <div className="settings-grid">
            <section className="settings-card" aria-labelledby="profile-settings-title">
              <div className="settings-card-heading">
                <span><UserRound aria-hidden="true" /></span>
                <div>
                  <h2 id="profile-settings-title">Profile</h2>
                  <p>Choose your photo and display nickname.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit}>
                <div className="profile-photo-row">
                  <div className="profile-photo-preview">
                    {profileImage
                      ? <img src={profileImage} alt="Profile preview" />
                      : <span>{getInitials(nickname || session?.fullName)}</span>}
                  </div>
                  <div className="profile-photo-actions">
                    <strong>Profile photo</strong>
                    <small>JPG, PNG, or WebP. Maximum 1 MB.</small>
                    <div>
                      <button type="button" onClick={() => photoInputRef.current?.click()}>
                        <Camera aria-hidden="true" /> {profileImage ? 'Change photo' : 'Upload photo'}
                      </button>
                      {profileImage && (
                        <button className="remove-photo-button" type="button" onClick={() => setProfileImage('')}>
                          <Trash2 aria-hidden="true" /> Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={photoInputRef}
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Upload profile photo"
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>

                <label className="settings-field">
                  <span>Nickname</span>
                  <input
                    type="text"
                    value={nickname}
                    maxLength="30"
                    placeholder={session?.fullName}
                    onChange={(event) => setNickname(event.target.value)}
                  />
                  <small>Leave this blank to display your full name.</small>
                </label>

                <div className="settings-account-details">
                  <label>
                    <span>Full name</span>
                    <input type="text" value={session?.fullName || ''} readOnly />
                  </label>
                  <label>
                    <span>Email address</span>
                    <input type="email" value={session?.email || ''} readOnly />
                  </label>
                </div>

                <div className="settings-form-footer">
                  <button className="settings-primary-button" type="submit">Save profile</button>
                </div>
              </form>
            </section>

            <section className="settings-card" aria-labelledby="password-settings-title">
              <div className="settings-card-heading">
                <span><LockKeyhole aria-hidden="true" /></span>
                <div>
                  <h2 id="password-settings-title">Password</h2>
                  <p>Use at least 8 characters for your new password.</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                {[
                  { field: 'current', label: 'Current password', autoComplete: 'current-password' },
                  { field: 'next', label: 'New password', autoComplete: 'new-password' },
                  { field: 'confirm', label: 'Confirm new password', autoComplete: 'new-password' },
                ].map(({ field, label, autoComplete }) => (
                  <label className="settings-field password-settings-field" key={field}>
                    <span>{label}</span>
                    <span className="settings-password-input">
                      <input
                        type={visiblePasswords[field] ? 'text' : 'password'}
                        value={passwords[field]}
                        autoComplete={autoComplete}
                        onChange={(event) => handlePasswordChange(field, event.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={`${visiblePasswords[field] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                        onClick={() => togglePassword(field)}
                      >
                        {visiblePasswords[field] ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </button>
                    </span>
                  </label>
                ))}

                {passwordError && <p className="settings-form-error" role="alert">{passwordError}</p>}

                <div className="settings-form-footer">
                  <button className="settings-primary-button" type="submit">Change password</button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
