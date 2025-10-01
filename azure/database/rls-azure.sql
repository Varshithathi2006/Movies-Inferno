-- Row Level Security (RLS) Setup for Azure PostgreSQL
-- Movie Inferno - Comprehensive security policies for data access control

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

-- Enable RLS on user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on content tables (for admin access control)
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Enable RLS on junction tables
ALTER TABLE movie_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_show_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_show_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_collections ENABLE ROW LEVEL SECURITY;

-- =============================================
-- UTILITY FUNCTIONS FOR RLS
-- =============================================

-- Function to get current user ID (for Azure AD integration)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    -- In Azure, this would integrate with Azure AD
    -- For now, we'll use a session variable or JWT claim
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NULL
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_user_id() 
        AND role = 'admin' 
        AND is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is moderator or admin
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_user_id() 
        AND role IN ('admin', 'moderator') 
        AND is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================

-- Users table policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_registration" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;

-- Reviews table policies
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
DROP POLICY IF EXISTS "reviews_admin_all" ON reviews;

-- Watchlist table policies
DROP POLICY IF EXISTS "watchlist_select_own" ON watchlist;
DROP POLICY IF EXISTS "watchlist_insert_own" ON watchlist;
DROP POLICY IF EXISTS "watchlist_update_own" ON watchlist;
DROP POLICY IF EXISTS "watchlist_delete_own" ON watchlist;

-- User preferences policies
DROP POLICY IF EXISTS "user_preferences_select_own" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_own" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_own" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete_own" ON user_preferences;

-- Chatbot conversations policies
DROP POLICY IF EXISTS "chatbot_conversations_select_own" ON chatbot_conversations;
DROP POLICY IF EXISTS "chatbot_conversations_insert_own" ON chatbot_conversations;
DROP POLICY IF EXISTS "chatbot_conversations_update_own" ON chatbot_conversations;

-- Content table policies
DROP POLICY IF EXISTS "content_select_all" ON movies;
DROP POLICY IF EXISTS "content_admin_all" ON movies;
DROP POLICY IF EXISTS "content_select_all" ON tv_shows;
DROP POLICY IF EXISTS "content_admin_all" ON tv_shows;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (id = current_user_id());

-- Users can update their own profile (excluding role and admin fields)
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (id = current_user_id())
    WITH CHECK (
        id = current_user_id() AND
        -- Prevent users from changing their own role unless they're admin
        (role = OLD.role OR is_admin())
    );

-- Allow user registration (public insert)
CREATE POLICY "users_insert_registration" ON users
    FOR INSERT
    WITH CHECK (
        role = 'user' AND
        is_active = true AND
        email_verified = false
    );

-- Admins can do everything with users
CREATE POLICY "users_admin_all" ON users
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================
-- REVIEWS TABLE POLICIES
-- =============================================

-- Anyone can view approved reviews
CREATE POLICY "reviews_select_all" ON reviews
    FOR SELECT
    USING (
        status = 'approved' OR
        user_id = current_user_id() OR
        is_moderator_or_admin()
    );

-- Users can create their own reviews
CREATE POLICY "reviews_insert_own" ON reviews
    FOR INSERT
    WITH CHECK (
        user_id = current_user_id() AND
        status = 'pending'
    );

-- Users can update their own reviews (if not yet approved)
CREATE POLICY "reviews_update_own" ON reviews
    FOR UPDATE
    USING (
        user_id = current_user_id() AND
        (status = 'pending' OR is_moderator_or_admin())
    )
    WITH CHECK (
        user_id = current_user_id() AND
        -- Users can only change content, not status (unless moderator/admin)
        (status = OLD.status OR is_moderator_or_admin())
    );

-- Users can delete their own reviews
CREATE POLICY "reviews_delete_own" ON reviews
    FOR DELETE
    USING (
        user_id = current_user_id() OR
        is_moderator_or_admin()
    );

-- Moderators and admins can manage all reviews
CREATE POLICY "reviews_admin_all" ON reviews
    FOR ALL
    USING (is_moderator_or_admin())
    WITH CHECK (is_moderator_or_admin());

-- =============================================
-- WATCHLIST TABLE POLICIES
-- =============================================

-- Users can only access their own watchlist
CREATE POLICY "watchlist_select_own" ON watchlist
    FOR SELECT
    USING (user_id = current_user_id());

CREATE POLICY "watchlist_insert_own" ON watchlist
    FOR INSERT
    WITH CHECK (user_id = current_user_id());

CREATE POLICY "watchlist_update_own" ON watchlist
    FOR UPDATE
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE POLICY "watchlist_delete_own" ON watchlist
    FOR DELETE
    USING (user_id = current_user_id());

-- =============================================
-- USER PREFERENCES TABLE POLICIES
-- =============================================

-- Users can only access their own preferences
CREATE POLICY "user_preferences_select_own" ON user_preferences
    FOR SELECT
    USING (user_id = current_user_id());

CREATE POLICY "user_preferences_insert_own" ON user_preferences
    FOR INSERT
    WITH CHECK (user_id = current_user_id());

CREATE POLICY "user_preferences_update_own" ON user_preferences
    FOR UPDATE
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE POLICY "user_preferences_delete_own" ON user_preferences
    FOR DELETE
    USING (user_id = current_user_id());

-- =============================================
-- CHATBOT CONVERSATIONS TABLE POLICIES
-- =============================================

-- Users can only access their own conversations
CREATE POLICY "chatbot_conversations_select_own" ON chatbot_conversations
    FOR SELECT
    USING (
        user_id = current_user_id() OR
        is_admin() -- Admins can view for support purposes
    );

CREATE POLICY "chatbot_conversations_insert_own" ON chatbot_conversations
    FOR INSERT
    WITH CHECK (user_id = current_user_id());

-- Only allow updates to response field (for AI system)
CREATE POLICY "chatbot_conversations_update_response" ON chatbot_conversations
    FOR UPDATE
    USING (
        user_id = current_user_id() OR
        current_user = 'chatbot_service' -- Special service account
    )
    WITH CHECK (
        user_id = OLD.user_id AND
        message = OLD.message AND
        session_id = OLD.session_id
    );

-- =============================================
-- CONTENT TABLE POLICIES (PUBLIC READ)
-- =============================================

-- Public read access for movies
CREATE POLICY "movies_select_all" ON movies
    FOR SELECT
    USING (true);

-- Only admins can modify movies
CREATE POLICY "movies_admin_modify" ON movies
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Public read access for TV shows
CREATE POLICY "tv_shows_select_all" ON tv_shows
    FOR SELECT
    USING (true);

-- Only admins can modify TV shows
CREATE POLICY "tv_shows_admin_modify" ON tv_shows
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Public read access for genres
CREATE POLICY "genres_select_all" ON genres
    FOR SELECT
    USING (true);

CREATE POLICY "genres_admin_modify" ON genres
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Public read access for people
CREATE POLICY "people_select_all" ON people
    FOR SELECT
    USING (true);

CREATE POLICY "people_admin_modify" ON people
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Public read access for collections
CREATE POLICY "collections_select_all" ON collections
    FOR SELECT
    USING (true);

CREATE POLICY "collections_admin_modify" ON collections
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Public read access for awards
CREATE POLICY "awards_select_all" ON awards
    FOR SELECT
    USING (true);

CREATE POLICY "awards_admin_modify" ON awards
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================
-- JUNCTION TABLE POLICIES
-- =============================================

-- Public read access for all junction tables
CREATE POLICY "movie_genres_select_all" ON movie_genres
    FOR SELECT
    USING (true);

CREATE POLICY "movie_genres_admin_modify" ON movie_genres
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "tv_show_genres_select_all" ON tv_show_genres
    FOR SELECT
    USING (true);

CREATE POLICY "tv_show_genres_admin_modify" ON tv_show_genres
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "movie_credits_select_all" ON movie_credits
    FOR SELECT
    USING (true);

CREATE POLICY "movie_credits_admin_modify" ON movie_credits
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "tv_show_credits_select_all" ON tv_show_credits
    FOR SELECT
    USING (true);

CREATE POLICY "tv_show_credits_admin_modify" ON tv_show_credits
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "movie_collections_select_all" ON movie_collections
    FOR SELECT
    USING (true);

CREATE POLICY "movie_collections_admin_modify" ON movie_collections
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================
-- AUDIT LOG POLICIES
-- =============================================

-- Only admins can view audit logs
CREATE POLICY "audit_log_admin_only" ON audit_log
    FOR SELECT
    USING (is_admin());

-- System can insert audit logs (no user restrictions)
CREATE POLICY "audit_log_system_insert" ON audit_log
    FOR INSERT
    WITH CHECK (true);

-- =============================================
-- CONTENT ANALYTICS POLICIES
-- =============================================

-- Public read access for analytics (for displaying stats)
CREATE POLICY "content_analytics_select_all" ON content_analytics
    FOR SELECT
    USING (true);

-- Only system/admin can modify analytics
CREATE POLICY "content_analytics_system_modify" ON content_analytics
    FOR ALL
    USING (
        is_admin() OR
        current_user IN ('postgres', 'system', 'analytics_service')
    )
    WITH CHECK (
        is_admin() OR
        current_user IN ('postgres', 'system', 'analytics_service')
    );

-- =============================================
-- SECURITY FUNCTIONS FOR APPLICATION USE
-- =============================================

-- Function to set current user context (called by application)
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear user context
CREATE OR REPLACE FUNCTION clear_current_user_id()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM users 
    WHERE id = current_user_id() AND is_active = true;
    
    RETURN COALESCE(user_role_val, 'user');
EXCEPTION WHEN OTHERS THEN
    RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_moderator_or_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION set_current_user_id(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION clear_current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO PUBLIC;

-- Grant execute on search and recommendation functions
GRANT EXECUTE ON FUNCTION search_movies(TEXT, INTEGER[], DECIMAL, DECIMAL, INTEGER, INTEGER, VARCHAR, VARCHAR, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION search_tv_shows(TEXT, INTEGER[], DECIMAL, DECIMAL, INTEGER, INTEGER, VARCHAR, VARCHAR, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_movie_recommendations(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_similar_movies(INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_trending_content(content_type, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO PUBLIC;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION current_user_id() IS 'Returns the current authenticated user ID from session context';
COMMENT ON FUNCTION is_admin() IS 'Checks if the current user has admin role';
COMMENT ON FUNCTION is_moderator_or_admin() IS 'Checks if the current user has moderator or admin role';
COMMENT ON FUNCTION set_current_user_id(UUID) IS 'Sets the current user context for RLS policies';

COMMENT ON POLICY "users_select_own" ON users IS 'Users can only view their own profile data';
COMMENT ON POLICY "reviews_select_all" ON reviews IS 'Public can view approved reviews, users can view their own';
COMMENT ON POLICY "watchlist_select_own" ON watchlist IS 'Users can only access their own watchlist items';

COMMIT;