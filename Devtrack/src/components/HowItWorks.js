import { Bug, ClipboardList, FileWarning, Users } from 'lucide-react';
import '../styles/HowItWorks.css';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Report Issues',
      description: 'Easily submit and categorize bugs with all the details your team needs.',
      icon: <FileWarning />,
      color: 'green',
    },
    {
      number: '02',
      title: 'Track Progress',
      description: 'Follow updates, assign tasks, and keep everything organized in one place.',
      icon: <ClipboardList />,
      color: 'burgundy',
    },
    {
      number: '03',
      title: 'Work Together',
      description: 'Collaborate with your team and resolve issues faster, together.',
      icon: <Users />,
      color: 'yellow',
    },
  ];

  return (
    <section className="how-it-works section-rings" id="how-it-works">
      <span className="ring-decoration ring-left" aria-hidden="true"><Bug /></span>
      <span className="ring-decoration ring-right" aria-hidden="true">✳</span>

      <div className="container">
        <div className="section-heading">
          <p className="section-label">How it works</p>
          <h2>From bugs to progress,<br />in <em>three simple steps.</em></h2>
          <p>DevTrack makes bug tracking simple, organized and efficient<br className="desktop-break" /> so you can focus on building, not chasing issues.</p>
        </div>

        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <div className={`step-icon step-icon-${step.color}`} aria-hidden="true">
                {step.icon}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
