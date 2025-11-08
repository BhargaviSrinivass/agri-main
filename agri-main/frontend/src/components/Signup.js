import React, { useState } from 'react';
import { authAPI } from '../services/api';

const Signup = ({ switchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
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
      const response = await authAPI.signup(formData);
      if (response.data.success) {
        alert('Signup successful! Please login.');
        switchToLogin();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="auth-form">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
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
          Sign Up
        </button>
      </form>
      <p>
        Already have an account?{' '}
        <span className="toggle-link" onClick={switchToLogin}>
          Login
        </span>
      </p>
    </div>
  );
};

export default Signup;