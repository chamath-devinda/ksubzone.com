-- ==================================================================
-- KSubZone Full Supabase PostgreSQL Migration Script
-- Target Project Ref: lhbmpnnjrbvqvumtydcx
-- Generated: 2026-09-06 14:42:28
-- IMPORTANT: Copy the ENTIRE file (Ctrl+A then Ctrl+C) and run!
-- ==================================================================

-- ==================================================================
-- STEP 1: CREATE ALL TABLES (Must run first!)
-- ==================================================================

CREATE TABLE IF NOT EXISTS "users" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_users_createdAt" ON "users" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "admins" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_admins_createdAt" ON "admins" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "roles" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_roles_createdAt" ON "roles" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "permissions" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_permissions_createdAt" ON "permissions" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "movies" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_movies_createdAt" ON "movies" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "dramas" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_dramas_createdAt" ON "dramas" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "seasons" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_seasons_createdAt" ON "seasons" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "episodes" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_episodes_createdAt" ON "episodes" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "genres" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_genres_createdAt" ON "genres" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "subtitles" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_subtitles_createdAt" ON "subtitles" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "reviews" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_reviews_createdAt" ON "reviews" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "comments" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_comments_createdAt" ON "comments" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "analytics" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_analytics_createdAt" ON "analytics" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "settings" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_settings_createdAt" ON "settings" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "articles" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_articles_createdAt" ON "articles" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "notifications" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_notifications_createdAt" ON "notifications" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "tmdb_imports" (
    "_id" TEXT PRIMARY KEY,
    "data" JSONB,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_tmdb_imports_createdAt" ON "tmdb_imports" ("createdAt" DESC);

-- ==================================================================
-- STEP 2: PERFORMANCE INDEXES ON JSONB ATTRIBUTES
-- ==================================================================

CREATE INDEX IF NOT EXISTS "idx_subtitles_mediaId" ON "subtitles" (("data"->>'mediaId'));
CREATE INDEX IF NOT EXISTS "idx_subtitles_approvalStatus" ON "subtitles" (("data"->>'approvalStatus'));
CREATE INDEX IF NOT EXISTS "idx_subtitles_uploader" ON "subtitles" (("data"->>'uploader'));
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" (("data"->>'username'));
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" (("data"->>'email'));
CREATE INDEX IF NOT EXISTS "idx_admins_username" ON "admins" (("data"->>'username'));
CREATE INDEX IF NOT EXISTS "idx_admins_email" ON "admins" (("data"->>'email'));
CREATE INDEX IF NOT EXISTS "idx_movies_slug" ON "movies" (("data"->>'slug'));
CREATE INDEX IF NOT EXISTS "idx_movies_status" ON "movies" (("data"->>'status'));
CREATE INDEX IF NOT EXISTS "idx_dramas_slug" ON "dramas" (("data"->>'slug'));
CREATE INDEX IF NOT EXISTS "idx_dramas_status" ON "dramas" (("data"->>'status'));
CREATE INDEX IF NOT EXISTS "idx_seasons_dramaId" ON "seasons" (("data"->>'dramaId'));
CREATE INDEX IF NOT EXISTS "idx_episodes_dramaId" ON "episodes" (("data"->>'dramaId'));
CREATE INDEX IF NOT EXISTS "idx_episodes_seasonId" ON "episodes" (("data"->>'seasonId'));
CREATE INDEX IF NOT EXISTS "idx_articles_slug" ON "articles" (("data"->>'slug'));

-- ==================================================================
-- STEP 3: INSERT / SYNC ALL EXISTING DATA
-- ==================================================================

-- Table: admins (1 rows)
INSERT INTO "admins" ("_id", "data", "createdAt", "updatedAt") VALUES ('9c747fcc53b71bfadd085ba4', '{"username":"superadmin","email":"admin@ksubzone.com","password":"$2y$10$Y10fQulCjijIq0eUnWuRYuyXRgjFYMAQ\/6KFGOomlMrH\/N.hyrBZa","role":"8ae6675313180a5dd19b6f3e","twoFactorEnabled":false,"updatedAt":"2026-09-05 03:04:24","displayName":"KSubZone Director","bio":"Leading Sinhala KDrama translations","avatar":"\/uploads\/avatars\/avatars-1788577464-4045.png"}'::jsonb, '2026-08-30 04:47:57', '2026-09-05 03:04:24') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: roles (3 rows)
INSERT INTO "roles" ("_id", "data", "createdAt", "updatedAt") VALUES ('8ae6675313180a5dd19b6f3e', '{"name":"SuperAdmin","permissions":["7181eef2342e5555e75d6095","916132a3bf35726b8b12b78d","285d07a7eef6a9be7b61fd81","c43097e8be56710feb951b96","a46740eb1f2041986034893c","3be54102ae9850fc0058d01d","aa473ffcf77c26aeeee8ba0b"]}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "roles" ("_id", "data", "createdAt", "updatedAt") VALUES ('8d9ba90cadace33ab4f3c211', '{"name":"Moderator","permissions":["285d07a7eef6a9be7b61fd81","c43097e8be56710feb951b96","3be54102ae9850fc0058d01d"]}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "roles" ("_id", "data", "createdAt", "updatedAt") VALUES ('65122b21a5a6fbccbdb33500', '{"name":"Editor","permissions":["7181eef2342e5555e75d6095","916132a3bf35726b8b12b78d"]}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: permissions (7 rows)
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('7181eef2342e5555e75d6095', '{"name":"manage_movies","description":"Can create, edit, delete movies"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('916132a3bf35726b8b12b78d', '{"name":"manage_dramas","description":"Can create, edit, delete dramas\/seasons\/episodes"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('285d07a7eef6a9be7b61fd81', '{"name":"approve_subtitles","description":"Can moderate subtitle uploads"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('c43097e8be56710feb951b96', '{"name":"manage_comments","description":"Can moderate reviews and comments"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('a46740eb1f2041986034893c', '{"name":"manage_users","description":"Can manage front-end user statuses"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('3be54102ae9850fc0058d01d', '{"name":"view_analytics","description":"Access to traffic and SEO dashboard"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "permissions" ("_id", "data", "createdAt", "updatedAt") VALUES ('aa473ffcf77c26aeeee8ba0b', '{"name":"manage_settings","description":"Configure API keys and site flags"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: movies (2 rows)
INSERT INTO "movies" ("_id", "data", "createdAt", "updatedAt") VALUES ('f66233885a9ff21ed7ea7e37', '{"title":"Train to Busan","originalTitle":"\ubd80\uc0b0\ud589","slug":"train-to-busan","description":"A zombie virus breaks out in South Korea, and passengers on a train from Seoul to Busan struggle to survive.","poster":"https:\/\/placehold.co\/500x750\/111\/fff?text=Train+to+Busan","banner":"https:\/\/placehold.co\/1920x1080\/111\/fff?text=Train+to+Busan+Banner","backdrops":[],"releaseDate":"2016-07-20","runtime":118,"country":"KR","language":"ko","productionCompanies":["RedPeter Films"],"tmdbRating":8,"imdbRating":8,"trailer":"https:\/\/www.youtube.com\/embed\/pyWuHv2-Y8s","keywords":["zombie","survival","train"],"director":"Yeon Sang-ho","writers":["Park Joo-suk"],"studio":"RedPeter Films","cast":[{"name":"Gong Yoo","character":"Seok-woo","profilePath":""},{"name":"Ma Dong-seok","character":"Sang-hwa","profilePath":""}],"viewCount":0,"status":"Published","isFeatured":true,"isTrending":true,"tmdbId":555501}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "movies" ("_id", "data", "createdAt", "updatedAt") VALUES ('bd1774d370a29ad126d7d3f0', '{"title":"Parasite","originalTitle":"\uae30\uc0dd\ucda9","slug":"parasite","description":"All unemployed, Ki-taek''s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood.","poster":"https:\/\/placehold.co\/500x750\/111\/fff?text=Parasite","banner":"https:\/\/placehold.co\/1920x1080\/111\/fff?text=Parasite+Banner","backdrops":[],"releaseDate":"2019-05-30","runtime":132,"country":"KR","language":"ko","productionCompanies":["Barunson E&A"],"tmdbRating":8.5,"imdbRating":8.5,"trailer":"https:\/\/www.youtube.com\/embed\/5xH0HfJHsaY","keywords":["class conflict","dark comedy"],"director":"Bong Joon-ho","writers":["Bong Joon-ho"],"studio":"Barunson E&A","cast":[{"name":"Song Kang-ho","character":"Ki-taek","profilePath":""},{"name":"Lee Sun-kyun","character":"Mr. Park","profilePath":""}],"viewCount":0,"status":"Published","isFeatured":false,"isTrending":true,"tmdbId":555502}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: dramas (1 rows)
INSERT INTO "dramas" ("_id", "data", "createdAt", "updatedAt") VALUES ('d4852107dae9704d6647975b', '{"title":"Moving","originalTitle":"\ubb34\ube59","slug":"moving","description":"Children with superpowers and their parents who harbor painful secrets from the past face a massive imminent danger together.","poster":"https:\/\/placehold.co\/500x750\/111\/fff?text=Moving","banner":"https:\/\/placehold.co\/1920x1080\/111\/fff?text=Moving+Banner","backdrops":[],"releaseDate":"2023-08-09","runtime":45,"country":"KR","language":"ko","productionCompanies":["Studio Flow"],"tmdbRating":8.4,"imdbRating":8.4,"trailer":"https:\/\/www.youtube.com\/embed\/rP1Zc5b_a6E","keywords":["superpowers","secret agent","action"],"director":"Park In-je","writers":["Kang Full"],"studio":"Studio Flow","cast":[{"name":"Ryu Seung-ryong","character":"Jang Ju-won","profilePath":""},{"name":"Han Hyo-joo","character":"Lee Mi-hyun","profilePath":""}],"viewCount":0,"status":"Published","isFeatured":true,"isTrending":true,"tmdbId":999901}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: seasons (1 rows)
INSERT INTO "seasons" ("_id", "data", "createdAt", "updatedAt") VALUES ('bccd1c3edcf74ba6cfea025c', '{"dramaId":"d4852107dae9704d6647975b","seasonNumber":1,"seasonDescription":"Season 1 chronicles the awakening of high schoolers'' abilities and the agents guarding them.","seasonPoster":"https:\/\/placehold.co\/500x750\/111\/fff?text=Moving+S1","airDate":"2023-08-09"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: episodes (2 rows)
INSERT INTO "episodes" ("_id", "data", "createdAt", "updatedAt") VALUES ('18b3158bfeca0a1929d90136', '{"dramaId":"d4852107dae9704d6647975b","seasonId":"bccd1c3edcf74ba6cfea025c","episodeNumber":1,"episodeTitle":"Superpower Senior","episodeDescription":"Bong-seok hides his ability to float. A new girl, Hui-soo, transfers to his school.","episodeThumbnail":"https:\/\/placehold.co\/1920x1080\/111\/fff?text=Moving+E1","airDate":"2023-08-09","runtime":45,"videoUrl":"https:\/\/www.w3schools.com\/html\/mov_bbb.mp4"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "episodes" ("_id", "data", "createdAt", "updatedAt") VALUES ('aefe0e57dcf8cc615b3baf49', '{"dramaId":"d4852107dae9704d6647975b","seasonId":"bccd1c3edcf74ba6cfea025c","episodeNumber":2,"episodeTitle":"Han River Euljiro","episodeDescription":"A mysterious assassin named Frank begins targeting retired agents with superpowers.","episodeThumbnail":"https:\/\/placehold.co\/1920x1080\/111\/fff?text=Moving+E2","airDate":"2023-08-09","runtime":48,"videoUrl":"https:\/\/www.w3schools.com\/html\/mov_bbb.mp4"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: genres (7 rows)
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('0498e33bbd3815923a5422ed', '{"name":"Horror","slug":"horror"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('6a19cdf72ab070dbd3557698', '{"name":"Action","slug":"action"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('88fe1c19c778249a7430ff6b', '{"name":"Thriller","slug":"thriller"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('d11997389355e9e6bca67302', '{"name":"Comedy","slug":"comedy"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('b4fc764a1903469fbcd7d686', '{"name":"Drama","slug":"drama"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('8423a645514e30447cf9717f', '{"name":"Mystery","slug":"mystery"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "genres" ("_id", "data", "createdAt", "updatedAt") VALUES ('a1ca81242c062e58555c0aea', '{"name":"Sci-Fi & Fantasy","slug":"sci-fi-fantasy"}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: analytics (1 rows)
INSERT INTO "analytics" ("_id", "data", "createdAt", "updatedAt") VALUES ('ef3d80ba80b81939856f24f3', '{"seoHealthScore":98,"trafficLogs":[{"date":"2026-05-18","views":120,"uniqueVisitors":80},{"date":"2026-05-19","views":240,"uniqueVisitors":150},{"date":"2026-05-20","views":310,"uniqueVisitors":190},{"date":"2026-05-21","views":420,"uniqueVisitors":280},{"date":"2026-05-22","views":530,"uniqueVisitors":360},{"date":"2026-08-30","views":2,"uniqueVisitors":2}],"trendingSearches":[],"updatedAt":"2026-08-30 10:28:38"}'::jsonb, '2026-08-30 04:47:58', '2026-08-30 10:28:38') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- Table: articles (6 rows)
INSERT INTO "articles" ("_id", "data", "createdAt", "updatedAt") VALUES ('69591dfda69bbb13837be83e', '{"title":"Weak Hero: Why school revenge stories feel so intense","excerpt":"A closer look at friendship, pressure, violence, and the quiet emotional rhythm that makes Weak Hero stand out.","content":"Weak Hero Class 1 is one of the most raw and intense school dramas ever made. Instead of presenting simple schoolyard conflicts, it dives deep into the psychology of pressure, systemic failure, and the desperation that drives ordinary students to violence.\n\nThe series centers around Yeon Shi-eun, a quiet, top-tier student who uses his brain, tools, and understanding of physics to fight back against brutal bullies. What makes this story so compelling is that Shi-eun is not a traditional hero; he is a deeply traumatized kid pushed to his absolute limits.\n\nThroughout the show, we see how the school system and parents ignore the growing danger, forcing the students to form fragile alliances and face dangerous gangs. The intense pacing, realistic choreography, and heavy emotional weight make it a standout masterpiece in the school revenge subgenre.","category":"Character Study","coverImage":"https:\/\/image.tmdb.org\/t\/p\/original\/cLTAda6fMRirkCY1xfO4pmcHVkk.jpg","authorName":"KSubZone Editorial","readTime":5,"status":"Published","isFeatured":true,"tags":["Weak Hero","Character Study","Action","School Drama"],"metaTitle":"Weak Hero Class 1: Psychology of School Drama","metaDescription":"A deep-dive character study into Yeon Shi-eun and the realistic violence of Weak Hero Class 1.","seoKeywords":["weak hero class 1","yeon shi eun","school drama","korean revenge series"],"slug":"weak-hero-why-school-revenge-stories-feel-so-intense","viewCount":0}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "articles" ("_id", "data", "createdAt", "updatedAt") VALUES ('3beb96c90ecbe60b7d90cff5', '{"title":"Best K-Dramas to start with if you are new to Korean series","excerpt":"Romance, action, thriller, and slice-of-life picks that help new viewers find their first favorite drama.","content":"Entering the world of Korean dramas can feel overwhelming with thousands of titles across different genres. To help you navigate, we have curated the ultimate starting guide for beginners.\n\nFor romance lovers, Crash Landing on You is the absolute gold standard. It mixes comedy, political tension, and incredible chemistry in a story about a South Korean heiress who accidentally lands in North Korea.\n\nFor thriller fans, Flower of Evil offers a suspenseful ride about a detective who suspects her seemingly perfect husband might be a serial killer. If you prefer high-intensity action, the superhero series Moving or the zombie survival Train to Busan (movie) are perfect starts.","category":"Guide","coverImage":"https:\/\/image.tmdb.org\/t\/p\/original\/8GMFc9ehJk0k6HMpguGN4kMoazl.jpg","authorName":"KSubZone Editorial","readTime":7,"status":"Published","isFeatured":false,"tags":["Guide","Beginner","Crash Landing On You","Moving"],"metaTitle":"Ultimate Guide to K-Dramas for Beginners","metaDescription":"New to Korean series? Here is the list of best entry point K-dramas across romance, action, and thrillers.","seoKeywords":["best kdramas","kdrama guide","start watching kdramas","korean series for beginners"],"slug":"best-k-dramas-to-start-with-if-you-are-new-to-korean-series","viewCount":0}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "articles" ("_id", "data", "createdAt", "updatedAt") VALUES ('42e7dec52aacf78b364c55a2', '{"title":"Sinhala subtitles and why timing matters in K-Drama watching","excerpt":"Good subtitle timing can change the full mood of a scene, especially in dialogue-heavy Korean dramas.","content":"Subtitles are the bridge between the story and the viewer. In dialogue-heavy Korean dramas, a delay of even a single second can completely ruin the comedic timing or the dramatic impact of a major revelation.\n\nFor Sri Lankan K-drama fans, community Sinhala subtitles have made these stories highly accessible. However, sync timing is crucial. Since Korean syntax places the verb at the end of the sentence, translators must balance word order with read speed.\n\nProperly synchronized SRT and ASS subtitles ensure that the text appears exactly when the actor speaks, preserving the emotional rhythm and pacing of the director''s original cut.","category":"Subtitles","coverImage":"https:\/\/images.unsplash.com\/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop","authorName":"KSubZone Editorial","readTime":4,"status":"Published","isFeatured":false,"tags":["Subtitles","Sinhala SRT","Sync Timing","Watch Guide"],"metaTitle":"Importance of Sinhala Subtitle Sync in K-Dramas","metaDescription":"Why timing and proper translation syntax are essential for enjoying Korean dramas with Sinhala subtitles.","seoKeywords":["sinhala subtitles","kdrama sinhala sub","subtitles sync SRT","translation timing"],"slug":"sinhala-subtitles-and-why-timing-matters-in-k-drama-watching","viewCount":0}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "articles" ("_id", "data", "createdAt", "updatedAt") VALUES ('6253b915f2e0fe3fd631f444', '{"title":"From Train to Busan to Peninsula: Korean zombie cinema explained","excerpt":"How Korean zombie movies mix survival action with family, class pressure, and social collapse.","content":"Korean zombie cinema has taken the global film industry by storm. Films like Train to Busan redefined the genre by shifting the focus from mindless gore to human relationship dynamics and societal critique.\n\nIn Train to Busan, the zombies are fast and aggressive, but the true threat is the breakdown of human morality inside the train cars. The film highlights the conflict between selfish upper-class individuals and working-class people who sacrifice themselves for others.\n\nSubsequent entries like Kingdom and Peninsula expanded this universe, showing how historical settings and post-apocalyptic landscapes can serve as a backdrop for political corruption and human resilience.","category":"Movies","coverImage":"https:\/\/image.tmdb.org\/t\/p\/original\/gEjNlhZhyHeto6Fy5wWy5Uk3A9D.jpg","authorName":"KSubZone Editorial","readTime":6,"status":"Published","isFeatured":true,"tags":["Zombies","Train to Busan","Movies","Kingdom"],"metaTitle":"Evolution of Korean Zombie Movies & Series","metaDescription":"Discover how Korean zombie films blend high-speed action with societal critiques and emotional weight.","seoKeywords":["korean zombie movies","train to busan","kingdom series","zombie cinema"],"slug":"from-train-to-busan-to-peninsula-korean-zombie-cinema-explained","viewCount":0}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "articles" ("_id", "data", "createdAt", "updatedAt") VALUES ('d009d67c4de8ee740d1afd95', '{"title":"Why contract marriage plots still work in modern K-Dramas","excerpt":"The familiar trope keeps returning because it creates fast tension, clear stakes, and emotional payoff.","content":"Contract marriage and fake dating are among the oldest tropes in romance dramas. Yet, modern series like Because This Is My First Life and My Demon continue to pull huge ratings using these exact setups.\n\nWhy does it work so well? First, it establishes immediate proximity. Forcing two completely different people to live together or act as a couple creates organic comedic moments and forced intimacy.\n\nSecond, it sets clear stakes. The characters start with logical reasons to avoid falling in love, making the gradual breakdown of their emotional walls and eventual genuine romance extremely satisfying for viewers.","category":"Romance","coverImage":"https:\/\/image.tmdb.org\/t\/p\/original\/6ekykPwvAywJRjFEnUoCFWTO9O3.jpg","authorName":"KSubZone Editorial","readTime":5,"status":"Published","isFeatured":false,"tags":["Romance","Tropes","Contract Marriage","My Demon"],"metaTitle":"Contract Marriage Trope in Korean Rom-Coms","metaDescription":"An analysis of why the contract marriage plot continues to captivate modern K-drama romance audiences.","seoKeywords":["contract marriage kdrama","romance tropes","fake dating korean series","satisfying romance"],"slug":"why-contract-marriage-plots-still-work-in-modern-k-dramas","viewCount":0}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";
INSERT INTO "articles" ("_id", "data", "createdAt", "updatedAt") VALUES ('78b54da8159a18088cf87e05', '{"title":"IMDb ratings vs fan hype: how to choose what to watch next","excerpt":"Ratings help, but genre mood, cast chemistry, and episode pacing matter just as much.","content":"Choosing your next K-drama is often a struggle between objective ratings and community recommendation threads. While platforms like IMDb provide a general baseline, they don''t always capture the specific appeal of a series.\n\nMany niche dramas with lower ratings have passionate cult followings due to unique cast chemistry or slice-of-life pacing that doesn''t appeal to mainstream audiences. Conversely, some high-rated blockbusters might suffer from generic storylines.\n\nTo build the perfect watchlist, balance reviews with your personal mood, favorite actors, and recommendations from experienced community bloggers rather than just rating numbers.","category":"Watchlist","coverImage":"https:\/\/images.unsplash.com\/photo-1524985069026-dd778a71c7b4?q=80&w=1600&auto=format&fit=crop","authorName":"KSubZone Editorial","readTime":3,"status":"Published","isFeatured":false,"tags":["Watchlist","Guide","IMDb","Drama Choice"],"metaTitle":"How to Choose Your Next K-Drama: Ratings vs Hype","metaDescription":"Stop struggling to pick a drama. Learn how to balance IMDb scores with your personal genre preferences.","seoKeywords":["what to watch next","imdb kdrama ratings","korean series recommendation","watchlist guide"],"slug":"imdb-ratings-vs-fan-hype-how-to-choose-what-to-watch-next","viewCount":0}'::jsonb, '2026-08-30 04:47:57', '2026-08-30 04:47:57') ON CONFLICT ("_id") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt";

-- ==================================================================
-- STEP 4: STORAGE BUCKET CREATION (FOR SUBTITLES & UPLOADS)
-- ==================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('Ksubzone', 'Ksubzone', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Subtitles" ON storage.objects;
CREATE POLICY "Public Read Subtitles" ON storage.objects FOR SELECT USING (bucket_id = 'Ksubzone');

DROP POLICY IF EXISTS "Service Role Manage Subtitles" ON storage.objects;
CREATE POLICY "Service Role Manage Subtitles" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'Ksubzone');

-- ==================================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================================

ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read users" ON "users";
DROP POLICY IF EXISTS "Service role full access users" ON "users";
CREATE POLICY "Service role full access users" ON "users" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "admins" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read admins" ON "admins";
DROP POLICY IF EXISTS "Service role full access admins" ON "admins";
CREATE POLICY "Service role full access admins" ON "admins" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "roles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read roles" ON "roles";
DROP POLICY IF EXISTS "Service role full access roles" ON "roles";
CREATE POLICY "Service role full access roles" ON "roles" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "permissions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read permissions" ON "permissions";
DROP POLICY IF EXISTS "Service role full access permissions" ON "permissions";
CREATE POLICY "Service role full access permissions" ON "permissions" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "movies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read movies" ON "movies";
CREATE POLICY "Public read movies" ON "movies" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access movies" ON "movies";
CREATE POLICY "Service role full access movies" ON "movies" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "dramas" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read dramas" ON "dramas";
CREATE POLICY "Public read dramas" ON "dramas" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access dramas" ON "dramas";
CREATE POLICY "Service role full access dramas" ON "dramas" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "seasons" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read seasons" ON "seasons";
CREATE POLICY "Public read seasons" ON "seasons" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access seasons" ON "seasons";
CREATE POLICY "Service role full access seasons" ON "seasons" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "episodes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read episodes" ON "episodes";
CREATE POLICY "Public read episodes" ON "episodes" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access episodes" ON "episodes";
CREATE POLICY "Service role full access episodes" ON "episodes" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "genres" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read genres" ON "genres";
CREATE POLICY "Public read genres" ON "genres" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access genres" ON "genres";
CREATE POLICY "Service role full access genres" ON "genres" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "subtitles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read subtitles" ON "subtitles";
CREATE POLICY "Public read approved subtitles" ON "subtitles" FOR SELECT
    USING (data->>'approvalStatus' = 'Approved');
DROP POLICY IF EXISTS "Service role full access subtitles" ON "subtitles";
CREATE POLICY "Service role full access subtitles" ON "subtitles" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "reviews" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reviews" ON "reviews";
CREATE POLICY "Public read reviews" ON "reviews" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access reviews" ON "reviews";
CREATE POLICY "Service role full access reviews" ON "reviews" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "comments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read comments" ON "comments";
CREATE POLICY "Public read comments" ON "comments" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access comments" ON "comments";
CREATE POLICY "Service role full access comments" ON "comments" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "analytics" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read analytics" ON "analytics";
DROP POLICY IF EXISTS "Service role full access analytics" ON "analytics";
CREATE POLICY "Service role full access analytics" ON "analytics" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON "settings";
DROP POLICY IF EXISTS "Service role full access settings" ON "settings";
CREATE POLICY "Service role full access settings" ON "settings" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "articles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read articles" ON "articles";
CREATE POLICY "Public read articles" ON "articles" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access articles" ON "articles";
CREATE POLICY "Service role full access articles" ON "articles" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "notifications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read notifications" ON "notifications";
DROP POLICY IF EXISTS "Service role full access notifications" ON "notifications";
CREATE POLICY "Service role full access notifications" ON "notifications" FOR ALL TO service_role USING (true);

ALTER TABLE IF EXISTS "tmdb_imports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tmdb_imports" ON "tmdb_imports";
DROP POLICY IF EXISTS "Service role full access tmdb_imports" ON "tmdb_imports";
CREATE POLICY "Service role full access tmdb_imports" ON "tmdb_imports" FOR ALL TO service_role USING (true);
