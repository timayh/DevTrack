import '../styles/LandingFooter.css';
import { Link } from 'react-router-dom';

const LandingFooter = () => {
  return (
    <footer className="landing-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <a className="footer-brand" href="#top" aria-label="DevTrack home">
              Dev<span>Track</span>
            </a>
            <p>From bugs to progress.</p>
          </div>

          <div className="footer-links">
            <div>
              <h3>Product</h3>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div>
              <h3>Company</h3>
              <a href="#top">About</a>
              <Link to="/login">Log In</Link>
            </div>
          </div>
        </div>
        <p className="copyright">© 2026 DevTrack. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default LandingFooter;
