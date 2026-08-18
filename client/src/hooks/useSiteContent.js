import { useContext } from 'react';
import { SiteContentContext } from '@/contexts/SiteContentContext';

export const useSiteContent = () => {
  const context = useContext(SiteContentContext);
  if (context === undefined) {
    throw new Error('useSiteContent must be used within a SiteContentProvider');
  }
  return context;
};
export default useSiteContent;
