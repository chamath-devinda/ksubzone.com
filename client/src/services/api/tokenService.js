export const tokenService = {
  getUserToken: () => typeof window !== 'undefined' ? localStorage.getItem('kd_token') : null,
  setUserToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('kd_token', token);
      else localStorage.removeItem('kd_token');
    }
  },
  removeUserToken: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('kd_token');
  },
  
  getAdminToken: () => typeof window !== 'undefined' ? localStorage.getItem('kd_admin_token') : null,
  setAdminToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('kd_admin_token', token);
      else localStorage.removeItem('kd_admin_token');
    }
  },
  removeAdminToken: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('kd_admin_token');
  },

  getUserProfile: () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('kd_user_profile');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  setUserProfile: (profile) => {
    if (typeof window !== 'undefined') {
      if (profile) localStorage.setItem('kd_user_profile', JSON.stringify(profile));
      else localStorage.removeItem('kd_user_profile');
    }
  },
  removeUserProfile: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('kd_user_profile');
  },

  getAdminProfile: () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('kd_admin_profile');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  setAdminProfile: (profile) => {
    if (typeof window !== 'undefined') {
      if (profile) localStorage.setItem('kd_admin_profile', JSON.stringify(profile));
      else localStorage.removeItem('kd_admin_profile');
    }
  },
  removeAdminProfile: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('kd_admin_profile');
  },
  
  clearAllTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kd_token');
      localStorage.removeItem('kd_admin_token');
      localStorage.removeItem('kd_user_profile');
      localStorage.removeItem('kd_admin_profile');
    }
  }
};
