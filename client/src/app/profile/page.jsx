'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Profile from '@/features/auth/pages/Profile';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-screen bg-transparent flex items-center justify-center text-brand-primary text-xl font-black uppercase tracking-wider">
        Loading Session...
      </div>
    );
  }

  return <Profile />;
}
