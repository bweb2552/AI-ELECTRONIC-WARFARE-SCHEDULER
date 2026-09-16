import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { isFirebaseConfigured } from '../firebase/config';

export function LoginPage() {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithDemo, 
    loading, 
    error, 
    clearError,
    user,
    demoEmail,
    demoPassword
  } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleGoogleLogin = async () => {
    clearError();
    await signInWithGoogle();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      await signUpWithEmail(email, password);
    } else {
      await signInWithEmail(email, password);
    }
  };

  const handleDemoLogin = async () => {
    clearError();
    await signInWithDemo();
  };

  const [formError, setError] = useState<string | null>(error);

  if (!isFirebaseConfigured) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', 
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-ui)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="login-grid-bg" />
        <div className="login-scanline" />
        
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '40px 20px',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '420px', 
            background: 'rgba(10, 14, 20, 0.85)', 
            border: '1px solid rgba(0, 212, 255, 0.15)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '40px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(0, 212, 255, 0.06)',
            backdropFilter: 'blur(24px)',
            position: 'relative',
            animation: 'loginCardIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.4), transparent)'
            }} />

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              marginBottom: '32px' 
            }}>
              <div style={{ 
                width: 72, 
                height: 72, 
                borderRadius: '18px', 
                background: 'linear-gradient(135deg, #00d4ff, #0088bb)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 0 40px rgba(0, 212, 255, 0.3), 0 0 80px rgba(0, 212, 255, 0.1)',
                animation: 'logoFloat 3s ease-in-out infinite'
              }}>
                <span style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontWeight: 900, 
                  fontSize: 26, 
                  color: 'var(--bg-primary)',
                  letterSpacing: '0.05em'
                }}>EW</span>
              </div>
              <h1 style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: 22, 
                fontWeight: 700, 
                color: 'var(--accent-cyan)', 
                letterSpacing: '0.12em',
                margin: '0 0 8px',
                textShadow: '0 0 20px rgba(0, 212, 255, 0.3)'
              }}>SMART-SCAN EW</h1>
              <p style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: 10, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em',
                margin: 0
              }}>Adaptive Receiver Scheduler</p>
            </div>

            <div style={{ 
              background: 'rgba(255, 184, 0, 0.06)', 
              border: '1px solid rgba(255, 184, 0, 0.3)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '16px', 
              marginBottom: '24px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--accent-amber)',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 12 }}>Firebase not configured</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                Authentication is unavailable. The simulation works without login. Configure Firebase environment variables to enable authentication.
              </div>
            </div>

            <button 
              onClick={() => navigate('/')} 
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 12, letterSpacing: '0.08em', fontWeight: 700 }}
            >
              CONTINUE TO SIMULATION
            </button>

            <p style={{ 
              marginTop: '32px', 
              fontFamily: 'var(--font-mono)', 
              fontSize: 9, 
              color: 'var(--text-muted)', 
              textAlign: 'center',
              lineHeight: 1.8,
              letterSpacing: '0.03em'
            }}>
              Smart Scan Strategy for Electronic Warfare
              <br/>
              Simulated RF environment · No real hardware connection
            </p>
          </div>
        </div>

        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-mono)', 
          fontSize: 9, 
          color: 'var(--text-muted)',
          letterSpacing: '0.05em'
        }}>
          v1.0.0
        </div>

        <style>{`
          @keyframes loginCardIn {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .login-grid-bg {
            position: fixed;
            inset: 0;
            background:
              linear-gradient(rgba(0, 212, 255, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.02) 1px, transparent 1px);
            background-size: 50px 50px;
            pointer-events: none;
            z-index: 0;
          }
          .login-scanline {
            position: fixed;
            inset: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.02) 2px,
              rgba(0, 0, 0, 0.02) 4px
            );
            pointer-events: none;
            z-index: 1;
          }
        `}</style>
      </div>
    );
  }

  // Redirect authenticated users away from login page
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-ui)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="login-grid-bg" />
      <div className="login-scanline" />

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '40px 20px',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '420px', 
          background: 'rgba(10, 14, 20, 0.85)', 
          border: '1px solid rgba(0, 212, 255, 0.15)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '40px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(0, 212, 255, 0.06)',
          backdropFilter: 'blur(24px)',
          position: 'relative',
          zIndex: 10,
          animation: 'loginCardIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.4), transparent)'
          }} />

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginBottom: '32px' 
          }}>
            <div style={{ 
              width: 72, 
              height: 72, 
              borderRadius: '18px', 
              background: 'linear-gradient(135deg, #00d4ff, #0088bb)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.3), 0 0 80px rgba(0, 212, 255, 0.1)',
              animation: 'logoFloat 3s ease-in-out infinite'
            }}>
              <span style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 900, 
                fontSize: 26, 
                color: 'var(--bg-primary)',
                letterSpacing: '0.05em'
              }}>EW</span>
            </div>
            <h1 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: 22, 
              fontWeight: 700, 
              color: 'var(--accent-cyan)', 
              letterSpacing: '0.12em',
              margin: '0 0 8px',
              textShadow: '0 0 20px rgba(0, 212, 255, 0.3)'
            }}>SMART-SCAN EW</h1>
            <p style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: 10, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.15em',
              margin: 0
            }}>Adaptive Receiver Scheduler</p>
          </div>

          {(formError || error) && (
            <div style={{ 
              background: 'rgba(255, 68, 68, 0.08)', 
              border: '1px solid rgba(255, 68, 68, 0.3)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '12px 16px', 
              marginBottom: '20px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{formError || error}</span>
              <button 
                onClick={clearError} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-red)', 
                  cursor: 'pointer', 
                  fontFamily: 'var(--font-mono)',
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                  marginLeft: '8px'
                }}
              >
                ×
              </button>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                width: '100%', 
                padding: '14px 20px', 
                fontFamily: 'var(--font-mono)', 
                fontSize: 12, 
                fontWeight: 500,
                color: 'var(--text-primary)',
                background: 'rgba(20, 30, 42, 0.8)', 
                border: '1px solid rgba(0, 212, 255, 0.12)', 
                borderRadius: 'var(--radius-sm)', 
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
                letterSpacing: '0.03em'
              }}
              onMouseOver={(e) => { if (!loading) { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.08)'; }}}
              onMouseOut={(e) => { if (!loading) { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.12)'; e.currentTarget.style.boxShadow = 'none'; }}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '24px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em'
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0, 212, 255, 0.08)' }}></div>
            <span style={{ textTransform: 'uppercase' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0, 212, 255, 0.08)' }}></div>
          </div>

          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontFamily: 'var(--font-mono)', 
                fontSize: 10, 
                color: 'var(--text-muted)', 
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                {isSignUp ? 'Email Address' : 'Email'}
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder={isSignUp ? 'Enter your email' : 'your@email.com'}
                disabled={loading}
                className="input"
                style={{ padding: '12px 16px', fontSize: 12 }}
                autoComplete={isSignUp ? 'email' : 'username'}
                required
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontFamily: 'var(--font-mono)', 
                fontSize: 10, 
                color: 'var(--text-muted)', 
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={isSignUp ? 'Min. 6 characters' : 'Enter password'}
                disabled={loading}
                className="input"
                style={{ padding: '12px 16px', fontSize: 12 }}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength={6}
              />
            </div>
            {isSignUp && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: 10, 
                  color: 'var(--text-muted)', 
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Confirm Password
                </label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder='Confirm password'
                  disabled={loading}
                  className="input"
                  style={{ padding: '12px 16px', fontSize: 12 }}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 12, letterSpacing: '0.08em', fontWeight: 700 }}
            >
              {loading ? 'PROCESSING...' : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
            </button>
          </form>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '20px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: 11, 
            color: 'var(--text-muted)' 
          }}>
            <span>{isSignUp ? 'Already have an account?' : 'Need an account?'}</span>
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); clearError(); }} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-cyan)', 
                cursor: 'pointer', 
                fontFamily: 'var(--font-mono)', 
                fontSize: 11, 
                fontWeight: 600,
                marginLeft: '8px',
                padding: 0,
                transition: 'color 0.15s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#66e5ff'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--accent-cyan)'; }}
              disabled={loading}
            >
              {isSignUp ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </div>

          {(demoEmail || demoPassword) && (
            <div style={{ 
              marginTop: '24px', 
              paddingTop: '24px', 
              borderTop: '1px solid rgba(0, 212, 255, 0.08)' 
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em'
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(0, 212, 255, 0.08)' }}></div>
                <span style={{ textTransform: 'uppercase' }}>DEMO ACCESS</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(0, 212, 255, 0.08)' }}></div>
              </div>
              <div style={{ 
                background: 'rgba(20, 30, 42, 0.5)', 
                border: '1px solid rgba(0, 212, 255, 0.08)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '14px',
                marginBottom: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-secondary)'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{demoEmail}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Password: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{demoPassword}</span>
                </div>
              </div>
              <button 
                onClick={handleDemoLogin} 
                disabled={loading}
                className="btn btn-ghost"
                style={{ width: '100%', padding: '12px', fontSize: 11, letterSpacing: '0.05em' }}
              >
                Use Demo Account
              </button>
            </div>
          )}

          <p style={{ 
            marginTop: '32px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: 9, 
            color: 'var(--text-muted)', 
            textAlign: 'center',
            lineHeight: 1.8,
            letterSpacing: '0.03em'
          }}>
            Smart Scan Strategy for Electronic Warfare
            <br/>
            Simulated RF environment · No real hardware connection
          </p>
        </div>
      </div>

      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono)', 
        fontSize: 9, 
        color: 'var(--text-muted)',
        letterSpacing: '0.05em'
      }}>
        v1.0.0
      </div>

      <style>{`
        @keyframes loginCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .login-grid-bg {
          position: fixed;
          inset: 0;
          background:
            linear-gradient(rgba(0, 212, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.02) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 0;
        }
        .login-scanline {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.02) 2px,
            rgba(0, 0, 0, 0.02) 4px
          );
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
