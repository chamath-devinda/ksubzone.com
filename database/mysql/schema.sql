CREATE DATABASE IF NOT EXISTS kdramaverse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kdramaverse;

CREATE TABLE IF NOT EXISTS movies (
  id CHAR(24) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  original_title VARCHAR(255),
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  synopsis_rewrite TEXT,
  story_overview TEXT,
  cast_overview TEXT,
  poster TEXT,
  banner TEXT,
  backdrops JSON,
  release_date DATETIME NULL,
  runtime INT,
  country VARCHAR(16),
  language VARCHAR(16),
  production_companies JSON,
  tmdb_rating DECIMAL(7,3) DEFAULT 0,
  imdb_rating DECIMAL(7,3) DEFAULT 0,
  trailer TEXT,
  keywords JSON,
  collection_info JSON,
  images JSON,
  related_titles JSON,
  cast JSON,
  crew JSON,
  director VARCHAR(255),
  writers JSON,
  studio VARCHAR(255),
  view_count INT DEFAULT 0,
  status ENUM('Published','Draft') DEFAULT 'Published',
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  tmdb_id INT UNIQUE,
  ai_seo_description TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  seo_keywords JSON,
  faq JSON,
  schema_markup JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY movies_search_idx (title, original_title, description),
  KEY movies_status_idx (status),
  KEY movies_rating_idx (imdb_rating, tmdb_rating),
  KEY movies_views_idx (view_count),
  KEY movies_tmdb_idx (tmdb_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dramas (
  id CHAR(24) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  original_title VARCHAR(255),
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  synopsis_rewrite TEXT,
  story_overview TEXT,
  cast_overview TEXT,
  series_overview TEXT,
  poster TEXT,
  banner TEXT,
  backdrops JSON,
  release_date DATETIME NULL,
  runtime INT,
  country VARCHAR(16),
  language VARCHAR(16),
  production_companies JSON,
  tmdb_rating DECIMAL(7,3) DEFAULT 0,
  imdb_rating DECIMAL(7,3) DEFAULT 0,
  trailer TEXT,
  keywords JSON,
  images JSON,
  cast JSON,
  crew JSON,
  director VARCHAR(255),
  writers JSON,
  studio VARCHAR(255),
  view_count INT DEFAULT 0,
  status ENUM('Published','Draft') DEFAULT 'Published',
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  tmdb_id INT UNIQUE,
  ai_seo_description TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  seo_keywords JSON,
  faq JSON,
  schema_markup JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY dramas_search_idx (title, original_title, description),
  KEY dramas_status_idx (status),
  KEY dramas_rating_idx (imdb_rating, tmdb_rating),
  KEY dramas_views_idx (view_count),
  KEY dramas_tmdb_idx (tmdb_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seasons (
  id CHAR(24) PRIMARY KEY,
  drama_id CHAR(24) NOT NULL,
  season_number INT NOT NULL,
  season_description TEXT,
  season_poster TEXT,
  air_date DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY seasons_drama_number_unique (drama_id, season_number),
  KEY seasons_drama_idx (drama_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS episodes (
  id CHAR(24) PRIMARY KEY,
  drama_id CHAR(24) NOT NULL,
  season_id CHAR(24) NOT NULL,
  episode_number INT NOT NULL,
  episode_title VARCHAR(255) NOT NULL,
  episode_description TEXT,
  episode_thumbnail TEXT,
  air_date DATETIME NULL,
  runtime INT,
  trailer TEXT,
  video_url TEXT,
  ai_episode_summary TEXT,
  episode_schema_markup JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY episodes_season_number_unique (season_id, episode_number),
  KEY episodes_drama_idx (drama_id),
  KEY episodes_season_idx (season_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(24) PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(120),
  reset_password_token VARCHAR(120),
  reset_password_expires DATETIME NULL,
  favorites JSON,
  watchlist JSON,
  continue_watching JSON,
  two_factor_secret VARCHAR(255),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  status ENUM('active','suspended') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(24) PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(24) PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id CHAR(24) NOT NULL,
  permission_id CHAR(24) NOT NULL,
  PRIMARY KEY (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id CHAR(24) PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id CHAR(24) NOT NULL,
  two_factor_secret VARCHAR(255),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY admins_role_idx (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS genres (
  id CHAR(24) PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(160) NOT NULL UNIQUE,
  tmdb_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subtitles (
  id CHAR(24) PRIMARY KEY,
  media_id CHAR(24) NOT NULL,
  media_type ENUM('Movie','Drama','Episode') NOT NULL,
  language VARCHAR(80) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0',
  uploader_id CHAR(24) NOT NULL,
  file_url TEXT NOT NULL,
  format VARCHAR(12) NOT NULL,
  downloads INT DEFAULT 0,
  rating DECIMAL(4,2) DEFAULT 0,
  ratings JSON,
  approval_status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  release_notes TEXT,
  moderator_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY subtitles_media_idx (media_id),
  KEY subtitles_uploader_idx (uploader_id),
  KEY subtitles_approval_idx (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(24) PRIMARY KEY,
  media_id CHAR(24) NOT NULL,
  media_type ENUM('Movie','Drama') NOT NULL,
  user_id CHAR(24) NOT NULL,
  rating INT NOT NULL,
  content TEXT NOT NULL,
  likes JSON,
  status ENUM('Approved','Pending','Rejected') DEFAULT 'Approved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY reviews_media_idx (media_id),
  KEY reviews_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id CHAR(24) PRIMARY KEY,
  target_id CHAR(24) NOT NULL,
  target_type ENUM('Movie','Drama','Episode','Review','Subtitle') NOT NULL,
  user_id CHAR(24) NOT NULL,
  content TEXT NOT NULL,
  likes JSON,
  replies JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY comments_target_idx (target_id),
  KEY comments_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id CHAR(24) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  content LONGTEXT NOT NULL,
  category VARCHAR(120) DEFAULT 'Guide',
  cover_image TEXT,
  author_name VARCHAR(160) DEFAULT 'KDramaVerse Editorial',
  read_time INT DEFAULT 5,
  status ENUM('Published','Draft') DEFAULT 'Draft',
  is_featured BOOLEAN DEFAULT FALSE,
  tags JSON,
  related_media_title VARCHAR(255),
  meta_title VARCHAR(255),
  meta_description TEXT,
  seo_keywords JSON,
  view_count INT DEFAULT 0,
  published_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY articles_search_idx (title, excerpt, content),
  KEY articles_status_idx (status),
  KEY articles_featured_idx (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id CHAR(24) PRIMARY KEY,
  setting_key VARCHAR(160) NOT NULL UNIQUE,
  value JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics (
  id CHAR(24) PRIMARY KEY,
  seo_health_score INT DEFAULT 100,
  top_content JSON,
  traffic_logs JSON,
  trending_searches JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(24) PRIMARY KEY,
  recipient_id CHAR(24),
  recipient_type ENUM('User','Admin') DEFAULT 'User',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('system','subtitle_approved','subtitle_rejected','comment_reply','alert') DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY notifications_recipient_idx (recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
