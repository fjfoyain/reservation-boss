import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { token } = router.query;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteId, setInviteId] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error | success
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/v3/auth/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus('error');
          setError(data.error);
        } else {
          setEmail(data.email);
          setInviteId(data.inviteId);
          setStatus('ready');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Failed to validate invitation link.');
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v3/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setSubmitting(false);
        return;
      }
      setStatus('success');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header banner */}
        <div className="p-8 text-center border-b-4" style={{ backgroundColor: '#112A46', borderColor: '#00A3E0' }}>
          <h1 className="text-3xl font-bold text-white tracking-tight">NORTH HIGHLAND</h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-wider" style={{ color: '#00A3E0' }}>
            Workspace Portal
          </p>
        </div>

        <div className="p-8">
          {/* Loading state */}
          {status === 'loading' && (
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
              <p className="mt-3">Validating your invitation…</p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-5xl text-red-400">link_off</span>
              <h2 className="mt-4 text-xl font-bold text-gray-900">Invalid Invitation</h2>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <p className="mt-4 text-sm text-gray-500">
                Please ask your administrator to send a new invitation link.
              </p>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-5xl" style={{ color: '#03543F' }}>check_circle</span>
              <h2 className="mt-4 text-xl font-bold text-gray-900">Account Created!</h2>
              <p className="mt-2 text-sm text-gray-500">
                Your account has been set up. You can now sign in.
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: '#1183d4' }}
              >
                Go to Sign In
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          )}

          {/* Registration form */}
          {status === 'ready' && (
            <>
              <h2 className="text-2xl font-bold mb-2 text-center text-gray-900">Create your account</h2>
              <p className="text-gray-500 text-center mb-8 text-sm">
                Set up your name and password to get started.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
                      person
                    </span>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
                      mail
                    </span>
                    <input
                      id="email"
                      type="email"
                      readOnly
                      value={email}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Email is linked to your invitation.</p>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
                    style={{ backgroundColor: '#1183d4' }}
                  >
                    {submitting ? 'Creating account…' : 'Create Account'}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium hover:underline" style={{ color: '#1183d4' }}>
                    Log In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-200">
          Secure employee portal • North Highland Internal Use Only
        </div>
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}
