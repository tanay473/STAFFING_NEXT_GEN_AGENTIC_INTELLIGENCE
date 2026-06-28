import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Briefcase, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('recruiter');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    // Simulate auth delay
    await new Promise(r => setTimeout(r, 800));
    login(role);
    navigate(role === 'recruiter' ? '/recruiter' : '/client');
  };

  return (
    <div className="login-page">
      {/* Animated background elements */}
      <div className="login-mesh" />
      <div className="login-orb login-orb--1" />
      <div className="login-orb login-orb--2" />
      <div className="login-orb login-orb--3" />
      <div className="login-grain" />

      <div className="login-card">
        {/* Top shimmer edge */}
        <div className="login-card__edge" />

        <div className="login-card__inner">
          {/* Logo */}
          <div className="login-brand">
            <div className="login-brand__icon">
              <Briefcase size={24} />
            </div>
            <div className="login-brand__text">
              <span className="login-brand__name">Staffing<span>.NBA</span></span>
              <span className="login-brand__tag">Agentic Staffing Intelligence</span>
            </div>
          </div>

          <div className="login-divider" />

          <h1 className="login-heading">Sign in to your account</h1>
          <p className="login-subheading">Access your personalized workspace</p>

          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Role Toggle */}
            <div className="login-role-toggle">
              <button
                type="button"
                className={`login-role-option ${role === 'recruiter' ? 'active' : ''}`}
                onClick={() => setRole('recruiter')}
              >
                Agency Admin
              </button>
              <button
                type="button"
                className={`login-role-option ${role === 'client' ? 'active' : ''}`}
                onClick={() => setRole('client')}
              >
                Client Portal
              </button>
              <div
                className="login-role-slider"
                style={{ transform: role === 'client' ? 'translateX(100%)' : 'translateX(0)' }}
              />
            </div>

            {/* Email */}
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <div className="login-field__top">
                <label htmlFor="login-password">Password</label>
                <a href="#" className="login-forgot" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`login-submit ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="login-spinner" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-footer-text">
            Protected by enterprise-grade security · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
