import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('sent');
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many requests. Please try again later.'
          : 'Failed to send reset email. Please try again.';
      setError(msg);
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        {/* Back link */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Sign In
        </Link>

        {status === 'sent' ? (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-5xl" style={{ color: '#00A3E0' }}>mark_email_read</span>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-3 text-sm text-gray-500">
              We sent a password reset link to{' '}
              <span className="font-medium text-gray-700">{email}</span>. Check your inbox and click the link to reset your password.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                onClick={() => setStatus('idle')}
                className="font-medium hover:underline"
                style={{ color: '#1183d4' }}
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
              <p className="mt-2 text-sm text-gray-500">
                Enter your North Highland email and we&apos;ll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@northhighland.com"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#1183d4' }}
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    Sending…
                  </span>
                ) : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}
