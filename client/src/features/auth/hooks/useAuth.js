import { useContext } from 'react';
import { AuthContext } from '@/features/auth/context/AuthContext';

const DEFAULT_AUTH = {
  user: null,
  admin: null,
  loading: false,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => ({}),
  loginAdmin: async () => ({}),
  logoutAdmin: async () => ({}),
  changePassword: async () => ({}),
  updateProfile: async () => ({}),
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return DEFAULT_AUTH;
  }
  return context;
};

