// Shared navigation bar for People Lead pages
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function PLNav({ token }) {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/approvals?status=pending', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setPendingCount(data.length))
      .catch(() => {});
  }, [token]);

  const isActive = (path) => router.pathname === path;

  const navBtn = (label, path, badge) => (
    <button
      onClick={() => router.push(path)}
      className={`relative flex items-center px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
        isActive(path)
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2">
          {navBtn('Dashboard', '/admin/pl-dashboard', 0)}
          {navBtn('Approvals', '/admin/approvals', pendingCount)}
        </nav>
      </div>
    </div>
  );
}
