-- Database Triggers for Azure PostgreSQL
-- Movie Inferno - Automated triggers for data integrity and business logic

-- =============================================
-- TIMESTAMP TRIGGERS
-- =============================================

-- Trigger to automatically update updated_at timestamps
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movies_updated_at
    BEFORE UPDATE ON movies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tv_shows_updated_at
    BEFORE UPDATE ON tv_shows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VALIDATION TRIGGERS
-- =============================================

-- Trigger to validate content references in reviews
CREATE TRIGGER validate_review_content_reference
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION validate_content_reference();

-- Trigger to validate content references in watchlist
CREATE TRIGGER validate_watchlist_content_reference
    BEFORE INSERT OR UPDATE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION validate_content_reference();

-- =============================================
-- ANALYTICS TRIGGERS
-- =============================================

-- Triggers to update content analytics when reviews change
CREATE TRIGGER update_analytics_on_review_insert
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

CREATE TRIGGER update_analytics_on_review_update
    AFTER UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

CREATE TRIGGER update_analytics_on_review_delete
    AFTER DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

-- Triggers to update content analytics when watchlist changes
CREATE TRIGGER update_analytics_on_watchlist_insert
    AFTER INSERT ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

CREATE TRIGGER update_analytics_on_watchlist_delete
    AFTER DELETE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

-- =============================================
-- BUSINESS LOGIC TRIGGERS
-- =============================================

-- Function to automatically set watched_at when watched status changes
CREATE OR REPLACE FUNCTION set_watched_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.watched = true AND (OLD.watched IS NULL OR OLD.watched = false) THEN
        NEW.watched_at = NOW();
    ELSIF NEW.watched = false THEN
        NEW.watched_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for watchlist watched timestamp
CREATE TRIGGER set_watchlist_watched_timestamp
    BEFORE UPDATE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION set_watched_timestamp();

-- Function to prevent duplicate reviews from same user for same content
CREATE OR REPLACE FUNCTION prevent_duplicate_reviews()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM reviews 
        WHERE user_id = NEW.user_id 
        AND content_type = NEW.content_type
        AND (
            (NEW.content_type = 'movie' AND movie_id = NEW.movie_id) OR
            (NEW.content_type = 'tv_show' AND tv_show_id = NEW.tv_show_id)
        )
        AND id != COALESCE(NEW.id, uuid_generate_v4())
    ) THEN
        RAISE EXCEPTION 'User has already reviewed this content';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate reviews
CREATE TRIGGER prevent_duplicate_reviews_trigger
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_reviews();

-- Function to update movie/TV show ratings when reviews change
CREATE OR REPLACE FUNCTION update_content_ratings()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,1);
    vote_count INTEGER;
    content_id_val INTEGER;
    content_type_val content_type;
BEGIN
    -- Determine content type and ID
    IF TG_OP = 'DELETE' THEN
        content_type_val := OLD.content_type;
        content_id_val := CASE WHEN OLD.content_type = 'movie' THEN OLD.movie_id ELSE OLD.tv_show_id END;
    ELSE
        content_type_val := NEW.content_type;
        content_id_val := CASE WHEN NEW.content_type = 'movie' THEN NEW.movie_id ELSE NEW.tv_show_id END;
    END IF;

    -- Calculate new average rating and count
    IF content_type_val = 'movie' THEN
        SELECT AVG(rating), COUNT(*) INTO avg_rating, vote_count
        FROM reviews 
        WHERE movie_id = content_id_val AND rating IS NOT NULL;
        
        -- Update movie table
        UPDATE movies 
        SET vote_average = COALESCE(avg_rating, 0),
            vote_count = vote_count
        WHERE id = content_id_val;
    ELSE
        SELECT AVG(rating), COUNT(*) INTO avg_rating, vote_count
        FROM reviews 
        WHERE tv_show_id = content_id_val AND rating IS NOT NULL;
        
        -- Update TV show table
        UPDATE tv_shows 
        SET vote_average = COALESCE(avg_rating, 0),
            vote_count = vote_count
        WHERE id = content_id_val;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update content ratings
CREATE TRIGGER update_content_ratings_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_content_ratings();

-- =============================================
-- AUDIT TRIGGERS
-- =============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    record_id_val TEXT;
    user_id_val UUID;
BEGIN
    -- Get record ID (assumes 'id' column exists)
    IF TG_OP = 'DELETE' THEN
        record_id_val := OLD.id::TEXT;
    ELSE
        record_id_val := NEW.id::TEXT;
    END IF;

    -- Try to get user_id from the record if it exists
    BEGIN
        IF TG_OP = 'DELETE' THEN
            user_id_val := (OLD.user_id)::UUID;
        ELSE
            user_id_val := (NEW.user_id)::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        user_id_val := NULL;
    END;

    -- Insert audit record
    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values, user_id)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        record_id_val,
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
        user_id_val
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_reviews_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_watchlist_trigger
    AFTER INSERT OR UPDATE OR DELETE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- PERFORMANCE OPTIMIZATION TRIGGERS
-- =============================================

-- Function to update search vectors for full-text search
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'movies' THEN
        NEW.search_vector := to_tsvector('english', 
            COALESCE(NEW.title, '') || ' ' || 
            COALESCE(NEW.overview, '') || ' ' ||
            COALESCE(NEW.tagline, '')
        );
    ELSIF TG_TABLE_NAME = 'tv_shows' THEN
        NEW.search_vector := to_tsvector('english', 
            COALESCE(NEW.name, '') || ' ' || 
            COALESCE(NEW.overview, '') || ' ' ||
            COALESCE(NEW.tagline, '')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add search_vector columns if they don't exist
ALTER TABLE movies ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create triggers for search vector updates
CREATE TRIGGER update_movies_search_vector
    BEFORE INSERT OR UPDATE ON movies
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER update_tv_shows_search_vector
    BEFORE INSERT OR UPDATE ON tv_shows
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();

-- Create indexes for search vectors
CREATE INDEX IF NOT EXISTS idx_movies_search_vector ON movies USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_tv_shows_search_vector ON tv_shows USING gin(search_vector);

-- =============================================
-- NOTIFICATION TRIGGERS
-- =============================================

-- Function to send notifications for important events
CREATE OR REPLACE FUNCTION send_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_payload JSON;
BEGIN
    -- Create notification payload
    notification_payload := json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'timestamp', NOW()
    );

    -- Send notification based on table and operation
    IF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
        PERFORM pg_notify('new_review', notification_payload::text);
    ELSIF TG_TABLE_NAME = 'users' AND TG_OP = 'INSERT' THEN
        PERFORM pg_notify('new_user', notification_payload::text);
    ELSIF TG_TABLE_NAME = 'watchlist' AND TG_OP = 'INSERT' THEN
        PERFORM pg_notify('watchlist_update', notification_payload::text);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create notification triggers
CREATE TRIGGER notify_new_review
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION send_notification();

CREATE TRIGGER notify_new_user
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION send_notification();

CREATE TRIGGER notify_watchlist_update
    AFTER INSERT ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION send_notification();

-- =============================================
-- DATA CLEANUP TRIGGERS
-- =============================================

-- Function to clean up orphaned records
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up orphaned movie_genres when movie is deleted
    IF TG_TABLE_NAME = 'movies' AND TG_OP = 'DELETE' THEN
        DELETE FROM movie_genres WHERE movie_id = OLD.id;
        DELETE FROM movie_credits WHERE movie_id = OLD.id;
        DELETE FROM movie_collections WHERE movie_id = OLD.id;
    END IF;

    -- Clean up orphaned tv_show_genres when TV show is deleted
    IF TG_TABLE_NAME = 'tv_shows' AND TG_OP = 'DELETE' THEN
        DELETE FROM tv_show_genres WHERE tv_show_id = OLD.id;
        DELETE FROM tv_show_credits WHERE tv_show_id = OLD.id;
    END IF;

    -- Clean up user-related data when user is deleted
    IF TG_TABLE_NAME = 'users' AND TG_OP = 'DELETE' THEN
        DELETE FROM reviews WHERE user_id = OLD.id;
        DELETE FROM watchlist WHERE user_id = OLD.id;
        DELETE FROM user_preferences WHERE user_id = OLD.id;
        DELETE FROM chatbot_conversations WHERE user_id = OLD.id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup triggers
CREATE TRIGGER cleanup_movie_orphans
    AFTER DELETE ON movies
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_records();

CREATE TRIGGER cleanup_tv_show_orphans
    AFTER DELETE ON tv_shows
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_records();

CREATE TRIGGER cleanup_user_orphans
    AFTER DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_records();

-- =============================================
-- STATISTICS UPDATE TRIGGERS
-- =============================================

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update statistics for query optimization
    IF TG_TABLE_NAME IN ('movies', 'tv_shows', 'reviews', 'watchlist') THEN
        -- This would typically be handled by auto-vacuum, but we can force it for critical tables
        PERFORM pg_stat_reset_single_table_counters(TG_RELID);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Note: Statistics triggers are typically not needed as PostgreSQL handles this automatically
-- But they're included here for completeness and can be enabled if needed

COMMIT;