import React, { useState } from 'react';
import { authAPI } from '../services/api';

const Login = ({ switchToSignup, onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authAPI.login(formData);
      if (response.data.success) {
        onLogin(response.data.user);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" className="submit-btn">
          Login
        </button>
      </form>
      <p>
        Don't have an account?{' '}
        <span className="toggle-link" onClick={switchToSignup}>
          Sign Up
        </span>
      </p>
    </div>
  );
};

export default Login;