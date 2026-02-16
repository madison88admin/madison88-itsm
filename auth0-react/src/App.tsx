import './App.css'
import React from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import LoginButton from './LoginButton'
import LogoutButton from './LogoutButton'
import Profile from './Profile'

function App() {
  const { isAuthenticated, isLoading, error } = useAuth0()
  const [showDebug, setShowDebug] = React.useState(false);

  // Debug info
  const currentUrl = window.location.href;
  const currentOrigin = window.location.origin;
  const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI || currentOrigin;

  return (
    <div className="auth0-demo">
      <h1>Madison88 Microsoft 365 Login (Auth0)</h1>

      {/* Debug Information - Toggleable */}
      {showDebug && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px',
          fontSize: '0.85rem',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong>Debug Info:</strong>
            <button
              onClick={() => setShowDebug(false)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Hide
            </button>
          </div>
          Current URL: <code>{currentUrl}</code><br/>
          Current Origin: <code>{currentOrigin}</code><br/>
          Redirect URI: <code>{redirectUri}</code><br/>
        </div>
      )}
      {!showDebug && !isLoading && (
        <button
          onClick={() => setShowDebug(true)}
          style={{
            marginBottom: '1rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: '#e0e0e0',
            color: '#666',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Show Debug Info
        </button>
      )}

      {isLoading && <p>Checking your session...</p>}
      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <p className="error-text" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            Auth error: {(error as Error).message}
          </p>
          {(error as Error).message.includes('state') && (
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <p><strong>Invalid State Error Fix:</strong></p>
              <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Clear your browser's localStorage and cookies for this site</li>
                <li>Close all tabs with this application</li>
                <li>Open a new tab and try again</li>
              </ol>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = window.location.origin;
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Clear Storage & Reload
              </button>
            </div>
          )}
          {!(error as Error).message.includes('state') && (
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Check the Debug Info above and make sure the Redirect URI matches exactly in Auth0 dashboard.
            </p>
          )}
        </div>
      )}

      {!isLoading && (
        <>
          {isAuthenticated ? (
            <>
              <Profile />
              <div style={{ marginTop: '1.5rem' }}>
                <LogoutButton />
              </div>
            </>
          ) : (
            <div style={{ marginTop: '1.5rem' }}>
              <LoginButton />
              <p style={{ marginTop: '0.75rem' }}>
                Sign in using your Microsoft 365 / company account configured in Auth0.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
