import React, { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import brandLogo from "../assets/Madison-88-Logo-250.png";
import { isBlank, isEmail } from "../utils/validation";

const LoginPage = ({ onLogin }) => {
  const {
    loginWithRedirect,
    isAuthenticated,
    isLoading: auth0Loading,
    user,
    getIdTokenClaims,
    error: auth0Error,
  } = useAuth0();

  const [mode, setMode] = useState("m365"); // 'm365' | 'local'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isBusy = useMemo(
    () => loading || auth0Loading,
    [loading, auth0Loading]
  );

  useEffect(() => {
    // If user is authenticated with Auth0, exchange token for system JWT
    if (isAuthenticated && user) {
      const exchangeToken = async () => {
        try {
          const claims = await getIdTokenClaims();
          const idToken = claims?.__raw;
          if (!idToken) throw new Error("Missing Auth0 idToken");

          const res = await axios.post("/api/auth/auth0-login", { idToken });
          onLogin(res.data.token, res.data.user);
        } catch (err) {
          console.error("Token exchange failed:", err);
          setError(err.response?.data?.message || err.message || "Login failed");
        }
      };
      exchangeToken();
    }
  }, [isAuthenticated, user, onLogin, getIdTokenClaims]);

  const handleM365Login = () => {
    setError("");
    loginWithRedirect();
  };

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isBlank(email)) return setError("Email is required.");
    if (!isEmail(email)) return setError("Enter a valid email address.");
    if (isBlank(password)) return setError("Password is required.");

    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (auth0Loading && mode === "m365") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <img
              className="brand-logo brand-logo-lg"
              src={brandLogo}
              alt="Madison88"
            />
          </div>
          <p className="auth-subtitle">Signing in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img
            className="brand-logo brand-logo-lg"
            src={brandLogo}
            alt="Madison88"
          />
        </div>
        <p className="auth-subtitle">Sign in to the service desk.</p>

        <div className="auth-mode-toggle">
          <button
            type="button"
            className={`auth-mode-btn ${mode === "m365" ? "active" : ""}`}
            onClick={() => setMode("m365")}
            disabled={isBusy}
          >
            Microsoft 365
          </button>
          <button
            type="button"
            className={`auth-mode-btn ${mode === "local" ? "active" : ""}`}
            onClick={() => setMode("local")}
            disabled={isBusy}
          >
            Email / Password
          </button>
        </div>

        {(error || auth0Error) && (
          <div className="panel error auth-alert">
            {error || auth0Error?.message || "Authentication error occurred"}
          </div>
        )}

        {mode === "m365" ? (
          <>
            <button
              type="button"
              className="btn primary btn-full"
              onClick={handleM365Login}
              disabled={isBusy}
            >
              {isBusy ? "Signing in..." : "Sign in with Microsoft 365"}
            </button>
            <p className="auth-note">
              After Microsoft 365 login, you will be an <strong>Employee</strong>{" "}
              user in the system.
            </p>
          </>
        ) : (
          <form onSubmit={handleLocalSubmit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={isBusy}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isBusy}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isBusy}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button
              type="submit"
              className="btn primary"
              style={{ width: "100%" }}
              disabled={isBusy}
            >
              {isBusy ? "Logging in..." : "Login"}
            </button>
            <p className="auth-note">
              Use this for <strong>IT Manager</strong> / <strong>Admin</strong>{" "}
              accounts you create.
            </p>
          </form>
        )}
        
        <p className="terms-notice">
          By logging in, you agree to our{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); }} className="terms-link">
            Terms of Service
          </a>
          {" "}and{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); }} className="terms-link">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
