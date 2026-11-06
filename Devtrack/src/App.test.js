import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { hashPassword, SESSION_STORAGE_KEY, USERS_STORAGE_KEY } from './utils/authStorage';
import { NOTIFICATIONS_STORAGE_KEY } from './utils/notificationStorage';
import { PROJECTS_STORAGE_KEY } from './utils/projectStorage';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo.mockClear();
});

test('renders the DevTrack landing page', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /track your bugs.*ship with confidence/i })
  ).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
});

test('renders the sign up page at the signup route', () => {
  window.history.pushState({}, '', '/signup');
  render(<App />);
  expect(screen.getByRole('heading', { name: /create your devtrack account/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
});

test('can show and hide the sign up password', () => {
  window.history.pushState({}, '', '/signup');
  render(<App />);
  const passwordInput = screen.getByLabelText(/^password$/i);

  fireEvent.click(screen.getByRole('button', { name: /^show password$/i }));
  expect(passwordInput).toHaveAttribute('type', 'text');
  fireEvent.click(screen.getByRole('button', { name: /^hide password$/i }));
  expect(passwordInput).toHaveAttribute('type', 'password');
});

test('shows an invitation link field when joining a team', () => {
  window.history.pushState({}, '', '/signup');
  render(<App />);

  expect(screen.queryByLabelText(/invitation link/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/join a team/i));
  expect(screen.getByLabelText(/invitation link/i)).toBeInTheDocument();
  expect(screen.getByText(/invitation links are not verified yet/i)).toBeInTheDocument();
});

test('saves a valid account locally without storing the plain password', async () => {
  window.history.pushState({}, '', '/signup');
  render(<App />);

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument();
  });

  const [savedUser] = JSON.parse(localStorage.getItem('devtrack_users'));
  const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
  expect(savedUser.email).toBe('jane@example.com');
  expect(savedUser.passwordHash).not.toBe('password123');
  expect(session.email).toBe('jane@example.com');
});

test('renders the login page with a bottom sign up link', () => {
  window.history.pushState({}, '', '/login');
  render(<App />);

  expect(screen.getByRole('heading', { name: /log in to your devtrack account/i })).toBeInTheDocument();
  const signUpLinks = screen.getAllByRole('link', { name: /sign up/i });
  expect(signUpLinks[signUpLinks.length - 1]).toHaveAttribute('href', '/signup');
});

test('can show and hide the login password', () => {
  window.history.pushState({}, '', '/login');
  render(<App />);
  const passwordInput = screen.getByLabelText(/^password$/i);

  fireEvent.click(screen.getByRole('button', { name: /^show password$/i }));
  expect(passwordInput).toHaveAttribute('type', 'text');
  fireEvent.click(screen.getByRole('button', { name: /^hide password$/i }));
  expect(passwordInput).toHaveAttribute('type', 'password');
});

test('logs in a stored account and saves a local session', async () => {
  const passwordHash = await hashPassword('password123');
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([{
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash,
    usage: 'create-project',
  }]));

  window.history.pushState({}, '', '/login');
  render(<App />);
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /^log in$/i }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument();
  });

  const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
  expect(session.email).toBe('jane@example.com');
  expect(session.passwordHash).toBeUndefined();
});

test('redirects unauthenticated dashboard visitors to login', async () => {
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /log in to your devtrack account/i })).toBeInTheDocument();
  });
});

test('renders the dashboard for an authenticated local session', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument();
  expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /dashboard navigation/i })).toBeInTheDocument();
  expect(screen.queryByText('BUG-1042')).not.toBeInTheDocument();
  expect(screen.getByText(/no active sprint/i)).toBeInTheDocument();
  expect(screen.getByText(/no upcoming deadlines/i)).toBeInTheDocument();
  expect(screen.getByText(/no tasks assigned to you/i)).toBeInTheDocument();
  expect(screen.getAllByText(/^0$/)).toHaveLength(4);

  fireEvent.click(screen.getByRole('button', { name: /view notifications/i }));
  expect(screen.getByRole('heading', { name: /^notifications$/i })).toBeInTheDocument();
  expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mark all as read/i })).toBeDisabled();
});

test('creates and stores a project from the dashboard modal', async () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /new project/i }));
  expect(screen.getByRole('dialog', { name: /create project/i })).toBeInTheDocument();
  expect(screen.queryByLabelText(/priority/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /project type: software development/i }));
  const projectTypeOptions = screen.getByRole('listbox', { name: /project type/i })
    .querySelectorAll('[role="option"]');
  expect(projectTypeOptions).toHaveLength(5);
  projectTypeOptions.forEach((option) => expect(option.querySelector('svg')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('option', { name: /api service/i }));

  fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'Capstone Tracker' } });
  fireEvent.change(screen.getByLabelText(/project key/i), { target: { value: 'cap' } });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'University capstone project tracker' },
  });
  fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2027-05-01' } });
  fireEvent.click(screen.getByRole('button', { name: /^create project$/i }));

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /create project/i })).not.toBeInTheDocument();
  });
  expect(screen.getByRole('status')).toHaveTextContent(/capstone tracker was created successfully/i);
  const createdProjectName = screen.getAllByText('Capstone Tracker')
    .find((element) => element.classList.contains('project-name'));
  expect(createdProjectName).toBeInTheDocument();
  expect(createdProjectName.querySelector('.lucide-server-cog')).toBeInTheDocument();

  const [project] = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY));
  expect(project.key).toBe('CAP');
  expect(project.ownerId).toBe('test-user');
  expect(project.type).toBe('api-service');
  expect(project.priority).toBeUndefined();
  expect(project.progress).toBe(0);
});

test('opens the full notifications page from the dashboard dropdown', async () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /view notifications/i }));
  fireEvent.click(screen.getByRole('button', { name: /view all notifications/i }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /notification center/i })).toBeInTheDocument();
  });
  expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /application navigation/i })).toBeInTheDocument();
});

test('shows stored notifications and marks them all as read', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([{
    id: 'notification-1',
    userId: 'test-user',
    category: 'project',
    message: 'A project was updated',
    detail: 'Capstone Tracker has new activity.',
    read: false,
    createdAt: '2026-11-06T10:00:00.000Z',
  }]));
  window.history.pushState({}, '', '/notifications');
  render(<App />);

  expect(screen.getByText('A project was updated')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

  const [storedNotification] = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY));
  expect(storedNotification.read).toBe(true);
  expect(screen.getByText('A project was updated').closest('article')).not.toHaveClass('is-unread');
});
