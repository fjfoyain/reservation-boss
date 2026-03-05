import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '@/lib/firebase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Blank screen while redirecting
  return null;
}
