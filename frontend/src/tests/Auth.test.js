import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ToastContainer } from 'react-toastify';
import Signup from '../components/auth/Signup';
import Login from '../components/auth/Login';

// Mock API
jest.mock('../services/authApi', () => ({
  authApi: {
    signup: jest.fn(),
    login: jest.fn(),
  },
}));

const { authApi } = require('../services/authApi');

// Mock react-router navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (component) =>
  render(
    <MemoryRouter>
      {component}
      <ToastContainer />
    </MemoryRouter>
  );

// ============================================================
// SIGNUP COMPONENT TESTS
// ============================================================
describe('Signup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders all signup form fields', () => {
    renderWithRouter(<Signup />);
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('phone-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('city-input')).toBeInTheDocument();
    expect(screen.getByTestId('signup-button')).toBeInTheDocument();
  });

  it('shows validation errors when form is submitted empty', async () => {
    renderWithRouter(<Signup />);
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(screen.getByTestId('name-error')).toBeInTheDocument();
      expect(screen.getByTestId('email-error')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderWithRouter(<Signup />);
    await userEvent.type(screen.getByTestId('name-input'), 'John');
    await userEvent.type(screen.getByTestId('email-input'), 'john@test.com');
    await userEvent.type(screen.getByTestId('phone-input'), '+919876543210');
    await userEvent.type(screen.getByTestId('password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'Different@999');
    await userEvent.type(screen.getByTestId('city-input'), 'Mumbai');
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-password-error')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Passwords do not match');
    });
  });

  it('calls authApi.signup with correct data on valid form submission', async () => {
    authApi.signup.mockResolvedValue({
      data: {
        success: true,
        data: { token: 'mock-token', name: 'John', email: 'john@test.com', roles: ['ROLE_USER'] },
      },
    });

    renderWithRouter(<Signup />);

    await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
    await userEvent.type(screen.getByTestId('email-input'), 'john@test.com');
    await userEvent.type(screen.getByTestId('phone-input'), '+919876543210');
    await userEvent.type(screen.getByTestId('password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('city-input'), 'Mumbai');
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(authApi.signup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@test.com',
          phone: '+919876543210',
          city: 'Mumbai',
        })
      );
    });
  });

  it('stores token in localStorage on successful signup', async () => {
    authApi.signup.mockResolvedValue({
      data: {
        success: true,
        data: { token: 'jwt-abc', name: 'John', email: 'john@test.com', roles: ['ROLE_USER'] },
      },
    });

    renderWithRouter(<Signup />);
    await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
    await userEvent.type(screen.getByTestId('email-input'), 'john@test.com');
    await userEvent.type(screen.getByTestId('phone-input'), '+919876543210');
    await userEvent.type(screen.getByTestId('password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('city-input'), 'Mumbai');
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(localStorage.getItem('emart_token')).toBe('jwt-abc');
    });
  });

  it('shows error toast on signup failure (409 conflict)', async () => {
    authApi.signup.mockRejectedValue({
      response: { status: 409, data: { message: 'Email already registered' } },
    });

    renderWithRouter(<Signup />);
    await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
    await userEvent.type(screen.getByTestId('email-input'), 'duplicate@test.com');
    await userEvent.type(screen.getByTestId('phone-input'), '+919876543210');
    await userEvent.type(screen.getByTestId('password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'Password@123');
    await userEvent.type(screen.getByTestId('city-input'), 'Mumbai');
    fireEvent.click(screen.getByTestId('signup-button'));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });
});

// ============================================================
// LOGIN COMPONENT TESTS
// ============================================================
describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders all login form fields', () => {
    renderWithRouter(<Login />);
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderWithRouter(<Login />);
    await userEvent.type(screen.getByTestId('login-email-input'), 'not-an-email');
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByTestId('login-email-error')).toBeInTheDocument();
    });
  });

  it('calls authApi.login with correct credentials', async () => {
    authApi.login.mockResolvedValue({
      data: {
        success: true,
        data: { token: 'login-token', name: 'Alice', email: 'alice@test.com', roles: ['ROLE_USER'] },
      },
    });

    renderWithRouter(<Login />);
    await userEvent.type(screen.getByTestId('login-email-input'), 'alice@test.com');
    await userEvent.type(screen.getByTestId('login-password-input'), 'Password@123');
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'alice@test.com',
        password: 'Password@123',
      });
    });
  });

  it('shows invalid credentials message on 401 response', async () => {
    authApi.login.mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid email or password' } },
    });

    renderWithRouter(<Login />);
    await userEvent.type(screen.getByTestId('login-email-input'), 'alice@test.com');
    await userEvent.type(screen.getByTestId('login-password-input'), 'WrongPass@123');
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('navigates to dashboard on successful login', async () => {
    authApi.login.mockResolvedValue({
      data: {
        success: true,
        data: { token: 'token', name: 'Bob', email: 'bob@test.com', roles: ['ROLE_USER'] },
      },
    });

    renderWithRouter(<Login />);
    await userEvent.type(screen.getByTestId('login-email-input'), 'bob@test.com');
    await userEvent.type(screen.getByTestId('login-password-input'), 'Password@123');
    fireEvent.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
