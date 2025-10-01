-- Advanced Database Functions for Azure PostgreSQL
-- Movie Inferno - Comprehensive database functions for complex queries and business logic

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
$$ LANGUAGE plpgsql;

-- Function to validate content references
CREATE OR REPLACE FUNCTION validate_content_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content_type = 'movie' THEN
        IF NEW.movie_id IS NULL OR NEW.tv_show_id IS NOT NULL THEN
            RAISE EXCEPTION 'For movie content type, movie_id must be set and tv_show_id must be null';
        END IF;
    ELSIF NEW.content_type = 'tv_show' THEN
        IF NEW.tv_show_id IS NULL OR NEW.movie_id IS NOT NULL THEN
            RAISE EXCEPTION 'For tv_show content type, tv_show_id must be set and movie_id must be null';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SEARCH FUNCTIONS
-- =============================================

-- Advanced search function for movies with ranking and filtering
CREATE OR REPLACE FUNCTION search_movies(
    search_query TEXT DEFAULT '',
    genre_filter INTEGER[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    max_rating DECIMAL DEFAULT 10,
    min_year INTEGER DEFAULT 1900,
    max_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    sort_by VARCHAR(20) DEFAULT 'relevance', -- 'relevance', 'rating', 'popularity', 'release_date'
    sort_order VARCHAR(4) DEFAULT 'DESC', -- 'ASC', 'DESC'
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    release_date DATE,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    popularity DECIMAL(10,3),
    search_rank REAL,
    genre_names TEXT[]
) AS $$
DECLARE
    base_query TEXT;
    order_clause TEXT;
BEGIN
    -- Build the base query
    base_query := '
        SELECT 
            m.id,
            m.title,
            m.overview,
            m.release_date,
            m.poster_path,
            m.backdrop_path,
            m.vote_average,
            m.vote_count,
            m.popularity,
            CASE 
                WHEN $1 = '''' THEN 0
                ELSE (
                    ts_rank(
                        to_tsvector(''english'', COALESCE(m.title, '''') || '' '' || COALESCE(m.overview, '''')),
                        plainto_tsquery(''english'', $1)
                    ) +
                    CASE WHEN m.title ILIKE ''%'' || $1 || ''%'' THEN 0.5 ELSE 0 END +
                    CASE WHEN m.is_featured THEN 0.2 ELSE 0 END +
                    CASE WHEN m.is_trending THEN 0.3 ELSE 0 END
                )
            END as search_rank,
            ARRAY_AGG(DISTINCT g.name) as genre_names
        FROM movies m
        LEFT JOIN movie_genres mg ON m.id = mg.movie_id
        LEFT JOIN genres g ON mg.genre_id = g.id
        WHERE 1=1';

    -- Add search filter
    IF search_query != '' THEN
        base_query := base_query || '
            AND (
                to_tsvector(''english'', COALESCE(m.title, '''') || '' '' || COALESCE(m.overview, ''''))
                @@ plainto_tsquery(''english'', $1)
                OR m.title ILIKE ''%'' || $1 || ''%''
                OR m.overview ILIKE ''%'' || $1 || ''%''
            )';
    END IF;

    -- Add genre filter
    IF genre_filter IS NOT NULL THEN
        base_query := base_query || '
            AND EXISTS (
                SELECT 1 FROM movie_genres mg2 
                WHERE mg2.movie_id = m.id 
                AND mg2.genre_id = ANY($2)
            )';
    END IF;

    -- Add rating filter
    base_query := base_query || '
        AND m.vote_average >= $3 AND m.vote_average <= $4';

    -- Add year filter
    base_query := base_query || '
        AND EXTRACT(YEAR FROM m.release_date) >= $5 
        AND EXTRACT(YEAR FROM m.release_date) <= $6';

    -- Add grouping
    base_query := base_query || '
        GROUP BY m.id, m.title, m.overview, m.release_date, m.poster_path, 
                 m.backdrop_path, m.vote_average, m.vote_count, m.popularity,
                 m.is_featured, m.is_trending';

    -- Add ordering
    CASE sort_by
        WHEN 'rating' THEN order_clause := 'ORDER BY m.vote_average ' || sort_order;
        WHEN 'popularity' THEN order_clause := 'ORDER BY m.popularity ' || sort_order;
        WHEN 'release_date' THEN order_clause := 'ORDER BY m.release_date ' || sort_order;
        ELSE order_clause := 'ORDER BY search_rank ' || sort_order;
    END CASE;

    base_query := base_query || ' ' || order_clause;

    -- Add pagination
    base_query := base_query || ' LIMIT $9 OFFSET $10';

    -- Execute the query
    RETURN QUERY EXECUTE base_query 
    USING search_query, genre_filter, min_rating, max_rating, min_year, max_year, 
          sort_by, sort_order, limit_count, offset_count;
END;
$$ LANGUAGE plpgsql;

-- Similar function for TV shows
CREATE OR REPLACE FUNCTION search_tv_shows(
    search_query TEXT DEFAULT '',
    genre_filter INTEGER[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    max_rating DECIMAL DEFAULT 10,
    min_year INTEGER DEFAULT 1900,
    max_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    sort_by VARCHAR(20) DEFAULT 'relevance',
    sort_order VARCHAR(4) DEFAULT 'DESC',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(500),
    overview TEXT,
    first_air_date DATE,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    popularity DECIMAL(10,3),
    number_of_seasons INTEGER,
    search_rank REAL,
    genre_names TEXT[]
) AS $$
DECLARE
    base_query TEXT;
    order_clause TEXT;
BEGIN
    base_query := '
        SELECT 
            t.id,
            t.name,
            t.overview,
            t.first_air_date,
            t.poster_path,
            t.backdrop_path,
            t.vote_average,
            t.vote_count,
            t.popularity,
            t.number_of_seasons,
            CASE 
                WHEN $1 = '''' THEN 0
                ELSE (
                    ts_rank(
                        to_tsvector(''english'', COALESCE(t.name, '''') || '' '' || COALESCE(t.overview, '''')),
                        plainto_tsquery(''english'', $1)
                    ) +
                    CASE WHEN t.name ILIKE ''%'' || $1 || ''%'' THEN 0.5 ELSE 0 END +
                    CASE WHEN t.is_featured THEN 0.2 ELSE 0 END +
                    CASE WHEN t.is_trending THEN 0.3 ELSE 0 END
                )
            END as search_rank,
            ARRAY_AGG(DISTINCT g.name) as genre_names
        FROM tv_shows t
        LEFT JOIN tv_show_genres tg ON t.id = tg.tv_show_id
        LEFT JOIN genres g ON tg.genre_id = g.id
        WHERE 1=1';

    IF search_query != '' THEN
        base_query := base_query || '
            AND (
                to_tsvector(''english'', COALESCE(t.name, '''') || '' '' || COALESCE(t.overview, ''''))
                @@ plainto_tsquery(''english'', $1)
                OR t.name ILIKE ''%'' || $1 || ''%''
                OR t.overview ILIKE ''%'' || $1 || ''%''
            )';
    END IF;

    IF genre_filter IS NOT NULL THEN
        base_query := base_query || '
            AND EXISTS (
                SELECT 1 FROM tv_show_genres tg2 
                WHERE tg2.tv_show_id = t.id 
                AND tg2.genre_id = ANY($2)
            )';
    END IF;

    base_query := base_query || '
        AND t.vote_average >= $3 AND t.vote_average <= $4
        AND EXTRACT(YEAR FROM t.first_air_date) >= $5 
        AND EXTRACT(YEAR FROM t.first_air_date) <= $6
        GROUP BY t.id, t.name, t.overview, t.first_air_date, t.poster_path, 
                 t.backdrop_path, t.vote_average, t.vote_count, t.popularity,
                 t.number_of_seasons, t.is_featured, t.is_trending';

    CASE sort_by
        WHEN 'rating' THEN order_clause := 'ORDER BY t.vote_average ' || sort_order;
        WHEN 'popularity' THEN order_clause := 'ORDER BY t.popularity ' || sort_order;
        WHEN 'release_date' THEN order_clause := 'ORDER BY t.first_air_date ' || sort_order;
        ELSE order_clause := 'ORDER BY search_rank ' || sort_order;
    END CASE;

    base_query := base_query || ' ' || order_clause || ' LIMIT $9 OFFSET $10';

    RETURN QUERY EXECUTE base_query 
    USING search_query, genre_filter, min_rating, max_rating, min_year, max_year, 
          sort_by, sort_order, limit_count, offset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RECOMMENDATION FUNCTIONS
-- =============================================

-- Get personalized movie recommendations based on user preferences and history
CREATE OR REPLACE FUNCTION get_movie_recommendations(
    user_id_param UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    release_date DATE,
    poster_path VARCHAR(500),
    vote_average DECIMAL(3,1),
    popularity DECIMAL(10,3),
    recommendation_score DECIMAL(5,2),
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        SELECT 
            COALESCE(up.favorite_genres, ARRAY[]::INTEGER[]) as fav_genres,
            COALESCE(up.preferred_languages, ARRAY[]::VARCHAR[]) as pref_languages
        FROM user_preferences up 
        WHERE up.user_id = user_id_param
    ),
    user_ratings AS (
        SELECT 
            AVG(r.rating) as avg_user_rating,
            ARRAY_AGG(DISTINCT mg.genre_id) as rated_genres
        FROM reviews r
        JOIN movie_genres mg ON r.movie_id = mg.movie_id
        WHERE r.user_id = user_id_param AND r.rating IS NOT NULL
    ),
    watchlist_items AS (
        SELECT movie_id FROM watchlist 
        WHERE user_id = user_id_param AND content_type = 'movie'
    )
    SELECT 
        m.id,
        m.title,
        m.overview,
        m.release_date,
        m.poster_path,
        m.vote_average,
        m.popularity,
        (
            -- Base score from movie rating and popularity
            (m.vote_average / 10.0 * 40) +
            (LEAST(m.popularity / 100.0, 1.0) * 20) +
            -- Genre preference bonus
            CASE WHEN EXISTS (
                SELECT 1 FROM movie_genres mg 
                JOIN user_preferences up ON mg.genre_id = ANY(up.fav_genres)
                WHERE mg.movie_id = m.id
            ) THEN 25 ELSE 0 END +
            -- Language preference bonus
            CASE WHEN EXISTS (
                SELECT 1 FROM user_preferences up 
                WHERE m.original_language = ANY(up.pref_languages)
            ) THEN 10 ELSE 0 END +
            -- Trending bonus
            CASE WHEN m.is_trending THEN 5 ELSE 0 END
        )::DECIMAL(5,2) as recommendation_score,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM movie_genres mg 
                JOIN user_preferences up ON mg.genre_id = ANY(up.fav_genres)
                WHERE mg.movie_id = m.id
            ) THEN 'Matches your favorite genres'
            WHEN m.is_trending THEN 'Currently trending'
            WHEN m.vote_average >= 8.0 THEN 'Highly rated'
            ELSE 'Popular choice'
        END as reason
    FROM movies m
    CROSS JOIN user_preferences
    LEFT JOIN user_ratings ur ON true
    WHERE m.id NOT IN (SELECT movie_id FROM watchlist_items WHERE movie_id IS NOT NULL)
    AND m.id NOT IN (
        SELECT movie_id FROM reviews 
        WHERE user_id = user_id_param AND movie_id IS NOT NULL
    )
    AND m.vote_average >= 6.0
    ORDER BY recommendation_score DESC, m.popularity DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get similar movies based on genres, cast, and user ratings
CREATE OR REPLACE FUNCTION get_similar_movies(
    movie_id_param INTEGER,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    release_date DATE,
    poster_path VARCHAR(500),
    vote_average DECIMAL(3,1),
    similarity_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH target_movie AS (
        SELECT m.*, ARRAY_AGG(mg.genre_id) as genres
        FROM movies m
        LEFT JOIN movie_genres mg ON m.id = mg.movie_id
        WHERE m.id = movie_id_param
        GROUP BY m.id
    ),
    target_cast AS (
        SELECT ARRAY_AGG(mc.person_id) as cast_ids
        FROM movie_credits mc
        WHERE mc.movie_id = movie_id_param 
        AND mc.department = 'Acting'
        ORDER BY mc.credit_order
        LIMIT 10
    )
    SELECT 
        m.id,
        m.title,
        m.overview,
        m.release_date,
        m.poster_path,
        m.vote_average,
        (
            -- Genre similarity (40 points max)
            (
                SELECT COUNT(*) * 8.0
                FROM unnest(tm.genres) AS genre_id
                WHERE genre_id IN (
                    SELECT mg.genre_id FROM movie_genres mg WHERE mg.movie_id = m.id
                )
            ) +
            -- Cast similarity (30 points max)
            (
                SELECT COUNT(*) * 3.0
                FROM unnest(tc.cast_ids) AS cast_id
                WHERE cast_id IN (
                    SELECT mc.person_id FROM movie_credits mc 
                    WHERE mc.movie_id = m.id AND mc.department = 'Acting'
                )
            ) +
            -- Rating similarity (20 points max)
            (20 - ABS(m.vote_average - tm.vote_average) * 2) +
            -- Release year proximity (10 points max)
            GREATEST(0, 10 - ABS(EXTRACT(YEAR FROM m.release_date) - EXTRACT(YEAR FROM tm.release_date)) / 2)
        )::DECIMAL(5,2) as similarity_score
    FROM movies m
    CROSS JOIN target_movie tm
    CROSS JOIN target_cast tc
    WHERE m.id != movie_id_param
    AND m.vote_average >= 5.0
    ORDER BY similarity_score DESC, m.vote_average DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Update content analytics (called by triggers)
CREATE OR REPLACE FUNCTION update_content_analytics()
RETURNS TRIGGER AS $$
DECLARE
    content_type_val content_type;
    content_id_val INTEGER;
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
    watchlist_count INTEGER;
BEGIN
    -- Determine content type and ID
    IF TG_TABLE_NAME = 'reviews' THEN
        IF NEW.content_type = 'movie' THEN
            content_type_val := 'movie';
            content_id_val := COALESCE(NEW.movie_id, OLD.movie_id);
        ELSE
            content_type_val := 'tv_show';
            content_id_val := COALESCE(NEW.tv_show_id, OLD.tv_show_id);
        END IF;
    ELSIF TG_TABLE_NAME = 'watchlist' THEN
        content_type_val := COALESCE(NEW.content_type, OLD.content_type);
        IF content_type_val = 'movie' THEN
            content_id_val := COALESCE(NEW.movie_id, OLD.movie_id);
        ELSE
            content_id_val := COALESCE(NEW.tv_show_id, OLD.tv_show_id);
        END IF;
    END IF;

    -- Calculate metrics
    IF content_type_val = 'movie' THEN
        SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
        FROM reviews 
        WHERE movie_id = content_id_val AND rating IS NOT NULL;
        
        SELECT COUNT(*) INTO watchlist_count
        FROM watchlist
        WHERE movie_id = content_id_val;
    ELSE
        SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
        FROM reviews 
        WHERE tv_show_id = content_id_val AND rating IS NOT NULL;
        
        SELECT COUNT(*) INTO watchlist_count
        FROM watchlist
        WHERE tv_show_id = content_id_val;
    END IF;

    -- Update or insert analytics
    INSERT INTO content_analytics (content_type, content_id, average_rating, review_count, watchlist_count, last_updated)
    VALUES (content_type_val, content_id_val, COALESCE(avg_rating, 0), review_count, watchlist_count, NOW())
    ON CONFLICT (content_type, content_id) 
    DO UPDATE SET 
        average_rating = EXCLUDED.average_rating,
        review_count = EXCLUDED.review_count,
        watchlist_count = EXCLUDED.watchlist_count,
        last_updated = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Get trending content based on recent activity
CREATE OR REPLACE FUNCTION get_trending_content(
    content_type_param content_type DEFAULT 'movie',
    days_back INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    content_id INTEGER,
    title VARCHAR(500),
    poster_path VARCHAR(500),
    vote_average DECIMAL(3,1),
    trending_score DECIMAL(8,2)
) AS $$
BEGIN
    IF content_type_param = 'movie' THEN
        RETURN QUERY
        SELECT 
            m.id as content_id,
            m.title,
            m.poster_path,
            m.vote_average,
            (
                -- Recent reviews weight
                COALESCE((
                    SELECT COUNT(*) * 10 
                    FROM reviews r 
                    WHERE r.movie_id = m.id 
                    AND r.created_at >= NOW() - INTERVAL '%s days'
                ), 0) +
                -- Recent watchlist additions weight
                COALESCE((
                    SELECT COUNT(*) * 5 
                    FROM watchlist w 
                    WHERE w.movie_id = m.id 
                    AND w.added_at >= NOW() - INTERVAL '%s days'
                ), 0) +
                -- Base popularity
                (m.popularity / 10)
            )::DECIMAL(8,2) as trending_score
        FROM movies m
        WHERE m.vote_average >= 6.0
        ORDER BY trending_score DESC, m.vote_average DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT 
            t.id as content_id,
            t.name as title,
            t.poster_path,
            t.vote_average,
            (
                COALESCE((
                    SELECT COUNT(*) * 10 
                    FROM reviews r 
                    WHERE r.tv_show_id = t.id 
                    AND r.created_at >= NOW() - INTERVAL '%s days'
                ), 0) +
                COALESCE((
                    SELECT COUNT(*) * 5 
                    FROM watchlist w 
                    WHERE w.tv_show_id = t.id 
                    AND w.added_at >= NOW() - INTERVAL '%s days'
                ), 0) +
                (t.popularity / 10)
            )::DECIMAL(8,2) as trending_score
        FROM tv_shows t
        WHERE t.vote_average >= 6.0
        ORDER BY trending_score DESC, t.vote_average DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- USER STATISTICS FUNCTIONS
-- =============================================

-- Get comprehensive user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_id_param UUID)
RETURNS TABLE (
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    watchlist_count INTEGER,
    watched_count INTEGER,
    favorite_genre VARCHAR(100),
    total_watch_time INTEGER, -- in minutes
    review_streak INTEGER -- days
) AS $$
BEGIN
    RETURN QUERY
    WITH user_reviews AS (
        SELECT COUNT(*) as review_count, AVG(rating) as avg_rating
        FROM reviews WHERE user_id = user_id_param
    ),
    user_watchlist AS (
        SELECT 
            COUNT(*) as total_watchlist,
            COUNT(*) FILTER (WHERE watched = true) as watched_items
        FROM watchlist WHERE user_id = user_id_param
    ),
    user_genre_preference AS (
        SELECT g.name, COUNT(*) as genre_count
        FROM reviews r
        JOIN movie_genres mg ON r.movie_id = mg.movie_id
        JOIN genres g ON mg.genre_id = g.id
        WHERE r.user_id = user_id_param
        GROUP BY g.name
        ORDER BY genre_count DESC
        LIMIT 1
    ),
    watch_time AS (
        SELECT COALESCE(SUM(m.runtime), 0) as total_minutes
        FROM watchlist w
        JOIN movies m ON w.movie_id = m.id
        WHERE w.user_id = user_id_param AND w.watched = true
    )
    SELECT 
        ur.review_count::INTEGER,
        ur.avg_rating::DECIMAL(3,2),
        uw.total_watchlist::INTEGER,
        uw.watched_items::INTEGER,
        COALESCE(ugp.name, 'None'::VARCHAR(100)),
        wt.total_minutes::INTEGER,
        0::INTEGER -- Placeholder for review streak calculation
    FROM user_reviews ur
    CROSS JOIN user_watchlist uw
    LEFT JOIN user_genre_preference ugp ON true
    CROSS JOIN watch_time wt;
END;
$$ LANGUAGE plpgsql;