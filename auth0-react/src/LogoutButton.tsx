import { useAuth0 } from "@auth0/auth0-react";

const LogoutButton = () => {
  const { logout } = useAuth0();
  // Ensure valid URI without trailing slash
  const returnTo = window.location.origin.endsWith('/') 
    ? window.location.origin.slice(0, -1) 
    : window.location.origin;
  
  return (
    <button
      onClick={() => logout({ logoutParams: { returnTo } })}
      className="button logout"
    >
      Log Out
    </button>
  );
};

export default LogoutButton;
