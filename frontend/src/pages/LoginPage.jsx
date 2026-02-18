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

// 
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  // Blue for headings, black for normal text
  const headingStyle = { color: '#1976d2', fontWeight: 'bold', marginBottom: 8 };
  const subheadingStyle = { color: '#1976d2', fontWeight: 'bold', marginTop: 24, marginBottom: 8 };
  const labelStyle = { color: '#1976d2', fontWeight: 'bold' };
  const textStyle = { color: '#222', fontWeight: 'normal' };

  const handleShowModal = (type) => {
    setModalOpen(true);
    if (type === 'terms') {
      setModalContent(
        <div style={{ textAlign: 'left', maxHeight: '60vh', overflowY: 'auto', fontSize: '1rem' }}>
          <h2 style={headingStyle}>Terms and Conditions of Use</h2>
          <h3 style={subheadingStyle}>EXECUTIVE SUMMARY</h3>
          <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, marginBottom: 16, background: '#faf9f6', ...textStyle }}>
            These Terms and Conditions govern your access to and use of the Madison 88 ITSM System. By accessing or using our IT services, ticket management, and asset tracking tools, you acknowledge that you have read, understood, and agree to be bound by these corporate IT policies and all applicable digital regulations.
          </div>
          <h3 style={subheadingStyle}>ACCEPTANCE OF TERMS & CONDITIONS</h3>
          <span style={labelStyle}>BINDING AGREEMENT</span>
          <div style={{ borderLeft: '3px solid #1976d2', paddingLeft: 12, marginBottom: 8, ...textStyle }}>
            By logging into the Madison 88 ITSM System, you acknowledge that you have read these Terms and Conditions in their entirety and agree to be legally bound by all provisions regarding internal IT resource usage. If you do not agree with any part of these terms, you must immediately cease usage and contact your System Administrator.
          </div>
          <span style={labelStyle}>CAPACITY TO AGREE</span>
          <div style={{ borderLeft: '3px solid #1976d2', paddingLeft: 12, marginBottom: 8, ...textStyle }}>
            You represent and warrant that you are an authorized employee or contractor of Madison 88 and have the legal capacity to access internal systems. Unauthorized access by third parties is strictly prohibited and subject to legal action.
          </div>
          <h3 style={subheadingStyle}>SYSTEM ACCESS & USER RESPONSIBILITIES</h3>
          <span style={labelStyle}>AUTHORIZED USE</span>
          <div style={{ ...textStyle, marginBottom: 8 }}>
            Access to the Madison 88 ITSM System is granted solely for legitimate IT support purposes including ticket submission, incident reporting, asset management, and service level monitoring in compliance with corporate governance.
          </div>
          <span style={labelStyle}>PROHIBITED ACTIVITIES</span>
          <div style={{ ...textStyle, marginBottom: 8 }}>
            Users are strictly prohibited from: (a) attempting unauthorized access to administrative modules, (b) bypassing system security protocols, (c) sharing login credentials with other personnel, (d) using the system to host non-work-related data, and (e) violating internal IT security and acceptable use policies.
          </div>
        </div>
      );
    } else if (type === 'privacy') {
      setModalContent(
        <div style={{ textAlign: 'left', maxHeight: '60vh', overflowY: 'auto', fontSize: '1rem' }}>
          <h2 style={headingStyle}>Privacy Policy &amp; Data Protection Notice</h2>
          <h3 style={subheadingStyle}>EXECUTIVE SUMMARY</h3>
          <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, marginBottom: 16, background: '#faf9f6', ...textStyle }}>
            This Privacy Policy outlines how the Madison 88 IT Department collects, uses, processes, and protects employee and system data through the ITSM System. We are committed to ensuring the security of your technical data in full compliance with global data protection standards and the Philippine Data Privacy Act of 2012.
          </div>
          <h3 style={subheadingStyle}>LEGAL BASIS &amp; REGULATORY COMPLIANCE</h3>
          <span style={labelStyle}>DATA PRIVACY ACT COMPLIANCE</span>
          <div style={{ borderLeft: '3px solid #1976d2', paddingLeft: 12, marginBottom: 8, ...textStyle }}>
            Our data processing activities are conducted in accordance with Republic Act No. 10173 and Madison 88 internal compliance frameworks. We adhere to the principles of transparency and legitimate purpose in all ITSM data operations.
          </div>
          <h3 style={subheadingStyle}>DATA COLLECTION PRACTICES</h3>
          <span style={labelStyle}>TYPES OF INFORMATION COLLECTED</span>
          <ul style={{ marginLeft: 20, ...textStyle }}>
            <li><b>User Information:</b> Full name, employee ID, department, and contact details for support routing.</li>
            <li><b>Technical Data:</b> Device specifications, IP addresses, system logs, and application performance metrics.</li>
            <li><b>Incident Data:</b> Support ticket descriptions, screenshots of technical errors, and resolution history.</li>
            <li><b>Access Logs:</b> Timestamps of logins, record modifications, and administrative changes.</li>
          </ul>
          <span style={labelStyle}>COLLECTION METHODS</span>
          <div style={{ marginBottom: 8, ...textStyle }}>
            Information is collected through: (a) direct ticket submission, (b) automated system monitoring tools, (c) HR system integration for user profiles, and (d) Active Directory synchronization.
          </div>
          <h3 style={subheadingStyle}>DATA SECURITY MEASURES</h3>
          <span style={labelStyle}>TECHNICAL SAFEGUARDS</span>
          <ul style={{ marginLeft: 20, ...textStyle }}>
            <li>Enterprise-grade encryption for data at rest and in transit.</li>
            <li>Secure Socket Layer (SSL) for all browser-to-server communications.</li>
            <li>Mandatory Multi-factor authentication (MFA) for administrative access.</li>
            <li>Automated vulnerability scanning and penetration testing.</li>
          </ul>
          <h3 style={subheadingStyle}>DATA SUBJECT RIGHTS</h3>
          <span style={labelStyle}>FUNDAMENTAL RIGHTS</span>
          <ul style={{ marginLeft: 20, ...textStyle }}>
            <li>Right to access personal ticket history and system activity logs.</li>
            <li>Right to request rectification of inaccurate employee profile data.</li>
            <li>Right to be informed of system-wide data processing activities.</li>
            <li>Right to secure data portability for professional records.</li>
          </ul>
          <h3 style={subheadingStyle}>CONTACT INFORMATION &amp; COMPLAINTS</h3>
          <span style={labelStyle}>DATA PROTECTION OFFICER (DPO)</span>
          <div style={{ ...textStyle }}>Name: Madison 88 IT Compliance Officer</div>
          <div style={{ ...textStyle }}>Email: <a href="mailto:it-compliance@madison88.com">it-compliance@madison88.com</a></div>
          <div style={{ ...textStyle }}>Phone: +63 (02) 8888-8888 (Internal Ext: 88)</div>
          <span style={labelStyle}>IT SERVICE DESK HOTLINE</span>
          <div style={{ ...textStyle }}>Toll-Free: 1-800-MAD-88-IT</div>
          <div style={{ ...textStyle }}>Business Hours: 24/7 Support Operations</div>
          <span style={labelStyle}>OFFICE ADDRESS</span>
          <div style={{ ...textStyle }}>Madison 88 Corporate Headquarters<br/>IT Management Division<br/>Metro Manila, Philippines</div>
        </div>
      );
    }
  };
  const handleCloseModal = () => setModalOpen(false);
 



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
          By logging in, you agree to our{' '}
          <a href="#" onClick={e => { e.preventDefault(); handleShowModal('terms'); }} className="terms-link">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="#" onClick={e => { e.preventDefault(); handleShowModal('privacy'); }} className="terms-link">
            Privacy Policy
          </a>
          .
        </p>

        {modalOpen && (
          <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal-content" style={{background:'#fff',padding:24,borderRadius:8,maxWidth:700,width:'95%',boxShadow:'0 2px 16px rgba(0,0,0,0.2)',overflowY:'auto',maxHeight:'90vh',fontFamily:'inherit'}}>
              <button onClick={handleCloseModal} style={{float:'right',background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#1976d2'}} title="Close">&times;</button>
              <div style={{clear:'both'}}></div>
              {modalContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
