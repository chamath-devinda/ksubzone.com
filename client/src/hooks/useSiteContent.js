import { useContext } from 'react';
import { SiteContentContext } from '@/contexts/SiteContentContext';
import { defaultSiteContent } from '@/config/siteContent';

const DEFAULT_SITE_CONTENT_STATE = {
  content: defaultSiteContent,
  loading: false,
  error: null,
  refresh: async () => {},
};

export const useSiteContent = () => {
  const context = useContext(SiteContentContext);
  if (context === undefined) {
    return DEFAULT_SITE_CONTENT_STATE;
  }
  return context;
};
export default useSiteContent;

