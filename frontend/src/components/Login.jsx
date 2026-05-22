import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

function Login({ onLogin, isOffline }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sendTokenToBackend = async (idToken) => {
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken })
      });
      
      if (res.ok) {
        const worker = await res.json();
        localStorage.setItem('workerId', worker.id);
        localStorage.setItem('worker', JSON.stringify(worker));
        onLogin(worker);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Login failed on server');
      }
    } catch (err) {
      console.error('Backend login error', err);
      setErrorMsg('Network error while connecting to server.');
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    if (isOffline) {
      alert('Authentication requires an active internet connection.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      const idToken = await userCredential.user.getIdToken();
      await sendTokenToBackend(idToken);
    } catch (err) {
      console.error('Email Auth Error', err);
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyErrorMessage = (error) => {
    if (!error) return 'Authentication failed. Please try again.';
    const code = error.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password. Please verify your credentials and try again.';
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please log in or use a different email.';
      case 'auth/weak-password':
        return 'The password is too weak. It must be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      case 'auth/user-disabled':
        return 'This user account has been disabled. Please contact support.';
      default:
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('user-not-found')) {
          return 'Incorrect email or password. Please verify your credentials and try again.';
        }
        if (msg.includes('email-already-in-use')) {
          return 'This email address is already registered. Please log in or use a different email.';
        }
        if (msg.includes('weak-password')) {
          return 'The password is too weak. It must be at least 6 characters long.';
        }
        return error.message || 'Authentication failed. Please try again.';
    }
  };

  const handleGoogleAuth = async () => {
    if (isOffline) {
      alert('Authentication requires an active internet connection.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      await sendTokenToBackend(idToken);
    } catch (err) {
      console.error('Google Auth Error', err);
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <section className="glass-card animate-fade-in" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>🌾</span>
          <h1 style={{ color: 'var(--primary-color)' }}>Gramsakhi</h1>
          <p style={{ color: 'var(--text-muted)' }}>{isSignUp ? 'Create ASHA Worker Account' : 'ASHA Worker Portal Login'}</p>
        </div>

        <form onSubmit={handleEmailAuth}>
          {errorMsg && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>{errorMsg}</p>}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="e.g. asha@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginBottom: '1rem' }}>
            {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up' : 'Secure Login')}
          </button>
        </form>

        <button onClick={handleGoogleAuth} className="btn" disabled={loading} style={{ width: '100%', marginBottom: '1rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ccc' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', marginRight: '8px', verticalAlign: 'middle' }} />
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}>
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default Login;
