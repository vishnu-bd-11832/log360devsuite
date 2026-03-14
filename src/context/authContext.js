import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { loadSession, clearSession } from "services/zohoAuth";

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the application and exposes auth state to all children.
 *
 * State shape:
 *  user    — Zoho user-info object ({ Email, First_Name, Last_Name, Display_Name, … })
 *            or null when signed out
 *  token   — Zoho access token string, or null
 *  loading — true while the stored session is being hydrated from sessionStorage
 *
 * Actions:
 *  signIn(user, token)  — called by the OAuth callback on successful authentication
 *  signOut()            — clears the session and resets state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate session from sessionStorage on first render
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
    }
    setLoading(false);
  }, []);

  const signIn = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
  };

  const signOut = () => {
    clearSession();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * useAuth — consume the auth context.
 * Must be called inside a component rendered within <AuthProvider>.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
