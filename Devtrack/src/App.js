import './App.css';
import GetStarted from './components/GetStarted';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import LandingFooter from './components/LandingFooter';
import LandingNavbar from './components/LandingNavbar';

const App = () => {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <Hero />
        <HowItWorks />
        <GetStarted />
      </main>
      <LandingFooter />
    </div>
  );
};

export default App;
