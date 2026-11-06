import { ArrowRight, Bug, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingNavbar.css';

const LandingNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="landing-header">
      <nav className="landing-nav container" aria-label="Main navigation">
        <a className="brand" href="#top" onClick={closeMenu} aria-label="DevTrack home">
          <span className="brand-mark" aria-hidden="true">
            <Bug size={29} strokeWidth={2.1} />
          </span>
          <span>Dev<span>Track</span></span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>

        <div className={`nav-links ${isOpen ? 'is-open' : ''}`}>
          <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
          <a href="#top" onClick={closeMenu}>About</a>
          <Link to="/login" onClick={closeMenu}>Log In</Link>
          <Link className="button button-small" to="/signup" onClick={closeMenu}>
            Sign Up <ArrowRight size={17} />
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default LandingNavbar;
