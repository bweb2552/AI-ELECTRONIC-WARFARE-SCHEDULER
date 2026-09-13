import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-ui)'
      }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: '50%', 
          border: '3px solid var(--border-primary)', 
          borderTopColor: 'var(--accent-cyan)', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <p style={{ 
          marginTop: '16px', 
          fontFamily: 'var(--font-mono)', 
          fontSize: 12, 
          color: 'var(--text-muted)' 
        }}>Verifying authentication...</p>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}