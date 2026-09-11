-- Supabase security hardening for the JSONB-backed public schema.
-- Apply after the original Supabase migration and review with Supabase advisors.

-- Sensitive tables must not be readable through the Data API by default.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','admins','roles','permissions','movies','dramas','seasons','episodes','genres','subtitles','reviews','comments','analytics','settings','articles','notifications','tmdb_imports']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Public read users" ON users;
DROP POLICY IF EXISTS "Public read admins" ON admins;
DROP POLICY IF EXISTS "Public read roles" ON roles;
DROP POLICY IF EXISTS "Public read permissions" ON permissions;
DROP POLICY IF EXISTS "Public read analytics" ON analytics;
DROP POLICY IF EXISTS "Public read settings" ON settings;
DROP POLICY IF EXISTS "Public read notifications" ON notifications;
DROP POLICY IF EXISTS "Public read tmdb_imports" ON tmdb_imports;

-- Replace role-function checks with role targeting and an explicit auth.uid check.
DROP POLICY IF EXISTS "Allow authenticated users to upload subtitles" ON subtitles;
CREATE POLICY "Allow authenticated users to upload subtitles" ON subtitles
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated users to write reviews" ON reviews;
CREATE POLICY "Allow authenticated users to write reviews" ON reviews
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated users to post comments" ON comments;
CREATE POLICY "Allow authenticated users to post comments" ON comments
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Prevent an owner from transferring a row to another user during UPDATE.
DROP POLICY IF EXISTS "Allow uploaders to update own pending subtitles" ON subtitles;
CREATE POLICY "Allow uploaders to update own pending subtitles" ON subtitles
    FOR UPDATE TO authenticated
    USING (
        (select auth.uid())::text = (data->>'uploader')
        AND data->>'approvalStatus' = 'Pending'
    )
    WITH CHECK (
        (select auth.uid())::text = (data->>'uploader')
        AND data->>'approvalStatus' = 'Pending'
    );

DROP POLICY IF EXISTS "Allow owners to update own reviews" ON reviews;
CREATE POLICY "Allow owners to update own reviews" ON reviews
    FOR UPDATE TO authenticated
    USING ((select auth.uid())::text = (data->>'userId'))
    WITH CHECK ((select auth.uid())::text = (data->>'userId'));

DROP POLICY IF EXISTS "Allow owners to update own comments" ON comments;
CREATE POLICY "Allow owners to update own comments" ON comments
    FOR UPDATE TO authenticated
    USING ((select auth.uid())::text = (data->>'userId'))
    WITH CHECK ((select auth.uid())::text = (data->>'userId'));

DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE TO authenticated
    USING ((select auth.uid())::text = _id)
    WITH CHECK ((select auth.uid())::text = _id);

DROP POLICY IF EXISTS "Allow users to update own notifications" ON notifications;
CREATE POLICY "Allow users to update own notifications" ON notifications
    FOR UPDATE TO authenticated
    USING ((select auth.uid())::text = (data->>'recipient'))
    WITH CHECK ((select auth.uid())::text = (data->>'recipient'));

DROP POLICY IF EXISTS "Allow uploaders to delete own pending subtitles" ON subtitles;
CREATE POLICY "Allow uploaders to delete own pending subtitles" ON subtitles
    FOR DELETE TO authenticated
    USING (
        (select auth.uid())::text = (data->>'uploader')
        AND data->>'approvalStatus' = 'Pending'
    );
