import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/GetStarted.css';

const GetStarted = () => {
  return (
    <section className="get-started section-rings" id="signup">
      <span className="ring-decoration ring-left" aria-hidden="true">✳</span>
      <span className="ring-decoration ring-right" aria-hidden="true">✳</span>

      <div className="container get-started-content">
        <p className="section-label">Ready to get started?</p>
        <h2>Start tracking <em>smarter</em><br /> today.</h2>
        <p>Join DevTrack and turn your bugs into progress.</p>
        <Link className="button button-wide" to="/signup">
          Get Started <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
};

export default GetStarted;
