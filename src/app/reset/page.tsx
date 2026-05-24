'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, KeyRound, Mail, Lock, Key } from 'lucide-react';

function ResetPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Client-side strength check
  const [strength, setStrength] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    special: false,
    score: 0,
  });

  // Fetch CSRF token on mount
  useEffect(() => {
    async function fetchCsrf() {
      try {
        const res = await fetch('/api/auth/csrf');
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (err) {
        console.error('Failed to initialize CSRF token', err);
      }
    }
    fetchCsrf();
  }, []);

  // Update password strength
  useEffect(() => {
    const checks = {
      length: password.length >= 12,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    let score = 0;
    if (password.length > 0) {
      score += checks.length ? 1 : 0;
      score += checks.upper ? 1 : 0;
      score += checks.lower ? 1 : 0;
      score += checks.digit ? 1 : 0;
      score += checks.special ? 1 : 0;
    }

    setStrength({ ...checks, score });
  }, [password]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
      setError('Security token not initialized. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to request reset link.');
      }

      setSuccess(
        data.message || 'If that email is registered, a password reset link has been sent to it. For developers, check the server console for the generated token URL!'
      );
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
      setError('Security token not initialized. Please refresh the page.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (strength.score < 5) {
      setError('Password does not meet the minimum security strength criteria.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to reset password.');
      }

      setSuccess('Your passphrase has been updated and your account is unlocked! Redirecting to login vault...');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (strength.score <= 2) return 'var(--color-error)';
    if (strength.score <= 4) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-header">
          <div className="brand-title" style={{ justifyContent: 'center', marginBottom: '1.5rem', fontSize: '2.5rem' }}>
            KOLO<span>KEPT</span>
          </div>
          <h1>{token ? 'Reset Passphrase' : 'Vault Recovery'}</h1>
          <p>
            {token
              ? 'Authorize a new passphrase to unlock your secure vault.'
              : 'Initiate a recovery flow to resolve account lockouts.'}
          </p>
        </div>

        <div className="glass-card">
          {error && (
            <div className="alert alert-error">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{success}</div>
            </div>
          )}

          {token ? (
            /* EXECUTE RESET FORM */
            <form onSubmit={handleExecuteReset}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">New Passphrase (Min 12 Characters)</label>
                <div className="input-wrapper">
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter highly secure passphrase"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength meter UI */}
                {password.length > 0 && (
                  <div className="pw-strength-container">
                    <div className="pw-strength-bar-bg">
                      <div
                        className="pw-strength-bar-fill"
                        style={{
                          width: `${(strength.score / 5) * 100}%`,
                          backgroundColor: getStrengthColor(),
                        }}
                      />
                    </div>
                    <div className="pw-strength-label">
                      <span>Passphrase Quality</span>
                      <span>{strength.score}/5 rules</span>
                    </div>

                    {/* Visual checklist */}
                    <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', listStyle: 'none', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      <li style={{ color: strength.length ? 'var(--color-success)' : 'inherit' }}>
                        {strength.length ? '✓' : '○'} 12+ Characters
                      </li>
                      <li style={{ color: strength.upper ? 'var(--color-success)' : 'inherit' }}>
                        {strength.upper ? '✓' : '○'} Uppercase Letter
                      </li>
                      <li style={{ color: strength.lower ? 'var(--color-success)' : 'inherit' }}>
                        {strength.lower ? '✓' : '○'} Lowercase Letter
                      </li>
                      <li style={{ color: strength.digit ? 'var(--color-success)' : 'inherit' }}>
                        {strength.digit ? '✓' : '○'} Number
                      </li>
                      <li style={{ color: strength.special ? 'var(--color-success)' : 'inherit' }}>
                        {strength.special ? '✓' : '○'} Special Symbol
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="confirm-password">Confirm Passphrase</label>
                <div className="input-wrapper">
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter new passphrase"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '2.75rem' }}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Re-keying Vault...' : 'Set New Passphrase'}
              </button>
            </form>
          ) : (
            /* REQUEST RESET FORM */
            <form onSubmit={handleRequestReset}>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="email">Secure Identifier (Email)</label>
                <div className="input-wrapper">
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.75rem' }}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Generating Link...' : 'Request Recovery Link'}
              </button>
            </form>
          )}
        </div>

        <div className="auth-footer">
          Return to{' '}
          <Link href="/login" className="btn-link">
            Login Vault
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-box" style={{ textAlign: 'center' }}>
          <div className="brand-title" style={{ justifyContent: 'center', marginBottom: '1.5rem', fontSize: '2.5rem' }}>
            KOLO<span>KEPT</span>
          </div>
          <p>Loading security modules...</p>
        </div>
      </div>
    }>
      <ResetPageContent />
    </Suspense>
  );
}
