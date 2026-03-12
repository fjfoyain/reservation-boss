import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const { email: prefillEmail = '' } = router.query;

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();

      // Fetch user profile to determine where to redirect
      const res = await fetch('/api/v3/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError('Account not found. Please contact your administrator.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const profile = await res.json();
      if (profile.isAdmin || profile.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Sign in failed. Please try again.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-v3-blue" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
          </svg>
          <span className="text-lg font-bold text-gray-900">North Highland</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-6 relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/5 -right-1/10 w-1/2 h-1/2 rounded-full bg-blue-50 blur-3xl opacity-60" />
          <div className="absolute bottom-1/10 -left-1/10 w-2/5 h-2/5 rounded-full bg-blue-100 blur-3xl opacity-40" />
        </div>

        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 p-8 z-10">
          {/* Icon + title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#eaf4fd' }}>
              <span className="material-symbols-outlined text-3xl" style={{ color: '#1183d4' }}>login</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-center">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-2 text-center">
              Sign in to access attendance and parking reservations.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-gray-400 pointer-events-none text-xl">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@northhighland.com"
                  className="w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:border-v3-blue transition-colors"
                  style={{ '--tw-ring-color': '#1183d4' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-gray-400 pointer-events-none text-xl">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:border-v3-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium hover:underline"
                style={{ color: '#1183d4' }}
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-12 rounded-lg text-white text-base font-semibold flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-60"
              style={{ backgroundColor: loading ? '#5fa1d7' : '#1183d4' }}
            >
              {loading ? (
                <>
                  <span className="css-spinner-sm"></span>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
            Need access?{' '}
            <span className="font-medium text-gray-700">Contact your administrator to receive an invitation.</span>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} North Highland. Internal use only.
      </footer>

      {/* Google Material Symbols */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}
