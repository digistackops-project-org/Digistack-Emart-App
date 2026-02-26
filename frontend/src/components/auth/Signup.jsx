import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { authApi } from '../../services/authApi';
import './Auth.css';

const schema = yup.object({
  name: yup
    .string()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^[+]?[0-9]{10,15}$/, 'Enter a valid phone number'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
  city: yup
    .string()
    .required('City is required')
    .min(2, 'City must be at least 2 characters'),
});

function Signup() {
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
      const response = await authApi.signup(data);
      const { token, name, email } = response.data.data;

      localStorage.setItem('emart_token', token);
      localStorage.setItem('emart_user', JSON.stringify({ name, email }));

      toast.success(`Welcome to Emart, ${name}! Account created successfully.`);
      navigate('/dashboard');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.email ||
        'Registration failed. Please try again.';
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
          <p>Create your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              className={errors.name ? 'input-error' : ''}
              {...register('name')}
              data-testid="name-input"
            />
            {errors.name && (
              <span className="error-msg" data-testid="name-error">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={errors.email ? 'input-error' : ''}
              {...register('email')}
              data-testid="email-input"
            />
            {errors.email && (
              <span className="error-msg" data-testid="email-error">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="+91XXXXXXXXXX"
              className={errors.phone ? 'input-error' : ''}
              {...register('phone')}
              data-testid="phone-input"
            />
            {errors.phone && (
              <span className="error-msg" data-testid="phone-error">
                {errors.phone.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Create a strong password"
              className={errors.password ? 'input-error' : ''}
              {...register('password')}
              data-testid="password-input"
            />
            {errors.password && (
              <span className="error-msg" data-testid="password-error">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Re-enter Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              className={errors.confirmPassword ? 'input-error' : ''}
              {...register('confirmPassword')}
              data-testid="confirm-password-input"
            />
            {errors.confirmPassword && (
              <span className="error-msg" data-testid="confirm-password-error">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* City */}
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              placeholder="Enter your city"
              className={errors.city ? 'input-error' : ''}
              {...register('city')}
              data-testid="city-input"
            />
            {errors.city && (
              <span className="error-msg" data-testid="city-error">
                {errors.city.message}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            data-testid="signup-button"
          >
            {isLoading ? (
              <span className="spinner">Creating Account...</span>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="auth-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;
