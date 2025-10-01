-- Movie Inferno Database Functions and Stored Procedures
-- Advanced database functions for complex queries and business logic

-- =============================================
-- SEARCH FUNCTIONS
-- =============================================

-- Advanced search function for movies with ranking
CREATE OR REPLACE FUNCTION search_movies(
    search_query TEXT,
    genre_filter INTEGER[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    max_rating DECIMAL DEFAULT 10,
    min_year INTEGER DEFAULT 1900,
    max_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    release_date DATE,
    poster_url TEXT,
    backdrop_url TEXT,
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    popularity DECIMAL(10,3),
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.overview,
        m.release_date,
        m.poster_url,
        m.backdrop_url,
        m.vote_average,
        m.vote_count,
        m.popularity,
        (
            ts_rank(
                to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.overview, '')),
                plainto_tsquery('english', search_query)
            ) +
            CASE WHEN m.title ILIKE '%' || search_query || '%' THEN 0.5 ELSE 0 END +
            CASE WHEN m.is_featured THEN 0.2 ELSE 0 END +
            CASE WHEN m.is_trending THEN 0.3 ELSE 0 END
        )::REAL AS search_rank
    FROM movies m
    LEFT JOIN movie_genres mg ON m.id = mg.movie_id
    WHERE 
        (
            search_query IS NULL OR search_query = '' OR
            to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.overview, '')) @@ plainto_tsquery('english', search_query) OR
            m.title ILIKE '%' || search_query || '%' OR
            m.original_title ILIKE '%' || search_query || '%'
        )
        AND (genre_filter IS NULL OR mg.genre_id = ANY(genre_filter))
        AND m.vote_average >= min_rating
        AND m.vote_average <= max_rating
        AND EXTRACT(YEAR FROM m.release_date) >= min_year
        AND EXTRACT(YEAR FROM m.release_date) <= max_year
    GROUP BY m.id, m.title, m.overview, m.release_date, m.poster_url, m.backdrop_url, 
             m.vote_average, m.vote_count, m.popularity, m.is_featured, m.is_trending
    ORDER BY search_rank DESC, m.popularity DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Advanced search function for TV shows
CREATE OR REPLACE FUNCTION search_tv_shows(
    search_query TEXT,
    genre_filter INTEGER[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    max_rating DECIMAL DEFAULT 10,
    min_year INTEGER DEFAULT 1900,
    max_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(500),
    overview TEXT,
    first_air_date DATE,
    poster_url TEXT,
    backdrop_url TEXT,
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    popularity DECIMAL(10,3),
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.overview,
        t.first_air_date,
        t.poster_url,
        t.backdrop_url,
        t.vote_average,
        t.vote_count,
        t.popularity,
        (
            ts_rank(
                to_tsvector('english', COALESCE(t.name, '') || ' ' || COALESCE(t.overview, '')),
                plainto_tsquery('english', search_query)
            ) +
            CASE WHEN t.name ILIKE '%' || search_query || '%' THEN 0.5 ELSE 0 END +
            CASE WHEN t.is_featured THEN 0.2 ELSE 0 END +
            CASE WHEN t.is_trending THEN 0.3 ELSE 0 END
        )::REAL AS search_rank
    FROM tv_shows t
    LEFT JOIN tv_show_genres tg ON t.id = tg.tv_show_id
    WHERE 
        (
            search_query IS NULL OR search_query = '' OR
            to_tsvector('english', COALESCE(t.name, '') || ' ' || COALESCE(t.overview, '')) @@ plainto_tsquery('english', search_query) OR
            t.name ILIKE '%' || search_query || '%' OR
            t.original_name ILIKE '%' || search_query || '%'
        )
        AND (genre_filter IS NULL OR tg.genre_id = ANY(genre_filter))
        AND t.vote_average >= min_rating
        AND t.vote_average <= max_rating
        AND EXTRACT(YEAR FROM t.first_air_date) >= min_year
        AND EXTRACT(YEAR FROM t.first_air_date) <= max_year
    GROUP BY t.id, t.name, t.overview, t.first_air_date, t.poster_url, t.backdrop_url, 
             t.vote_average, t.vote_count, t.popularity, t.is_featured, t.is_trending
    ORDER BY search_rank DESC, t.popularity DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Search people function
CREATE OR REPLACE FUNCTION search_people(
    search_query TEXT,
    department_filter VARCHAR DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    biography TEXT,
    profile_url TEXT,
    known_for_department VARCHAR(100),
    popularity DECIMAL(10,3),
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.biography,
        p.profile_url,
        p.known_for_department,
        p.popularity,
        (
            ts_rank(
                to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.biography, '')),
                plainto_tsquery('english', search_query)
            ) +
            CASE WHEN p.name ILIKE '%' || search_query || '%' THEN 0.8 ELSE 0 END +
            CASE WHEN p.is_featured THEN 0.2 ELSE 0 END
        )::REAL AS search_rank
    FROM people p
    WHERE 
        (
            search_query IS NULL OR search_query = '' OR
            to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.biography, '')) @@ plainto_tsquery('english', search_query) OR
            p.name ILIKE '%' || search_query || '%'
        )
        AND (department_filter IS NULL OR p.known_for_department = department_filter)
    ORDER BY search_rank DESC, p.popularity DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RECOMMENDATION FUNCTIONS
-- =============================================

-- Get movie recommendations based on user preferences
CREATE OR REPLACE FUNCTION get_movie_recommendations(
    user_id_param UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    poster_url TEXT,
    vote_average DECIMAL(3,1),
    recommendation_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        -- Get user's favorite genres based on their ratings and watchlist
        SELECT 
            mg.genre_id,
            AVG(mr.rating) as avg_rating,
            COUNT(*) as interaction_count
        FROM movie_reviews mr
        JOIN movie_genres mg ON mr.movie_id = mg.movie_id
        WHERE mr.user_id = user_id_param AND mr.rating >= 7
        GROUP BY mg.genre_id
        
        UNION ALL
        
        SELECT 
            mg.genre_id,
            8.0 as avg_rating, -- Assume positive preference for watchlisted items
            COUNT(*) as interaction_count
        FROM user_watchlists uw
        JOIN movie_genres mg ON uw.content_id = mg.movie_id
        WHERE uw.user_id = user_id_param AND uw.content_type = 'movie'
        GROUP BY mg.genre_id
    ),
    genre_preferences AS (
        SELECT 
            genre_id,
            AVG(avg_rating) as preference_score,
            SUM(interaction_count) as total_interactions
        FROM user_preferences
        GROUP BY genre_id
        ORDER BY preference_score DESC, total_interactions DESC
        LIMIT 5
    ),
    excluded_movies AS (
        -- Movies user has already rated or added to watchlist
        SELECT movie_id as id FROM movie_reviews WHERE user_id = user_id_param
        UNION
        SELECT content_id as id FROM user_watchlists 
        WHERE user_id = user_id_param AND content_type = 'movie'
    )
    SELECT 
        m.id,
        m.title,
        m.overview,
        m.poster_url,
        m.vote_average,
        (
            (gp.preference_score / 10.0) * 0.4 +
            (m.vote_average / 10.0) * 0.3 +
            (LEAST(m.popularity / 100.0, 1.0)) * 0.2 +
            (CASE WHEN m.is_trending THEN 0.1 ELSE 0 END)
        )::DECIMAL(5,2) as recommendation_score
    FROM movies m
    JOIN movie_genres mg ON m.id = mg.movie_id
    JOIN genre_preferences gp ON mg.genre_id = gp.genre_id
    WHERE m.id NOT IN (SELECT id FROM excluded_movies)
    AND m.vote_average >= 6.0
    AND m.vote_count >= 100
    GROUP BY m.id, m.title, m.overview, m.poster_url, m.vote_average, 
             m.popularity, m.is_trending, gp.preference_score
    ORDER BY recommendation_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get similar movies based on genres and cast
CREATE OR REPLACE FUNCTION get_similar_movies(
    movie_id_param INTEGER,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    poster_url TEXT,
    vote_average DECIMAL(3,1),
    similarity_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH movie_genres AS (
        SELECT genre_id FROM movie_genres WHERE movie_id = movie_id_param
    ),
    movie_cast AS (
        SELECT person_id FROM movie_credits 
        WHERE movie_id = movie_id_param AND credit_type = 'cast'
        ORDER BY credit_order LIMIT 10
    ),
    movie_crew AS (
        SELECT person_id FROM movie_credits 
        WHERE movie_id = movie_id_param AND credit_type = 'crew' 
        AND job_title IN ('Director', 'Writer', 'Producer')
    )
    SELECT 
        m.id,
        m.title,
        m.overview,
        m.poster_url,
        m.vote_average,
        (
            -- Genre similarity (40%)
            (SELECT COUNT(*) FROM movie_genres mg1 
             JOIN movie_genres mg2 ON mg1.genre_id = mg2.genre_id 
             WHERE mg1.movie_id = m.id AND mg2.movie_id = movie_id_param)::DECIMAL / 
            GREATEST((SELECT COUNT(*) FROM movie_genres WHERE movie_id = movie_id_param), 1) * 0.4 +
            
            -- Cast similarity (30%)
            (SELECT COUNT(*) FROM movie_credits mc1 
             JOIN movie_cast mc2 ON mc1.person_id = mc2.person_id 
             WHERE mc1.movie_id = m.id AND mc1.credit_type = 'cast')::DECIMAL / 10.0 * 0.3 +
            
            -- Crew similarity (20%)
            (SELECT COUNT(*) FROM movie_credits mc1 
             JOIN movie_crew mc2 ON mc1.person_id = mc2.person_id 
             WHERE mc1.movie_id = m.id AND mc1.credit_type = 'crew')::DECIMAL / 3.0 * 0.2 +
            
            -- Rating similarity (10%)
            (1.0 - ABS(m.vote_average - (SELECT vote_average FROM movies WHERE id = movie_id_param)) / 10.0) * 0.1
        )::DECIMAL(5,2) as similarity_score
    FROM movies m
    WHERE m.id != movie_id_param
    AND m.vote_count >= 50
    AND EXISTS (
        SELECT 1 FROM movie_genres mg1 
        JOIN movie_genres mg2 ON mg1.genre_id = mg2.genre_id 
        WHERE mg1.movie_id = m.id AND mg2.movie_id = movie_id_param
    )
    ORDER BY similarity_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Get trending content based on recent activity
CREATE OR REPLACE FUNCTION get_trending_content(
    content_type_param VARCHAR DEFAULT 'movie',
    time_period_days INTEGER DEFAULT 7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    content_id INTEGER,
    title_or_name VARCHAR(500),
    poster_url TEXT,
    trending_score DECIMAL(10,3),
    view_count INTEGER,
    rating_count INTEGER,
    average_rating DECIMAL(3,2)
) AS $$
BEGIN
    IF content_type_param = 'movie' THEN
        RETURN QUERY
        SELECT 
            m.id as content_id,
            m.title as title_or_name,
            m.poster_url,
            COALESCE(ca.trending_score, 0) as trending_score,
            COALESCE(ca.view_count, 0) as view_count,
            COALESCE(ca.comment_count, 0) as rating_count,
            COALESCE(ca.average_rating, 0) as average_rating
        FROM movies m
        LEFT JOIN content_analytics ca ON ca.content_type = 'movie' AND ca.content_id = m.id
        WHERE ca.last_updated >= NOW() - INTERVAL '%s days' OR ca.last_updated IS NULL
        ORDER BY COALESCE(ca.trending_score, m.popularity) DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT 
            t.id as content_id,
            t.name as title_or_name,
            t.poster_url,
            COALESCE(ca.trending_score, 0) as trending_score,
            COALESCE(ca.view_count, 0) as view_count,
            COALESCE(ca.comment_count, 0) as rating_count,
            COALESCE(ca.average_rating, 0) as average_rating
        FROM tv_shows t
        LEFT JOIN content_analytics ca ON ca.content_type = 'tv_show' AND ca.content_id = t.id
        WHERE ca.last_updated >= NOW() - INTERVAL '%s days' OR ca.last_updated IS NULL
        ORDER BY COALESCE(ca.trending_score, t.popularity) DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_id_param UUID)
RETURNS TABLE (
    total_movies_watched INTEGER,
    total_tv_shows_watched INTEGER,
    total_reviews_written INTEGER,
    average_rating_given DECIMAL(3,2),
    favorite_genre VARCHAR(100),
    total_watchlist_items INTEGER,
    account_age_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_watch_history 
         WHERE user_id = user_id_param AND content_type = 'movie')::INTEGER as total_movies_watched,
        
        (SELECT COUNT(*) FROM user_watch_history 
         WHERE user_id = user_id_param AND content_type = 'tv_show')::INTEGER as total_tv_shows_watched,
        
        (SELECT COUNT(*) FROM movie_reviews WHERE user_id = user_id_param)::INTEGER +
        (SELECT COUNT(*) FROM tv_show_reviews WHERE user_id = user_id_param)::INTEGER as total_reviews_written,
        
        (SELECT AVG(rating) FROM (
            SELECT rating FROM movie_reviews WHERE user_id = user_id_param
            UNION ALL
            SELECT rating FROM tv_show_reviews WHERE user_id = user_id_param
        ) all_ratings)::DECIMAL(3,2) as average_rating_given,
        
        (SELECT g.name FROM genres g
         JOIN (
             SELECT mg.genre_id, COUNT(*) as genre_count
             FROM movie_reviews mr
             JOIN movie_genres mg ON mr.movie_id = mg.movie_id
             WHERE mr.user_id = user_id_param
             GROUP BY mg.genre_id
             ORDER BY genre_count DESC
             LIMIT 1
         ) top_genre ON g.id = top_genre.genre_id) as favorite_genre,
        
        (SELECT COUNT(*) FROM user_watchlists 
         WHERE user_id = user_id_param)::INTEGER as total_watchlist_items,
        
        (SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER 
         FROM users WHERE id = user_id_param) as account_age_days;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get movies by mood (for chatbot)
CREATE OR REPLACE FUNCTION get_movies_by_mood(
    mood_param VARCHAR,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(500),
    overview TEXT,
    poster_url TEXT,
    vote_average DECIMAL(3,1),
    genre_names TEXT
) AS $$
DECLARE
    genre_ids INTEGER[];
BEGIN
    -- Map moods to genre IDs
    CASE mood_param
        WHEN 'happy' THEN genre_ids := ARRAY[35, 10751, 16]; -- Comedy, Family, Animation
        WHEN 'sad' THEN genre_ids := ARRAY[18, 10749]; -- Drama, Romance
        WHEN 'thrilled' THEN genre_ids := ARRAY[28, 53, 12]; -- Action, Thriller, Adventure
        WHEN 'thoughtful' THEN genre_ids := ARRAY[9648, 878, 99]; -- Mystery, Sci-Fi, Documentary
        WHEN 'relaxed' THEN genre_ids := ARRAY[10749, 18, 10770]; -- Romance, Drama, TV Movie
        ELSE genre_ids := ARRAY[35, 28, 18]; -- Default: Comedy, Action, Drama
    END CASE;

    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.overview,
        m.poster_url,
        m.vote_average,
        STRING_AGG(g.name, ', ' ORDER BY g.name) as genre_names
    FROM movies m
    JOIN movie_genres mg ON m.id = mg.movie_id
    JOIN genres g ON mg.genre_id = g.id
    WHERE mg.genre_id = ANY(genre_ids)
    AND m.vote_average >= 6.0
    AND m.vote_count >= 100
    GROUP BY m.id, m.title, m.overview, m.poster_url, m.vote_average, m.popularity
    ORDER BY m.popularity DESC, m.vote_average DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_activity_logs 
    WHERE created_at < NOW() - INTERVAL '%s days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update content popularity scores
CREATE OR REPLACE FUNCTION update_popularity_scores()
RETURNS VOID AS $$
BEGIN
    -- Update movie popularity based on recent activity
    UPDATE movies SET popularity = (
        SELECT COALESCE(
            (ca.view_count * 0.3 + ca.like_count * 0.4 + ca.comment_count * 0.3) / 10.0,
            popularity
        )
        FROM content_analytics ca
        WHERE ca.content_type = 'movie' AND ca.content_id = movies.id
        AND ca.last_updated >= NOW() - INTERVAL '7 days'
    );

    -- Update TV show popularity based on recent activity
    UPDATE tv_shows SET popularity = (
        SELECT COALESCE(
            (ca.view_count * 0.3 + ca.like_count * 0.4 + ca.comment_count * 0.3) / 10.0,
            popularity
        )
        FROM content_analytics ca
        WHERE ca.content_type = 'tv_show' AND ca.content_id = tv_shows.id
        AND ca.last_updated >= NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;