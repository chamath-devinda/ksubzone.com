-- ==========================================================
-- KSubZone Supabase Row Level Security (RLS) Policy Migration
-- ==========================================================
-- Run this script in the Supabase SQL Editor to secure all tables.

-- Enable Row Level Security (RLS) on all public schema tables
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. PUBLIC READ-ONLY POLICIES
-- ==========================================

CREATE POLICY "Allow public read access to movies" ON movies 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to dramas" ON dramas 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to seasons" ON seasons 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to episodes" ON episodes 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to genres" ON genres 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to articles" ON articles 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to approved subtitles" ON subtitles 
    FOR SELECT USING (data->>'approvalStatus' = 'Approved');

CREATE POLICY "Allow public read access to reviews" ON reviews 
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to comments" ON comments 
    FOR SELECT USING (true);

-- ==========================================
-- 2. AUTHENTICATED USER WRITE POLICIES
-- ==========================================

-- Subtitle uploads (authenticated users can insert, uploader can update/delete their own pending ones)
CREATE POLICY "Allow authenticated users to upload subtitles" ON subtitles 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow uploaders to update own pending subtitles" ON subtitles 
    FOR UPDATE USING (
        auth.uid()::text = (data->>'uploader') AND 
        data->>'approvalStatus' = 'Pending'
    );

-- Reviews (authenticated users can write reviews, owners can edit/delete their own)
CREATE POLICY "Allow authenticated users to write reviews" ON reviews 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owners to update own reviews" ON reviews 
    FOR UPDATE USING (auth.uid()::text = (data->>'userId'));

CREATE POLICY "Allow owners to delete own reviews" ON reviews 
    FOR DELETE USING (auth.uid()::text = (data->>'userId'));

-- Comments (authenticated users can write comments, owners can edit/delete their own)
CREATE POLICY "Allow authenticated users to post comments" ON comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owners to update own comments" ON comments 
    FOR UPDATE USING (auth.uid()::text = (data->>'userId'));

CREATE POLICY "Allow owners to delete own comments" ON comments 
    FOR DELETE USING (auth.uid()::text = (data->>'userId'));

-- User profiles (users can read and modify only their own data)
CREATE POLICY "Allow users to read own profile" ON users 
    FOR SELECT USING (auth.uid()::text = _id);

CREATE POLICY "Allow users to update own profile" ON users 
    FOR UPDATE USING (auth.uid()::text = _id);

-- User notifications
CREATE POLICY "Allow users to read own notifications" ON notifications 
    FOR SELECT USING (auth.uid()::text = (data->>'recipient'));

CREATE POLICY "Allow users to update own notifications" ON notifications 
    FOR UPDATE USING (auth.uid()::text = (data->>'recipient'));

-- ==========================================
-- 3. ADMINISTRATIVE POLICIES (Full bypass for admins)
-- ==========================================
-- Allow full postgres role (or users with 'admin' claim) unrestricted access
CREATE POLICY "Allow full admin control on movies" ON movies FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on dramas" ON dramas FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on seasons" ON seasons FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on episodes" ON episodes FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on subtitles" ON subtitles FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on comments" ON comments FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on reviews" ON reviews FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on users" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on settings" ON settings FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on articles" ON articles FOR ALL TO service_role USING (true);
CREATE POLICY "Allow full admin control on notifications" ON notifications FOR ALL TO service_role USING (true);
