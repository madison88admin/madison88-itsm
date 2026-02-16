import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Auth0Provider } from '@auth0/auth0-react'

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
// Allow override via env, otherwise use current origin (includes port)
// Ensure we have a valid URI - remove trailing slashes
const getRedirectUri = () => {
  const envUri = import.meta.env.VITE_AUTH0_REDIRECT_URI;
  if (envUri) {
    return envUri.endsWith('/') ? envUri.slice(0, -1) : envUri;
  }
  const origin = window.location.origin;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};
const redirectUri = getRedirectUri();

if (!domain || !clientId) {
  throw new Error('Missing Auth0 configuration. Please check your .env file.');
}

console.log('Auth0 Configuration:', {
  domain,
  clientId,
  redirectUri,
  currentOrigin: window.location.origin
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        // Optional: Uncomment to force Microsoft 365 login
        // connection: 'windowslive',
        // Or use your custom Auth0 connection name for Microsoft 365
        // connection: 'your-microsoft-365-connection-name',
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
