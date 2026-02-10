import React from 'react';
import './AuthScreen.css';

const AuthScreen = () => {
  return (
    <div className="auth-container">
      <div className="glassmorphism-card">
        <h2>Welcome Back!</h2>
        <form>
          <div className="floating-label">
            <input type="text" required />
            <label>Username</label>
          </div>
          <div className="floating-label">
            <input type="password" required />
            <label>Password</label>
          </div>
          <button type="submit">Login</button>
        </form>
        <p>Don't have an account? <a href="#">Sign Up</a></p>
      </div>
    </div>
  );
};

export default AuthScreen;
