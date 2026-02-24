import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const strengthScore = (pw) => {
    let score = 0;
    if (!pw) return 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthText = (s) => {
    if (s === 0) return '';
    if (s <= 1) return 'Very weak';
    if (s === 2) return 'Weak';
    if (s === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Reset Password</h2>
        {error && <div className="panel error">{error}</div>}
        {success && <div className="panel success">{success}</div>}
        {!success && (
          <form onSubmit={handleSubmit}>
            <label>New password</label>
            <div className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>

            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div style={{ height: 6, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(strengthScore(password) / 4) * 100}%`, height: '100%', background: strengthScore(password) >= 3 ? '#06b6d4' : '#f97316', transition: 'width 160ms ease' }} />
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{strengthText(strengthScore(password))}</div>
            </div>

            <label>Confirm</label>
            <div className="password-field">
              <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShowConfirm(p => !p)}>{showConfirm ? 'Hide' : 'Show'}</button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn primary" disabled={loading || !password || password.length < 6 || password !== confirm}>{loading ? 'Saving...' : 'Set Password'}</button>
            </div>
            {!token && (
              <div style={{ marginTop: 12 }}>
                <p style={{ color: '#94a3b8' }}>Missing or invalid token? Please contact your system administrator to request a password reset.</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
