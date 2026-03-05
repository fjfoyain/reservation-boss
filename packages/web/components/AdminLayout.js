import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/users', label: 'User Management', icon: 'group' },
  { href: '/admin/requests', label: 'Pending Requests', icon: 'schedule' },
  { href: '/admin/reports', label: 'Reports', icon: 'bar_chart' },
  { href: '/admin/parking', label: 'Parking Config', icon: 'local_parking' },
  { href: '/admin/rooms', label: 'Room Management', icon: 'meeting_room' },
  { divider: true },
  { href: '/dashboard', label: 'My Schedule', icon: 'calendar_month' },
  { href: '/rooms', label: 'Book a Room', icon: 'meeting_room' },
];

export default function AdminLayout({ children, title = 'Admin' }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth/login'); return; }
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/v3/profile', { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) { router.replace('/auth/login'); return; }
      const profile = await res.json();
      if (profile.role !== 'admin') { router.replace('/dashboard'); return; }
      setUser(profile);
    });
    return () => unsubscribe();
  }, [router]);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <span className="material-symbols-outlined text-5xl text-gray-300 animate-spin">progress_activity</span>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
    </div>
  );

  const currentPath = router.pathname;

  return (
    <div className="relative flex min-h-screen w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eaf4fd' }}>
            <span className="material-symbols-outlined font-bold" style={{ color: '#1183d4' }}>domain</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">North Highland</h1>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item, i) => {
            if (item.divider) return <hr key={`divider-${i}`} className="my-2 border-gray-100" />;
            const { href, label, icon } = item;
            const isActive = currentPath === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-v3-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                style={isActive ? { backgroundColor: '#eaf4fd' } : {}}
              >
                <span className="material-symbols-outlined text-[20px]" style={isActive ? { color: '#1183d4' } : { color: '#6b7280' }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-2 text-xs text-gray-400 truncate">{user.name}</div>
          <button
            onClick={() => signOut(auth).then(() => router.push('/auth/login'))}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-500">logout</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-4 bg-white md:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-gray-500">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
