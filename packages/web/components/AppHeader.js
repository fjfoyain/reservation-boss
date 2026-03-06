import { useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
  { href: '/rooms', label: 'Rooms', key: 'rooms' },
  { href: '/my-bookings', label: 'My Bookings', key: 'my-bookings' },
  { href: '/my-requests', label: 'My Requests', key: 'my-requests' },
];

/**
 * Shared top navigation bar for all user-facing pages.
 * @param {object}   user       - User profile (name, isAdmin, role)
 * @param {string}   activePage - Key of the current page (matches NAV_LINKS[].key)
 * @param {function} onSignOut  - Called when the user clicks Logout
 */
export default function AppHeader({ user, activePage, onSignOut }) {
  const isAdmin = user?.isAdmin || user?.role === 'admin';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined" style={{ color: '#112A46' }}>domain</span>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#112A46' }}>NORTH HIGHLAND</span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center space-x-6">
            {NAV_LINKS.map(({ href, label, key }) =>
              key === activePage ? (
                <span
                  key={key}
                  className="text-sm font-medium border-b-2 pb-1"
                  style={{ color: '#00A3E0', borderColor: '#00A3E0' }}
                >
                  {label}
                </span>
              ) : (
                <Link
                  key={key}
                  href={href}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {label}
                </Link>
              )
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-md text-white transition-colors"
                style={{ backgroundColor: '#112A46' }}
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                Admin
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Welcome (desktop only) */}
            {user?.name && (
              <span className="text-sm hidden md:block">
                <span className="text-gray-500">Welcome, </span>
                <span className="font-medium text-gray-900">{user.name}</span>
              </span>
            )}
            {/* Logout (desktop only) */}
            <button
              onClick={onSignOut}
              className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Logout</span>
            </button>
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-20 md:hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              {user?.name && (
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
              )}
              {user?.email && (
                <p className="text-xs text-gray-500">{user.email}</p>
              )}
            </div>
            <nav className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(({ href, label, key }) => (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    key === activePage
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#112A46' }}
                >
                  <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                  Admin Panel
                </Link>
              )}
            </nav>
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => { setMobileOpen(false); onSignOut(); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
