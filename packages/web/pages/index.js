import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '@/lib/firebase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace('/auth/login');
        return;
      }
      // Fetch profile to check role and redirect appropriately
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/v3/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { router.replace('/auth/login'); return; }
      const profile = await res.json();
      router.replace((profile.isAdmin || profile.role === 'admin') ? '/admin' : '/dashboard');
    });
    return () => unsubscribe();
  }, [router]);

  return null;
}
