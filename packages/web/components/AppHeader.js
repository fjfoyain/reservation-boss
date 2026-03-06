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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined" style={{ color: '#112A46' }}>domain</span>
          <span className="text-lg font-bold tracking-tight" style={{ color: '#112A46' }}>NORTH HIGHLAND</span>
        </div>

        {/* Nav links */}
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

        {/* Right side: welcome + logout */}
        <div className="flex items-center gap-4">
          {user?.name && (
            <span className="text-sm hidden sm:block">
              <span className="text-gray-500">Welcome, </span>
              <span className="font-medium text-gray-900">{user.name}</span>
            </span>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
