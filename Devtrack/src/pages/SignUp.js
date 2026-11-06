import {
  ArrowRight,
  Bug,
  Code2,
  Eye,
  EyeOff,
  Folder,
  Link2,
  LockKeyhole,
  Mail,
  User,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/SignUp.css';
import {
  createUserId,
  hashPassword,
  readStoredUsers,
  saveLocalSession,
  saveStoredUsers,
} from '../utils/authStorage';

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  usage: 'create-project',
  invitationLink: '',
};

const SignUp = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus('');
  };

  const validateForm = () => {
    const nextErrors = {};

    if (form.fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (form.password.length < 8) {
      nextErrors.password = 'Password must contain at least 8 characters.';
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus('Please correct the highlighted fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const storedUsers = readStoredUsers();
      const normalizedEmail = form.email.trim().toLowerCase();
      const emailExists = storedUsers.some((user) => user.email === normalizedEmail);

      if (emailExists) {
        setErrors({ email: 'An account with this email already exists.' });
        setStatus('Please use another email or log in.');
        return;
      }

      const passwordHash = await hashPassword(form.password);
      const newUser = {
        id: createUserId(),
        fullName: form.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        usage: form.usage,
        invitationLink: form.usage === 'join-team' ? form.invitationLink.trim() : null,
        createdAt: new Date().toISOString(),
      };

      saveStoredUsers([...storedUsers, newUser]);
      saveLocalSession(newUser);
      navigate('/dashboard', { replace: true });
    } catch {
      setStatus('Your account could not be saved locally. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showOAuthNotice = (provider) => {
    setStatus(`${provider} sign up will be available when authentication is connected.`);
  };

  return (
    <div className="signup-page">
      <header className="signup-header">
        <Link className="signup-brand" to="/" aria-label="Return to DevTrack home">
          <span className="signup-brand-mark" aria-hidden="true">
            <Bug size={34} strokeWidth={2} />
          </span>
          <span>Dev<span>Track</span></span>
        </Link>

        <div className="signup-login-prompt">
          <span>Already have an account?</span>
          <Link className="signup-login-button" to="/login">Log In</Link>
        </div>
      </header>

      <span className="signup-ring signup-ring-left" aria-hidden="true">✳</span>
      <span className="signup-ring signup-ring-right" aria-hidden="true">✳</span>

      <main className="signup-main">
        <div className="signup-heading">
          <p>Get started</p>
          <h1>Create your<br /><em>DevTrack</em> account.</h1>
          <span>Start tracking smarter with your team.</span>
        </div>

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="signup-field">
            <label htmlFor="fullName">Full name</label>
            <div className={`signup-input ${errors.fullName ? 'has-error' : ''}`}>
              <User aria-hidden="true" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={form.fullName}
                onChange={updateField}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              />
            </div>
            {errors.fullName && <span className="field-error" id="fullName-error">{errors.fullName}</span>}
          </div>

          <div className="signup-field">
            <label htmlFor="email">Email address</label>
            <div className={`signup-input ${errors.email ? 'has-error' : ''}`}>
              <Mail aria-hidden="true" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && <span className="field-error" id="email-error">{errors.email}</span>}
          </div>

          <div className="signup-field">
            <label htmlFor="password">Password</label>
            <div className={`signup-input ${errors.password ? 'has-error' : ''}`}>
              <LockKeyhole aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={updateField}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                className="signup-password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <span className="field-error" id="password-error">{errors.password}</span>}
          </div>

          <div className="signup-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className={`signup-input ${errors.confirmPassword ? 'has-error' : ''}`}>
              <LockKeyhole aria-hidden="true" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={updateField}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              <button
                className="signup-password-toggle"
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                aria-pressed={showConfirmPassword}
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="field-error" id="confirmPassword-error">{errors.confirmPassword}</span>
            )}
          </div>

          <fieldset className="usage-fieldset">
            <legend>How will you use DevTrack?</legend>
            <div className="usage-options">
              <label className={form.usage === 'create-project' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="usage"
                  value="create-project"
                  checked={form.usage === 'create-project'}
                  onChange={updateField}
                />
                <Folder aria-hidden="true" />
                <span><strong>Create a Project</strong><small>I’m starting a new project</small></span>
                <i aria-hidden="true" />
              </label>

              <label className={form.usage === 'join-team' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="usage"
                  value="join-team"
                  checked={form.usage === 'join-team'}
                  onChange={updateField}
                />
                <Users aria-hidden="true" />
                <span><strong>Join a Team</strong><small>I’ve been invited to a team</small></span>
                <i aria-hidden="true" />
              </label>
            </div>

            {form.usage === 'join-team' && (
              <div className="invitation-field">
                <label htmlFor="invitationLink">Invitation link</label>
                <div className="signup-input">
                  <Link2 aria-hidden="true" />
                  <input
                    id="invitationLink"
                    name="invitationLink"
                    type="url"
                    inputMode="url"
                    placeholder="Paste your team invitation link"
                    value={form.invitationLink}
                    onChange={updateField}
                    aria-describedby="invitation-note"
                  />
                </div>
                <p className="invitation-note" id="invitation-note">
                  Invitation links are not verified yet. This will be connected later.
                </p>
              </div>
            )}
          </fieldset>

          <button className="create-account-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
            {!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}
          </button>

          {status && (
            <p className={status.startsWith('Your DevTrack') ? 'form-status is-success' : 'form-status'} role="status">
              {status}
            </p>
          )}

          <div className="signup-divider"><span>or</span></div>

          <div className="social-buttons">
            <button type="button" onClick={() => showOAuthNotice('Google')}>
              <span className="google-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
            <button type="button" onClick={() => showOAuthNotice('GitHub')}>
              <Code2 className="github-mark" aria-hidden="true" />
              Continue with Github
            </button>
          </div>

          <p className="mobile-login-prompt">Already have an account? <Link to="/login">Log In.</Link></p>
        </form>
      </main>
    </div>
  );
};

export default SignUp;
