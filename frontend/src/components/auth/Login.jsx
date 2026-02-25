import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { authApi } from '../../services/authApi';
import './Auth.css';

const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(1, 'Password cannot be empty'),
});

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      const { token, name, email, roles } = response.data.data;

      localStorage.setItem('emart_token', token);
      localStorage.setItem('emart_user', JSON.stringify({ name, email, roles }));

      toast.success(`Welcome back, ${name}!`);
      navigate('/dashboard');
    } catch (error) {
      const status = error.response?.status;
      let message = 'Login failed. Please try again.';

      if (status === 401) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (status === 423) {
        message = 'Your account is locked. Please contact support.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <h1>Emart</h1>
          <p>Sign in to your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={errors.email ? 'input-error' : ''}
              {...register('email')}
              data-testid="login-email-input"
            />
            {errors.email && (
              <span className="error-msg" data-testid="login-email-error">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={errors.password ? 'input-error' : ''}
              {...register('password')}
              data-testid="login-password-input"
            />
            {errors.password && (
              <span className="error-msg" data-testid="login-password-error">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" /> Remember me
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            data-testid="login-button"
          >
            {isLoading ? <span className="spinner">Signing In...</span> : 'Sign In'}
          </button>

          <p className="auth-link">
            New to Emart? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
