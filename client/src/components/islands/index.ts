import { withIslandProvider } from '../shared/IslandProvider';

import NavbarRaw from '@/components/layout/Navbar.jsx';
import FooterRaw from '@/components/layout/Footer.jsx';
import StickyAnchorAdRaw from '@/components/ads/StickyAnchorAd.jsx';
import ParticleBackgroundRaw from '@/components/layout/ParticleBackground.jsx';

import HomeRaw from '@/features/media/pages/Home.jsx';
import DetailRaw from '@/features/media/pages/Detail.jsx';
import WatchRaw from '@/features/media/pages/Watch.jsx';
import MoviesListRaw from '@/features/media/pages/MoviesList.jsx';
import DramasListRaw from '@/features/media/pages/DramasList.jsx';

import ArticlesRaw from '@/features/articles/pages/Articles.jsx';
import ArticleDetailRaw from '@/features/articles/pages/ArticleDetail.jsx';

import SearchRaw from '@/features/media/pages/Search.jsx';
import AuthRaw from '@/features/auth/pages/Auth.jsx';
import ProfileRaw from '@/features/auth/pages/Profile.jsx';
import ContactFormRaw from '@/components/ui/ContactForm.jsx';

export const Navbar = withIslandProvider(NavbarRaw);
export const Footer = withIslandProvider(FooterRaw);
export const StickyAnchorAd = withIslandProvider(StickyAnchorAdRaw);
export const ParticleBackground = withIslandProvider(ParticleBackgroundRaw);

export const Home = withIslandProvider(HomeRaw);
export const Detail = withIslandProvider(DetailRaw);
export const Watch = withIslandProvider(WatchRaw);
export const MoviesList = withIslandProvider(MoviesListRaw);
export const DramasList = withIslandProvider(DramasListRaw);

export const Articles = withIslandProvider(ArticlesRaw);
export const ArticleDetail = withIslandProvider(ArticleDetailRaw);

export const Search = withIslandProvider(SearchRaw);
export const Auth = withIslandProvider(AuthRaw);
export const Profile = withIslandProvider(ProfileRaw);
export const ContactForm = withIslandProvider(ContactFormRaw);
