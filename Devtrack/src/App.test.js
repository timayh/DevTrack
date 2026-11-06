import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the DevTrack landing page', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /track your bugs.*ship with confidence/i })
  ).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
});
