import React from 'react';
import Auth from '@/features/auth/pages/Auth';

export const metadata = {
  title: 'Sign In / Register - KSubZone Gateway',
  description: 'Access your account on KSubZone to manage your watchlist, favorites, and subtitles.',
};

export default function AuthPage() {
  return <Auth />;
}
