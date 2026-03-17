import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { isEmail } from '../utils/validation';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!isEmail(email)) return setError('Enter a valid email address');
    setLoading(true);
    try {
      // The endpoint intentionally returns a generic success message to avoid account enumeration
      // Log the full target URL (helpful when deployments forget to set API host)
      try {
        const target = (apiClient.defaults.baseURL || '') + '/auth/request-reset';
        console.debug('[ForgotPassword] calling', target);
      } catch (e) { }
      await apiClient.post('/auth/request-reset', { email });
      setSuccess('If an account exists for this email, a password reset link has been sent.');
      setEmail('');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      // Provide a clearer message when backend route is missing (404)
      const status = err.response?.status;
      if (status === 404) {
        setError('Route not found on API. Check that the backend is deployed and VITE_API_URL / REACT_APP_API_URL is set to your API base. (See console for target URL)');
      } else {
        setError(err.response?.data?.message || 'Failed to request password reset');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p className="muted">Enter the email address for your account and we'll send a link to reset your password.</p>
        {error && <div className="panel error">{error}</div>}
        {success && <div className="panel success">{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </label>

            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
