import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { hashPassword, SESSION_STORAGE_KEY, USERS_STORAGE_KEY } from './utils/authStorage';
import { BUGS_STORAGE_KEY } from './utils/bugStorage';
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

test('updates the local nickname and profile photo from settings', async () => {
  const passwordHash = await hashPassword('password123');
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([{
    id: 'settings-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash,
    usage: 'create-project',
  }]));
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'settings-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  window.history.pushState({}, '', '/settings');
  render(<App />);

  expect(screen.getByRole('heading', { name: /make devtrack feel like yours/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Janie' } });
  fireEvent.change(screen.getByLabelText(/upload profile photo/i), {
    target: { files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })] },
  });

  await waitFor(() => expect(screen.getByAltText(/profile preview/i)).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/profile updated successfully/i));
  const [savedUser] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
  const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
  expect(savedUser.nickname).toBe('Janie');
  expect(savedUser.profileImage).toMatch(/^data:image\/png;base64,/);
  expect(session.nickname).toBe('Janie');
  expect(session.profileImage).toBe(savedUser.profileImage);
  expect(screen.getByText('Janie')).toBeInTheDocument();
});

test('changes the local account password from settings', async () => {
  const passwordHash = await hashPassword('password123');
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([{
    id: 'settings-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash,
    usage: 'create-project',
  }]));
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'settings-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  window.history.pushState({}, '', '/settings');
  render(<App />);

  fireEvent.change(screen.getByLabelText(/^current password$/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpassword456' } });
  fireEvent.change(screen.getByLabelText(/^confirm new password$/i), { target: { value: 'newpassword456' } });
  fireEvent.click(screen.getByRole('button', { name: /change password/i }));

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/password changed successfully/i));
  const [savedUser] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
  expect(savedUser.passwordHash).toBe(await hashPassword('newpassword456'));
  expect(savedUser.passwordHash).not.toBe(passwordHash);
  expect(screen.getByLabelText(/^current password$/i)).toHaveValue('');
});

test('opens all project and bug deadlines from the dashboard modal', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'deadline-project',
    ownerId: 'test-user',
    teamMemberIds: [],
    name: 'Deadline Project',
    key: 'DUE',
    type: 'website',
    status: 'active',
    endDate: '2027-06-30',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([{
    storageId: 'deadline-bug-1',
    id: 'DUE-001',
    projectId: 'deadline-project',
    projectName: 'Deadline Project',
    assigneeId: 'test-user',
    assigneeName: 'Jane Doe',
    title: 'First deadline bug',
    description: 'First bug deadline.',
    priority: 'High',
    status: 'Assigned',
    dueDate: '2027-06-10',
  }, {
    storageId: 'deadline-bug-2',
    id: 'DUE-002',
    projectId: 'deadline-project',
    title: 'Second deadline bug',
    description: 'Second bug deadline.',
    priority: 'Medium',
    status: 'New',
    dueDate: '2027-06-15',
  }, {
    storageId: 'deadline-bug-3',
    id: 'DUE-003',
    projectId: 'deadline-project',
    title: 'Third deadline bug',
    description: 'Third bug deadline.',
    priority: 'Low',
    status: 'In Progress',
    dueDate: '2027-06-20',
  }, {
    storageId: 'closed-deadline-bug',
    id: 'DUE-004',
    projectId: 'deadline-project',
    title: 'Closed deadline bug',
    priority: 'Low',
    status: 'Closed',
    dueDate: '2027-06-05',
  }]));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  const deadlineSection = screen.getByRole('heading', { name: /upcoming deadlines/i }).closest('section');
  expect(within(deadlineSection).getAllByRole('article')).toHaveLength(3);
  fireEvent.click(within(deadlineSection).getByRole('button', { name: /view all/i }));

  const deadlineDialog = screen.getByRole('dialog', { name: /upcoming deadlines/i });
  expect(within(deadlineDialog).getAllByRole('button', { name: /^open .* deadline/i })).toHaveLength(4);
  expect(within(deadlineDialog).queryByText('Closed deadline bug')).not.toBeInTheDocument();

  fireEvent.click(within(deadlineDialog).getByRole('button', { name: /^bugs/i }));
  expect(within(deadlineDialog).getAllByRole('button', { name: /^open bug deadline/i })).toHaveLength(3);
  expect(within(deadlineDialog).queryByRole('button', { name: /open project deadline/i })).not.toBeInTheDocument();

  fireEvent.click(within(deadlineDialog).getByRole('button', { name: /open bug deadline first deadline bug/i }));
  expect(screen.getByRole('dialog', { name: /first deadline bug/i })).toBeInTheDocument();
});

test('shows assigned bugs as dashboard tasks and opens the full my tasks page', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'project-1',
    ownerId: 'project-owner',
    leadId: 'project-owner',
    leadName: 'Project Owner',
    teamMemberIds: ['test-user'],
    name: 'Capstone Tracker',
    key: 'CAP',
    description: 'Track the capstone project.',
    type: 'software-development',
    progress: 0,
    status: 'active',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([
    {
      storageId: 'bug-assigned',
      id: 'CAP-001',
      projectId: 'project-1',
      projectKey: 'CAP',
      projectName: 'Capstone Tracker',
      reporterId: 'project-owner',
      reporterName: 'Project Owner',
      assigneeId: 'test-user',
      assigneeName: 'Jane Doe',
      title: 'Fix mobile navigation',
      description: 'The navigation overlaps the page on mobile.',
      priority: 'High',
      status: 'Assigned',
      dueDate: '2027-05-01',
      createdAt: '2026-11-07T10:00:00.000Z',
      updatedAt: '2026-11-07T10:00:00.000Z',
    },
    {
      storageId: 'bug-other-user',
      id: 'CAP-002',
      projectId: 'project-1',
      assigneeId: 'another-user',
      assigneeName: 'Another User',
      title: 'Unrelated assigned bug',
      description: 'This belongs to another user.',
      priority: 'Low',
      status: 'New',
      createdAt: '2026-11-07T11:00:00.000Z',
      updatedAt: '2026-11-07T11:00:00.000Z',
    },
  ]));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  const assignedTasksSection = screen.getByRole('heading', { name: /my assigned tasks/i }).closest('section');
  expect(within(assignedTasksSection).getByText('Fix mobile navigation')).toBeInTheDocument();
  expect(within(assignedTasksSection).queryByText('Unrelated assigned bug')).not.toBeInTheDocument();

  fireEvent.click(within(assignedTasksSection).getByRole('button', { name: /view all/i }));
  expect(screen.getByRole('heading', { name: /^my tasks$/i })).toBeInTheDocument();
  expect(screen.getByText('Fix mobile navigation')).toBeInTheDocument();
  expect(screen.queryByText('Unrelated assigned bug')).not.toBeInTheDocument();
  expect(screen.getByText('Capstone Tracker')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /open assigned task cap-001/i }));
  const taskDetails = screen.getByRole('dialog', { name: /fix mobile navigation/i });
  expect(taskDetails).toHaveTextContent('The navigation overlaps the page on mobile.');
  expect(within(taskDetails).getByRole('button', { name: /bug controls/i })).toBeInTheDocument();
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

  const activeProjectLink = screen.getByRole('link', { name: /open project capstone tracker/i });
  expect(activeProjectLink).toHaveAttribute('href', `/projects/${project.id}`);
  fireEvent.click(activeProjectLink);
  expect(screen.getByRole('heading', { name: 'Capstone Tracker' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /all bugs/i })).toBeInTheDocument();
});

test('creates and stores a bug from the dashboard modal', async () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'project-1',
    ownerId: 'test-user',
    leadId: 'test-user',
    leadName: 'Jane Doe',
    teamMemberIds: [],
    name: 'Capstone Tracker',
    key: 'CAP',
    description: 'Track the capstone project.',
    type: 'software-development',
    progress: 0,
    status: 'active',
    createdAt: '2026-11-07T10:00:00.000Z',
  }]));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^create bug$/i }));
  const dialog = screen.getByRole('dialog', { name: /create bug/i });
  expect(dialog).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Login form fails on mobile' } });
  fireEvent.change(screen.getByLabelText(/^description/i), {
    target: { value: 'Submitting the login form on mobile shows an error.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /priority: high/i }));
  const priorityList = screen.getByRole('listbox', { name: /priority/i });
  const priorityOptions = within(priorityList).getAllByRole('option');
  expect(priorityOptions).toHaveLength(4);
  priorityOptions.forEach((option) => expect(option.querySelector('svg')).toBeInTheDocument());
  fireEvent.click(within(priorityList).getByRole('option', { name: /critical/i }));
  fireEvent.click(dialog.querySelector('button[type="submit"]'));

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /create bug/i })).not.toBeInTheDocument();
  });
  expect(screen.getByRole('status')).toHaveTextContent(/cap-001 was created successfully/i);
  const createdBugRow = screen
    .getByRole('button', { name: /open bug cap-001: login form fails on mobile/i })
    .closest('tr');
  expect(createdBugRow).toBeInTheDocument();
  expect(createdBugRow.querySelector('.lucide-circle-alert')).toBeInTheDocument();

  const [bug] = JSON.parse(localStorage.getItem(BUGS_STORAGE_KEY));
  expect(bug.id).toBe('CAP-001');
  expect(bug.projectId).toBe('project-1');
  expect(bug.priority).toBe('Critical');
  expect(bug.status).toBe('New');

  const openBugsMetric = screen.getByText('Open Bugs').closest('article');
  expect(openBugsMetric).toHaveTextContent('1');
  const projectRow = screen.getByText('Capstone Tracker').closest('.project-row');
  expect(projectRow).toHaveTextContent('1');
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

test('shows local projects on the projects page and filters them', async () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    usage: 'create-project',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'project-1',
    ownerId: 'test-user',
    leadId: 'test-user',
    leadName: 'Jane Doe',
    teamMemberIds: [],
    name: 'Capstone Tracker',
    key: 'CAP',
    description: 'Track the university capstone project.',
    type: 'api-service',
    progress: 35,
    status: 'active',
    endDate: '2027-05-01',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([{
    storageId: 'bug-1',
    id: 'CAP-001',
    projectId: 'project-1',
    title: 'Example bug',
    description: 'An example project issue.',
    priority: 'High',
    status: 'New',
    assigneeName: 'Jane Doe',
    attachments: [{
      id: 'attachment-1',
      name: 'error-screenshot.png',
      size: 68,
      type: 'image/png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    }],
    createdAt: '2026-11-07T10:00:00.000Z',
    updatedAt: '2026-11-07T10:00:00.000Z',
  }]));
  window.history.pushState({}, '', '/projects');
  render(<App />);

  expect(screen.getByRole('heading', { name: /project center/i })).toBeInTheDocument();
  const project = screen.getByText('Capstone Tracker').closest('article');
  expect(project).toHaveTextContent('CAP');
  expect(project).toHaveTextContent('35%');
  expect(project).toHaveTextContent('1 bug');
  expect(project.querySelector('.lucide-server-cog')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^completed$/i }));
  expect(screen.getByText(/no matching projects/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
  expect(screen.getByText('Capstone Tracker')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: /open capstone tracker/i }));
  expect(screen.getByRole('heading', { name: 'Capstone Tracker' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /all bugs/i })).toBeInTheDocument();
  expect(screen.getByText('Example bug')).toBeInTheDocument();
  expect(screen.getByText('CAP-001')).toBeInTheDocument();
  expect(screen.getByText('Example bug').closest('article')).toHaveTextContent('Jane Doe');

  fireEvent.click(screen.getByRole('button', { name: /open bug cap-001: example bug/i }));
  const bugDetails = screen.getByRole('dialog', { name: /example bug/i });
  expect(bugDetails).toHaveTextContent('An example project issue.');
  expect(within(bugDetails).getByText(/no comments yet/i)).toBeInTheDocument();
  const attachmentLink = await within(bugDetails).findByRole('link', {
    name: /open attachment error-screenshot.png/i,
  });
  expect(attachmentLink).toHaveAttribute('href', expect.stringContaining('data:image/png'));
  expect(attachmentLink).toHaveAttribute('target', '_blank');
  expect(within(attachmentLink).getByRole('img', { name: /preview of error-screenshot.png/i })).toBeInTheDocument();
  fireEvent.change(within(bugDetails).getByLabelText(/add a comment/i), {
    target: { value: 'I can reproduce this on the latest build.' },
  });
  fireEvent.click(within(bugDetails).getByRole('button', { name: /post comment/i }));
  expect(within(bugDetails).getByText('I can reproduce this on the latest build.')).toBeInTheDocument();

  const [storedBug] = JSON.parse(localStorage.getItem(BUGS_STORAGE_KEY));
  expect(storedBug.comments).toHaveLength(1);
  expect(storedBug.comments[0].authorName).toBe('Jane Doe');
  expect(storedBug.comments[0].body).toBe('I can reproduce this on the latest build.');

  fireEvent.click(within(bugDetails).getByRole('button', { name: /open bug controls/i }));
  fireEvent.click(within(bugDetails).getByRole('button', { name: /change bug priority: high/i }));
  fireEvent.click(within(bugDetails).getByRole('option', { name: /^low$/i }));
  fireEvent.click(within(bugDetails).getByRole('button', { name: /change bug status: new/i }));
  fireEvent.click(within(bugDetails).getByRole('option', { name: /^in progress$/i }));
  const [updatedBug] = JSON.parse(localStorage.getItem(BUGS_STORAGE_KEY));
  expect(updatedBug.priority).toBe('Low');
  expect(updatedBug.status).toBe('In Progress');

  fireEvent.click(within(bugDetails).getByRole('button', { name: /delete bug/i }));
  expect(within(bugDetails).getByRole('alert')).toHaveTextContent(/cannot be undone/i);
  fireEvent.click(within(bugDetails).getByRole('button', { name: /confirm delete/i }));

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /example bug/i })).not.toBeInTheDocument();
  });
  expect(JSON.parse(localStorage.getItem(BUGS_STORAGE_KEY))).toEqual([]);
  expect(screen.getByText(/no bugs in this project/i)).toBeInTheDocument();
});

test('lets a project owner start a sprint and shows it on the dashboard', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'sprint-project',
    ownerId: 'test-user',
    leadId: 'test-user',
    leadName: 'Jane Doe',
    teamMemberIds: [],
    name: 'Sprint Project',
    key: 'SPR',
    type: 'software-development',
    status: 'active',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([{
    storageId: 'sprint-bug',
    id: 'SPR-001',
    projectId: 'sprint-project',
    title: 'Sprint bug',
    description: 'A bug included in sprint progress.',
    priority: 'High',
    status: 'Closed',
  }]));
  window.history.pushState({}, '', '/projects/sprint-project');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^start sprint$/i }));
  const sprintDialog = screen.getByRole('dialog', { name: /start a sprint/i });
  fireEvent.change(within(sprintDialog).getByLabelText(/sprint name/i), {
    target: { value: 'Capstone Sprint 1' },
  });
  fireEvent.change(within(sprintDialog).getByLabelText(/sprint goal/i), {
    target: { value: 'Close the project’s first release bugs.' },
  });
  fireEvent.change(within(sprintDialog).getByLabelText(/start date/i), {
    target: { value: '2026-11-07' },
  });
  fireEvent.change(within(sprintDialog).getByLabelText(/end date/i), {
    target: { value: '2026-11-21' },
  });
  fireEvent.click(within(sprintDialog).getByRole('button', { name: /^start sprint$/i }));

  expect(screen.queryByRole('dialog', { name: /start a sprint/i })).not.toBeInTheDocument();
  const storedProject = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY))[0];
  expect(storedProject.activeSprintId).toBe(storedProject.sprints[0].id);
  expect(storedProject.sprints[0]).toMatchObject({
    name: 'Capstone Sprint 1',
    goal: 'Close the project’s first release bugs.',
    status: 'active',
  });
  expect(screen.getByText('Capstone Sprint 1')).toBeInTheDocument();
  expect(screen.getByText('1 of 1 bugs closed')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));
  const currentSprintSection = screen.getByRole('heading', { name: /current sprint/i }).closest('section');
  expect(within(currentSprintSection).getByText('Capstone Sprint 1')).toBeInTheDocument();
  expect(within(currentSprintSection).getByText('100%')).toBeInTheDocument();
  expect(within(currentSprintSection).getByText('Sprint Project', { exact: false })).toBeInTheDocument();
});

test('shows project and sprint statistics in reports with search and dropdown selection', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'test-user',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'alpha-project',
    ownerId: 'test-user',
    teamMemberIds: [],
    name: 'Alpha Project',
    key: 'ALPHA',
    description: 'The first report project.',
    type: 'api-service',
    status: 'active',
    activeSprintId: 'alpha-sprint',
    sprints: [{
      id: 'alpha-sprint',
      name: 'Alpha Sprint',
      goal: 'Stabilize the API release.',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      status: 'active',
    }],
  }, {
    id: 'beta-project',
    ownerId: 'another-owner',
    teamMemberIds: ['test-user'],
    name: 'Beta Project',
    key: 'BETA',
    description: 'The second report project.',
    type: 'website',
    status: 'active',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([{
    storageId: 'alpha-new',
    id: 'ALPHA-001',
    projectId: 'alpha-project',
    title: 'Open API bug',
    priority: 'High',
    status: 'New',
    dueDate: '2026-11-06',
    createdAt: '2026-11-05T10:00:00.000Z',
  }, {
    storageId: 'alpha-progress',
    id: 'ALPHA-002',
    projectId: 'alpha-project',
    title: 'API response issue',
    priority: 'Critical',
    status: 'In Progress',
    dueDate: '2026-11-12',
    createdAt: '2026-11-06T10:00:00.000Z',
  }, {
    storageId: 'alpha-closed',
    id: 'ALPHA-003',
    projectId: 'alpha-project',
    title: 'Resolved API bug',
    priority: 'Low',
    status: 'Closed',
    assigneeId: 'test-user',
    comments: [{ id: 'comment-1', body: 'Fixed.' }],
    createdAt: '2026-11-07T10:00:00.000Z',
  }, {
    storageId: 'beta-closed',
    id: 'BETA-001',
    projectId: 'beta-project',
    title: 'Resolved website bug',
    priority: 'Medium',
    status: 'Closed',
    createdAt: '2026-11-07T11:00:00.000Z',
  }]));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^report$/i }));
  expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/alpha project report overview/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Total bugs')).toHaveTextContent('3');
  expect(screen.getByText('Alpha Sprint')).toBeInTheDocument();
  const sprintReport = screen.getByRole('heading', { name: /sprint report/i }).closest('section');
  expect(within(sprintReport).getByText('33%')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/search project reports/i), {
    target: { value: 'Beta' },
  });
  fireEvent.click(screen.getByRole('option', { name: /select beta project report/i }));
  expect(screen.getByLabelText(/beta project report overview/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Total bugs')).toHaveTextContent('1');
  expect(screen.getByText(/no active sprint/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /report project: beta project/i }));
  fireEvent.click(screen.getByRole('option', { name: /alpha project/i }));
  expect(screen.getByLabelText(/alpha project report overview/i)).toBeInTheDocument();
  expect(screen.getByText('Alpha Sprint')).toBeInTheDocument();
});

test('does not show bug management controls to project team members', () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'team-member',
    fullName: 'Team Member',
    email: 'member@example.com',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'shared-project',
    ownerId: 'project-owner',
    leadName: 'Project Owner',
    teamMemberIds: ['team-member'],
    name: 'Shared Project',
    key: 'SHARED',
    type: 'website',
    status: 'active',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([{
    storageId: 'shared-bug',
    id: 'SHARED-001',
    projectId: 'shared-project',
    projectName: 'Shared Project',
    title: 'Shared project bug',
    description: 'Visible to the team.',
    priority: 'Medium',
    status: 'Assigned',
  }]));
  window.history.pushState({}, '', '/projects/shared-project');
  render(<App />);

  expect(screen.queryByRole('button', { name: /^start sprint$/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /open bug shared-001/i }));
  const bugDetails = screen.getByRole('dialog', { name: /shared project bug/i });
  expect(within(bugDetails).queryByRole('button', { name: /open bug controls/i })).not.toBeInTheDocument();
  expect(within(bugDetails).queryByLabelText(/change bug priority/i)).not.toBeInTheDocument();
  expect(within(bugDetails).queryByLabelText(/change bug status/i)).not.toBeInTheDocument();
  expect(within(bugDetails).queryByRole('button', { name: /delete bug/i })).not.toBeInTheDocument();
  expect(within(bugDetails).getByLabelText(/add a comment/i)).toBeInTheDocument();
});

test('lets bug creators delete and assignees update workflow', async () => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    id: 'contributor',
    fullName: 'Project Contributor',
    email: 'contributor@example.com',
  }));
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{
    id: 'team-project',
    ownerId: 'project-owner',
    leadName: 'Project Owner',
    teamMemberIds: ['contributor'],
    name: 'Team Project',
    key: 'TEAM',
    type: 'software-development',
    status: 'active',
  }]));
  localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify([{
    storageId: 'creator-bug',
    id: 'TEAM-001',
    projectId: 'team-project',
    projectName: 'Team Project',
    reporterId: 'contributor',
    reporterName: 'Project Contributor',
    assigneeId: 'someone-else',
    title: 'Bug created by contributor',
    description: 'The creator should be able to delete this.',
    priority: 'High',
    status: 'New',
    createdAt: '2026-11-07T10:00:00.000Z',
  }, {
    storageId: 'assigned-bug',
    id: 'TEAM-002',
    projectId: 'team-project',
    projectName: 'Team Project',
    reporterId: 'someone-else',
    assigneeId: 'contributor',
    assigneeName: 'Project Contributor',
    title: 'Bug assigned to contributor',
    description: 'The assignee should update the workflow.',
    priority: 'Medium',
    status: 'Assigned',
    createdAt: '2026-11-07T11:00:00.000Z',
  }]));
  window.history.pushState({}, '', '/projects/team-project');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /open bug team-001/i }));
  let bugDetails = screen.getByRole('dialog', { name: /bug created by contributor/i });
  fireEvent.click(within(bugDetails).getByRole('button', { name: /open bug controls/i }));
  expect(within(bugDetails).getByRole('button', { name: /delete bug/i })).toBeInTheDocument();
  expect(within(bugDetails).queryByLabelText(/change bug priority/i)).not.toBeInTheDocument();
  fireEvent.click(within(bugDetails).getByRole('button', { name: /delete bug/i }));
  fireEvent.click(within(bugDetails).getByRole('button', { name: /confirm delete/i }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /open bug team-002/i }));
  bugDetails = screen.getByRole('dialog', { name: /bug assigned to contributor/i });
  fireEvent.click(within(bugDetails).getByRole('button', { name: /open bug controls/i }));
  expect(within(bugDetails).getByRole('button', { name: /change bug priority: medium/i })).toBeInTheDocument();
  expect(within(bugDetails).getByRole('button', { name: /change bug status: assigned/i })).toBeInTheDocument();
  expect(within(bugDetails).queryByRole('button', { name: /delete bug/i })).not.toBeInTheDocument();
  fireEvent.click(within(bugDetails).getByRole('button', { name: /change bug status: assigned/i }));
  fireEvent.click(within(bugDetails).getByRole('option', { name: /^in progress$/i }));

  const [remainingBug] = JSON.parse(localStorage.getItem(BUGS_STORAGE_KEY));
  expect(remainingBug.id).toBe('TEAM-002');
  expect(remainingBug.status).toBe('In Progress');
});
