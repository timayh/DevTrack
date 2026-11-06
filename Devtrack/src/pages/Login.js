import { ArrowRight, Bug, Code2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Login.css';
import { hashPassword, readStoredUsers, saveLocalSession } from '../utils/authStorage';

const initialForm = {
  email: '',
  password: '',
};

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus('');
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Please enter your password.';
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
      const normalizedEmail = form.email.trim().toLowerCase();
      const passwordHash = await hashPassword(form.password);
      const user = readStoredUsers().find(
        (storedUser) => storedUser.email === normalizedEmail && storedUser.passwordHash === passwordHash
      );

      if (!user) {
        setErrors({ email: 'Email or password is incorrect.', password: ' ' });
        setStatus('We could not find an account with those credentials.');
        return;
      }

      saveLocalSession(user);
      navigate('/dashboard', { replace: true });
    } catch {
      setStatus('Your login could not be completed locally. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showOAuthNotice = (provider) => {
    setStatus(`${provider} login will be available when authentication is connected.`);
  };

  const showPasswordNotice = () => {
    setStatus('Password recovery will be available when email authentication is connected.');
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <Link className="login-brand" to="/" aria-label="Return to DevTrack home">
          <span className="login-brand-mark" aria-hidden="true">
            <Bug size={34} strokeWidth={2} />
          </span>
          <span>Dev<span>Track</span></span>
        </Link>

        <div className="login-signup-prompt">
          <span>Don’t have an account?</span>
          <Link className="login-signup-button" to="/signup">Sign Up</Link>
        </div>
      </header>

      <span className="login-ring login-ring-left" aria-hidden="true">✳</span>
      <span className="login-ring login-ring-right" aria-hidden="true">✳</span>

      <main className="login-main">
        <div className="login-heading">
          <p>Welcome back</p>
          <h1>Log in to your<br /><em>DevTrack</em> account.</h1>
          <span>Pick up right where you left off.</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="loginEmail">Email address</label>
            <div className={`login-input ${errors.email ? 'has-error' : ''}`}>
              <Mail aria-hidden="true" />
              <input
                id="loginEmail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField}
                aria-describedby={errors.email ? 'loginEmail-error' : undefined}
              />
            </div>
            {errors.email && <span className="login-field-error" id="loginEmail-error">{errors.email}</span>}
          </div>

          <div className="login-field">
            <div className="password-label-row">
              <label htmlFor="loginPassword">Password</label>
              <button type="button" onClick={showPasswordNotice}>Forgot password?</button>
            </div>
            <div className={`login-input ${errors.password ? 'has-error' : ''}`}>
              <LockKeyhole aria-hidden="true" />
              <input
                id="loginPassword"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={updateField}
                aria-describedby={errors.password ? 'loginPassword-error' : undefined}
              />
              <button
                className="login-password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {errors.password?.trim() && (
              <span className="login-field-error" id="loginPassword-error">{errors.password}</span>
            )}
          </div>

          <button className="login-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging In…' : 'Log In'}
            {!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}
          </button>

          {status && (
            <p className={status.startsWith('Welcome back') ? 'login-status is-success' : 'login-status'} role="status">
              {status}
            </p>
          )}

          <div className="login-divider"><span>or</span></div>

          <div className="login-social-buttons">
            <button type="button" onClick={() => showOAuthNotice('Google')}>
              <span className="login-google-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
            <button type="button" onClick={() => showOAuthNotice('GitHub')}>
              <Code2 className="login-github-mark" aria-hidden="true" />
              Continue with Github
            </button>
          </div>

          <p className="login-bottom-prompt">
            Don’t have an account? <Link to="/signup">Sign Up.</Link>
          </p>
        </form>
      </main>
    </div>
  );
};

export default Login;
