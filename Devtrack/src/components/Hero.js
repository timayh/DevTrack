import {
  ArrowRight,
  Bug,
  Check,
  ClipboardCheck,
  FileWarning,
  ShieldCheck,
} from 'lucide-react';

const Hero = () => {
  const benefits = [
    'Organize bug reports in one place',
    'Collaborate with your team',
    'Track issues from report to resolution',
  ];

  return (
    <section className="hero" id="top">
      <div className="hero-blob hero-blob-one" aria-hidden="true" />
      <div className="hero-blob hero-blob-two" aria-hidden="true" />
      <div className="hero-blob hero-blob-three" aria-hidden="true" />

      <div className="hero-layout container">
        <div className="hero-copy">
          <p className="eyebrow">Built by developers, for developers</p>
          <h1>
            Track your bugs.<br />
            Ship with <em>confidence.</em>
          </h1>
          <p className="hero-description">
            DevTrack helps project managers, developers and QA testers report issues,
            assign tasks, track progress and resolve bugs in one organized workspace.
          </p>

          <div className="hero-actions">
            <a className="button" href="#signup">Sign Up <ArrowRight size={18} /></a>
            <a className="button button-secondary" href="#how-it-works">Learn More</a>
          </div>

          <ul className="benefit-list" aria-label="DevTrack benefits">
            {benefits.map((benefit) => (
              <li key={benefit}>
                <span><Check size={20} strokeWidth={3} /></span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-visual" aria-label="DevTrack workflow illustration">
          <div className="orbit orbit-outer" aria-hidden="true" />
          <div className="orbit orbit-inner" aria-hidden="true" />
          <span className="spark spark-top" aria-hidden="true">✳</span>

          <article className="visual-card visual-card-report">
            <FileWarning size={51} strokeWidth={1.8} />
            <span>Report bugs</span>
          </article>
          <article className="visual-card visual-card-track">
            <ClipboardCheck size={51} strokeWidth={1.8} />
            <span>Track progress</span>
          </article>
          <article className="visual-card visual-card-fix">
            <div className="fix-icon">
              <Bug size={53} strokeWidth={1.5} />
              <ShieldCheck size={31} strokeWidth={2} />
            </div>
            <span>Fix with confidence</span>
          </article>
          <p className="visual-caption">A smarter way to manage software bugs.</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
