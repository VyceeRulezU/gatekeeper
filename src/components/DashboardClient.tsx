'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PiggyBank, 
  Trash2, 
  Plus, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  FileText,
  Lock,
  LockKeyholeOpen
} from 'lucide-react';

interface Entry {
  id: string;
  amount: number;
  note: string;
  date: string;
}

export default function DashboardClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const targetGoal = 5000; // Hardcoded default target savings goal

  // Fetch CSRF and initial savings entries
  useEffect(() => {
    async function initDashboard() {
      try {
        // Fetch CSRF
        const csrfRes = await fetch('/api/auth/csrf');
        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          setCsrfToken(csrfData.csrfToken);
        }

        // Fetch Savings
        const savingsRes = await fetch('/api/savings');
        if (savingsRes.ok) {
          const savingsData = await savingsRes.json();
          setEntries(savingsData.entries);
          setTotalSaved(savingsData.totalSaved);
        }
      } catch (err) {
        console.error('Failed to initialize dashboard context', err);
        setError('Failed to establish secure session parameters.');
      }
    }
    initDashboard();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
      setError('CSRF parameter missing. Please refresh page.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    if (!note.trim()) {
      setError('Note is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          amount: parsedAmount,
          note: note.trim(),
          date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to record entry.');
      }

      // Prepend entry and update sum
      setEntries([data, ...entries]);
      setTotalSaved((prev) => prev + parsedAmount);
      setSuccess('Saving recorded in the vault!');
      setAmount('');
      setNote('');
      
      // Auto clear success
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string, amountToDelete: number) => {
    if (!csrfToken) {
      setError('CSRF parameter missing.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this entry from the vault?')) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/savings?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete entry.');
      }

      setEntries(entries.filter((entry) => entry.id !== id));
      setTotalSaved((prev) => Math.max(0, prev - amountToDelete));
      setSuccess('Entry deleted from vault.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    if (!csrfToken) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleLogoutEverywhere = async () => {
    if (!csrfToken) return;
    if (
      !confirm(
        'Are you sure you want to invalidate ALL sessions globally? You will be immediately logged out of all other devices.'
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/logout-everywhere', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to terminate all sessions.');
      }

      setSuccess('All active sessions invalidated. Relocating to login vault...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const progressPercentage = Math.min(100, (totalSaved / targetGoal) * 100);

  return (
    <>
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="brand-title">
          <PiggyBank size={24} style={{ color: 'var(--neon-cyan)' }} />
          KOLO<span>KEPT</span>
        </div>
        <div className="nav-actions">
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Lock size={14} /> Lock Vault
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="dashboard-grid">
        {/* Left Column: Savings Widgets & List */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Total Saved Widget */}
          <div className="glass-card vault-widget">
            <span className="vault-label">Total Vault Deposits</span>
            <span className="vault-amount">
              ${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            {/* Goal Progress */}
            <div className="goal-container">
              <div className="goal-header">
                <span>Savings Target Progress</span>
                <span>
                  {progressPercentage.toFixed(0)}% (${totalSaved.toFixed(0)} / ${targetGoal})
                </span>
              </div>
              <div className="goal-bar-bg">
                <div 
                  className="goal-bar-fill" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Savings List Widget */}
          <div className="glass-card">
            <div className="entries-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Vault Ledgers</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {entries.length} Record{entries.length !== 1 ? 's' : ''}
              </span>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                <ShieldAlert size={16} />
                <div>{error}</div>
              </div>
            )}

            {success && (
              <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                <ShieldCheck size={16} />
                <div>{success}</div>
              </div>
            )}

            {entries.length === 0 ? (
              <div className="empty-state">
                <PiggyBank size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                <h3>No recorded savings</h3>
                <p>Your digital vault ledger is empty. Deposit your first coin using the panel.</p>
              </div>
            ) : (
              <div className="entries-table-wrapper">
                <table className="entries-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Note</th>
                      <th>Deposit Date</th>
                      <th style={{ width: '40px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="entry-amount">
                          +${entry.amount.toFixed(2)}
                        </td>
                        <td className="entry-note" title={entry.note}>
                          {entry.note}
                        </td>
                        <td className="entry-date">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteEntry(entry.id, entry.amount)}
                            className="entry-delete-btn"
                            title="Delete entry from vault"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Add Entry & Lockout Options */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Add Savings Entry */}
          <div className="glass-card add-entry-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} style={{ color: 'var(--neon-cyan)' }} /> Deposit Savings
            </h2>

            <form onSubmit={handleAddEntry}>
              <div className="form-group">
                <label className="form-label" htmlFor="amount">Deposit Amount ($)</label>
                <div className="input-wrapper">
                  <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note">Savings Note</label>
                <div className="input-wrapper">
                  <FileText size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="note"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Birthday gift, Piggy Bank feed"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                    maxLength={100}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="date">Deposit Date</label>
                <div className="input-wrapper">
                  <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="date"
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Processing Deposit...' : 'Deposit Coins'}
              </button>
            </form>
          </div>

          {/* Hardened Vault controls */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LockKeyholeOpen size={20} style={{ color: 'var(--neon-purple)' }} /> Vault Lockout Panel
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              If you suspect session hijacking, or have left your account logged in elsewhere, you can immediately invalidate all active sessions globally.
            </p>

            <button 
              onClick={handleLogoutEverywhere}
              className="btn btn-danger" 
              style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <LogOut size={16} /> Log Out Everywhere
            </button>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        Kolo Kept Cryptographic Personal Savings Ledger &copy; 2026. Hardened Authentication System.
      </footer>
    </>
  );
}
