import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPasswordPage = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const t = query.get('token') || '';
    setToken(t);
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (!token) return setError('Missing reset token');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', { token, password });
      setSuccess(res.data?.message || 'Password reset successful. Please log in.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Password</h2>
        {error && <div className="panel error">{error}</div>}
        {success && <div className="panel success">{success}</div>}
        {!success && (
          <form onSubmit={handleSubmit}>
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label>Confirm</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Saving...' : 'Set Password'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
