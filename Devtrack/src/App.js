import './styles/global.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import GetStarted from './components/GetStarted';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import LandingFooter from './components/LandingFooter';
import LandingNavbar from './components/LandingNavbar';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import MyTasks from './pages/MyTasks';
import Notifications from './pages/Notifications';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SignUp from './pages/SignUp';
import { readLocalSession } from './utils/authStorage';

const LandingPage = () => {
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

const ProtectedRoute = ({ children }) => {
  return readLocalSession() ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/tasks"
          element={(
            <ProtectedRoute>
              <MyTasks />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/reports"
          element={(
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/projects"
          element={(
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/projects/:projectId"
          element={(
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
