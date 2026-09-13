import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { auth, isFirebaseConfigured, demoEmail, demoPassword, validationErrors } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithDemo: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  demoEmail: string;
  demoPassword: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      setAuthReady(true);
      if (validationErrors) {
        setError(validationErrors);
      }
      return;
    }

    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      if (!mounted) return;
      setUser(currentUser);
      setLoading(false);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const handleAuthError = (err: unknown): string => {
    if (err instanceof Error) {
      const code = (err as any).code;
      switch (code) {
        case 'auth/invalid-email':
          return 'Invalid email address';
        case 'auth/user-disabled':
          return 'This account has been disabled';
        case 'auth/user-not-found':
          return 'No account found with this email';
        case 'auth/wrong-password':
          return 'Incorrect password';
        case 'auth/email-already-in-use':
          return 'An account with this email already exists';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters';
        case 'auth/popup-closed-by-user':
          return 'Sign-in popup was closed';
        case 'auth/cancelled-popup-request':
          return 'Sign-in was cancelled';
        case 'auth/network-request-failed':
          return 'Network error. Please check your connection';
        case 'auth/too-many-requests':
          return 'Too many attempts. Please try again later';
        case 'auth/unauthorized-domain':
          return 'This domain is not authorized for OAuth. Check Firebase console';
        default:
          return err.message;
      }
    }
    return 'An unexpected error occurred';
  };

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured. Check environment variables.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured. Check environment variables.');
      return;
    }
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured. Check environment variables.');
      return;
    }
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithDemo = useCallback(async () => {
    if (!demoEmail || !demoPassword) {
      setError('Demo credentials not configured. Check VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth!, demoEmail, demoPassword);
    } catch (err) {
      setError(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      setError(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading: loading || !authReady, 
      error, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      signInWithDemo, 
      logout, 
      clearError,
      demoEmail,
      demoPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}