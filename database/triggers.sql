-- Movie Inferno Database Triggers
-- Automated triggers for data integrity and business logic

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate content analytics
CREATE OR REPLACE FUNCTION update_content_analytics()
RETURNS TRIGGER AS $$
DECLARE
    content_type_val VARCHAR(20);
    content_id_val INTEGER;
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    -- Determine content type and ID based on the table
    IF TG_TABLE_NAME = 'movie_reviews' THEN
        content_type_val := 'movie';
        content_id_val := COALESCE(NEW.movie_id, OLD.movie_id);
    ELSIF TG_TABLE_NAME = 'tv_show_reviews' THEN
        content_type_val := 'tv_show';
        content_id_val := COALESCE(NEW.tv_show_id, OLD.tv_show_id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate average rating and count
    IF content_type_val = 'movie' THEN
        SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
        FROM movie_reviews 
        WHERE movie_id = content_id_val AND rating IS NOT NULL;
    ELSE
        SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
        FROM tv_show_reviews 
        WHERE tv_show_id = content_id_val AND rating IS NOT NULL;
    END IF;

    -- Update or insert analytics
    INSERT INTO content_analytics (content_type, content_id, average_rating, comment_count, last_updated)
    VALUES (content_type_val, content_id_val, COALESCE(avg_rating, 0), review_count, NOW())
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
        average_rating = COALESCE(avg_rating, 0),
        comment_count = review_count,
        last_updated = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_type_val VARCHAR(50);
    content_type_val VARCHAR(20);
    content_id_val INTEGER;
    user_id_val UUID;
BEGIN
    -- Determine activity type based on table and operation
    IF TG_TABLE_NAME = 'user_watchlists' THEN
        activity_type_val := CASE TG_OP 
            WHEN 'INSERT' THEN 'add_to_watchlist'
            WHEN 'DELETE' THEN 'remove_from_watchlist'
            ELSE 'update_watchlist'
        END;
        content_type_val := COALESCE(NEW.content_type, OLD.content_type);
        content_id_val := COALESCE(NEW.content_id, OLD.content_id);
        user_id_val := COALESCE(NEW.user_id, OLD.user_id);
    ELSIF TG_TABLE_NAME = 'user_favorites' THEN
        activity_type_val := CASE TG_OP 
            WHEN 'INSERT' THEN 'add_to_favorites'
            WHEN 'DELETE' THEN 'remove_from_favorites'
            ELSE 'update_favorites'
        END;
        content_type_val := COALESCE(NEW.content_type, OLD.content_type);
        content_id_val := COALESCE(NEW.content_id, OLD.content_id);
        user_id_val := COALESCE(NEW.user_id, OLD.user_id);
    ELSIF TG_TABLE_NAME = 'movie_reviews' THEN
        activity_type_val := CASE TG_OP 
            WHEN 'INSERT' THEN 'create_movie_review'
            WHEN 'UPDATE' THEN 'update_movie_review'
            WHEN 'DELETE' THEN 'delete_movie_review'
        END;
        content_type_val := 'movie';
        content_id_val := COALESCE(NEW.movie_id, OLD.movie_id);
        user_id_val := COALESCE(NEW.user_id, OLD.user_id);
    ELSIF TG_TABLE_NAME = 'tv_show_reviews' THEN
        activity_type_val := CASE TG_OP 
            WHEN 'INSERT' THEN 'create_tv_review'
            WHEN 'UPDATE' THEN 'update_tv_review'
            WHEN 'DELETE' THEN 'delete_tv_review'
        END;
        content_type_val := 'tv_show';
        content_id_val := COALESCE(NEW.tv_show_id, OLD.tv_show_id);
        user_id_val := COALESCE(NEW.user_id, OLD.user_id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Insert activity log
    INSERT INTO user_activity_logs (user_id, activity_type, content_type, content_id, created_at)
    VALUES (user_id_val, activity_type_val, content_type_val, content_id_val, NOW());

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update movie vote statistics
CREATE OR REPLACE FUNCTION update_movie_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,1);
    total_votes INTEGER;
BEGIN
    -- Calculate new statistics
    SELECT AVG(rating), COUNT(*) INTO avg_rating, total_votes
    FROM movie_reviews 
    WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id) AND rating IS NOT NULL;

    -- Update movie table
    UPDATE movies 
    SET 
        vote_average = COALESCE(avg_rating, 0),
        vote_count = total_votes,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update TV show vote statistics
CREATE OR REPLACE FUNCTION update_tv_show_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,1);
    total_votes INTEGER;
BEGIN
    -- Calculate new statistics
    SELECT AVG(rating), COUNT(*) INTO avg_rating, total_votes
    FROM tv_show_reviews 
    WHERE tv_show_id = COALESCE(NEW.tv_show_id, OLD.tv_show_id) AND rating IS NOT NULL;

    -- Update TV show table
    UPDATE tv_shows 
    SET 
        vote_average = COALESCE(avg_rating, 0),
        vote_count = total_votes,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.tv_show_id, OLD.tv_show_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to validate rating range
CREATE OR REPLACE FUNCTION validate_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rating IS NOT NULL AND (NEW.rating < 0 OR NEW.rating > 10) THEN
        RAISE EXCEPTION 'Rating must be between 0 and 10';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to prevent duplicate watchlist entries
CREATE OR REPLACE FUNCTION prevent_duplicate_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if item already exists in watchlist
    IF EXISTS (
        SELECT 1 FROM user_watchlists 
        WHERE user_id = NEW.user_id 
        AND content_type = NEW.content_type 
        AND content_id = NEW.content_id
    ) THEN
        RAISE EXCEPTION 'Item already exists in watchlist';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update trending scores
CREATE OR REPLACE FUNCTION update_trending_score()
RETURNS TRIGGER AS $$
DECLARE
    trending_score DECIMAL(10,3);
    days_since_release INTEGER;
    popularity_weight DECIMAL(5,2);
    rating_weight DECIMAL(5,2);
    recency_weight DECIMAL(5,2);
BEGIN
    -- Calculate trending score based on multiple factors
    IF TG_TABLE_NAME = 'movies' THEN
        days_since_release := EXTRACT(DAY FROM NOW() - NEW.release_date);
        
        -- Weight factors (more recent = higher weight)
        recency_weight := CASE 
            WHEN days_since_release <= 30 THEN 1.0
            WHEN days_since_release <= 90 THEN 0.8
            WHEN days_since_release <= 365 THEN 0.5
            ELSE 0.2
        END;
        
        popularity_weight := LEAST(NEW.popularity / 100.0, 1.0);
        rating_weight := NEW.vote_average / 10.0;
        
        trending_score := (popularity_weight * 0.4 + rating_weight * 0.3 + recency_weight * 0.3) * 100;
        
        -- Update trending flag
        NEW.is_trending := trending_score > 50;
        
    ELSIF TG_TABLE_NAME = 'tv_shows' THEN
        days_since_release := EXTRACT(DAY FROM NOW() - NEW.first_air_date);
        
        recency_weight := CASE 
            WHEN days_since_release <= 30 THEN 1.0
            WHEN days_since_release <= 90 THEN 0.8
            WHEN days_since_release <= 365 THEN 0.5
            ELSE 0.2
        END;
        
        popularity_weight := LEAST(NEW.popularity / 100.0, 1.0);
        rating_weight := NEW.vote_average / 10.0;
        
        trending_score := (popularity_weight * 0.4 + rating_weight * 0.3 + recency_weight * 0.3) * 100;
        
        NEW.is_trending := trending_score > 50;
    END IF;

    -- Update content analytics
    INSERT INTO content_analytics (content_type, content_id, trending_score, last_updated)
    VALUES (
        CASE TG_TABLE_NAME WHEN 'movies' THEN 'movie' ELSE 'tv_show' END,
        NEW.id,
        trending_score,
        NOW()
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
        trending_score = trending_score,
        last_updated = NOW();

    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- TRIGGER DEFINITIONS
-- =============================================

-- Updated_at triggers for all main tables
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

CREATE TRIGGER update_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movie_reviews_updated_at
    BEFORE UPDATE ON movie_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tv_show_reviews_updated_at
    BEFORE UPDATE ON tv_show_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_lists_updated_at
    BEFORE UPDATE ON user_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Rating validation triggers
CREATE TRIGGER validate_movie_review_rating
    BEFORE INSERT OR UPDATE ON movie_reviews
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating();

CREATE TRIGGER validate_tv_show_review_rating
    BEFORE INSERT OR UPDATE ON tv_show_reviews
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating();

-- Vote statistics update triggers
CREATE TRIGGER update_movie_stats_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON movie_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_movie_vote_stats();

CREATE TRIGGER update_tv_show_stats_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON tv_show_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_tv_show_vote_stats();

-- Content analytics triggers
CREATE TRIGGER update_movie_analytics
    AFTER INSERT OR UPDATE OR DELETE ON movie_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

CREATE TRIGGER update_tv_show_analytics
    AFTER INSERT OR UPDATE OR DELETE ON tv_show_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_content_analytics();

-- User activity logging triggers
CREATE TRIGGER log_watchlist_activity
    AFTER INSERT OR UPDATE OR DELETE ON user_watchlists
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_favorites_activity
    AFTER INSERT OR UPDATE OR DELETE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_movie_review_activity
    AFTER INSERT OR UPDATE OR DELETE ON movie_reviews
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_tv_show_review_activity
    AFTER INSERT OR UPDATE OR DELETE ON tv_show_reviews
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- Trending score update triggers
CREATE TRIGGER update_movie_trending_score
    BEFORE INSERT OR UPDATE ON movies
    FOR EACH ROW
    EXECUTE FUNCTION update_trending_score();

CREATE TRIGGER update_tv_show_trending_score
    BEFORE INSERT OR UPDATE ON tv_shows
    FOR EACH ROW
    EXECUTE FUNCTION update_trending_score();

-- Duplicate prevention triggers
CREATE TRIGGER prevent_duplicate_watchlist_entry
    BEFORE INSERT ON user_watchlists
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_watchlist();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on user-specific tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_show_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY users_own_data ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY user_watchlists_own_data ON user_watchlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_favorites_own_data ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_watch_history_own_data ON user_watch_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_lists_own_data ON user_lists
    FOR ALL USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY user_list_items_own_data ON user_list_items
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM user_lists WHERE id = list_id)
        OR EXISTS (SELECT 1 FROM user_lists WHERE id = list_id AND is_public = true)
    );

CREATE POLICY movie_reviews_own_data ON movie_reviews
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY tv_show_reviews_own_data ON tv_show_reviews
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_activity_logs_own_data ON user_activity_logs
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for content tables
CREATE POLICY public_read_movies ON movies
    FOR SELECT USING (true);

CREATE POLICY public_read_tv_shows ON tv_shows
    FOR SELECT USING (true);

CREATE POLICY public_read_people ON people
    FOR SELECT USING (true);

CREATE POLICY public_read_genres ON genres
    FOR SELECT USING (true);

CREATE POLICY public_read_collections ON collections
    FOR SELECT USING (true);

-- Public read access for reviews (but users can only modify their own)
CREATE POLICY public_read_movie_reviews ON movie_reviews
    FOR SELECT USING (true);

CREATE POLICY public_read_tv_show_reviews ON tv_show_reviews
    FOR SELECT USING (true);