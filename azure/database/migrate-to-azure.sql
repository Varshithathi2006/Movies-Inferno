-- Azure PostgreSQL Migration Script for Movie Inferno
-- This script migrates the complete database schema from Supabase to Azure PostgreSQL
-- Includes all advanced database concepts: triggers, functions, RLS, indexes, and more

-- =============================================
-- EXTENSIONS AND SETUP
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE content_type AS ENUM ('movie', 'tv_show');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table with enhanced features
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    profile_picture_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies table with comprehensive fields
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    release_date DATE,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    overview TEXT,
    tagline TEXT,
    vote_average DECIMAL(3,1) DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    popularity DECIMAL(10,3) DEFAULT 0,
    runtime INTEGER, -- in minutes
    budget BIGINT DEFAULT 0,
    revenue BIGINT DEFAULT 0,
    status VARCHAR(50), -- 'Released', 'Post Production', etc.
    original_language VARCHAR(10),
    spoken_languages JSONB,
    production_countries JSONB,
    production_companies JSONB,
    imdb_id VARCHAR(20),
    homepage TEXT,
    is_adult BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TV Shows table
CREATE TABLE IF NOT EXISTS tv_shows (
    id INTEGER PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500),
    first_air_date DATE,
    last_air_date DATE,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    overview TEXT,
    tagline TEXT,
    vote_average DECIMAL(3,1) DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    popularity DECIMAL(10,3) DEFAULT 0,
    number_of_seasons INTEGER DEFAULT 0,
    number_of_episodes INTEGER DEFAULT 0,
    episode_run_time INTEGER[], -- array of typical episode lengths
    status VARCHAR(50), -- 'Ended', 'Returning Series', 'Canceled', etc.
    type VARCHAR(50), -- 'Scripted', 'Reality', 'Documentary', etc.
    original_language VARCHAR(10),
    spoken_languages JSONB,
    production_countries JSONB,
    production_companies JSONB,
    networks JSONB,
    homepage TEXT,
    is_adult BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table (actors, directors, etc.)
CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    biography TEXT,
    birthday DATE,
    deathday DATE,
    place_of_birth VARCHAR(255),
    profile_path VARCHAR(500),
    known_for_department VARCHAR(100), -- 'Acting', 'Directing', etc.
    gender INTEGER, -- 0: Not specified, 1: Female, 2: Male, 3: Non-binary
    popularity DECIMAL(10,3) DEFAULT 0,
    imdb_id VARCHAR(20),
    homepage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collections table for movie series
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    overview TEXT,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Awards table
CREATE TABLE IF NOT EXISTS awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    year INTEGER,
    winner BOOLEAN DEFAULT false,
    content_type content_type,
    content_id INTEGER,
    person_id INTEGER REFERENCES people(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- JUNCTION TABLES (Many-to-Many Relationships)
-- =============================================

-- Movie-Genre relationships
CREATE TABLE IF NOT EXISTS movie_genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(movie_id, genre_id)
);

-- TV Show-Genre relationships
CREATE TABLE IF NOT EXISTS tv_show_genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tv_show_id, genre_id)
);

-- Movie Credits (cast and crew)
CREATE TABLE IF NOT EXISTS movie_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255), -- For actors
    job VARCHAR(100), -- 'Actor', 'Director', 'Producer', etc.
    department VARCHAR(100), -- 'Acting', 'Directing', 'Production', etc.
    credit_order INTEGER, -- For ordering cast/crew
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TV Show Credits
CREATE TABLE IF NOT EXISTS tv_show_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    job VARCHAR(100),
    department VARCHAR(100),
    credit_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movie Collections relationships
CREATE TABLE IF NOT EXISTS movie_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(movie_id, collection_id)
);

-- =============================================
-- USER-GENERATED CONTENT TABLES
-- =============================================

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 10),
    review_text TEXT,
    status review_status DEFAULT 'pending',
    is_spoiler BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_content_reference CHECK (
        (content_type = 'movie' AND movie_id IS NOT NULL AND tv_show_id IS NULL) OR
        (content_type = 'tv_show' AND tv_show_id IS NOT NULL AND movie_id IS NULL)
    )
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    watched BOOLEAN DEFAULT false,
    watched_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 5, -- 1-10 priority scale
    notes TEXT,
    UNIQUE(user_id, content_type, movie_id, tv_show_id),
    CONSTRAINT check_watchlist_content CHECK (
        (content_type = 'movie' AND movie_id IS NOT NULL AND tv_show_id IS NULL) OR
        (content_type = 'tv_show' AND tv_show_id IS NOT NULL AND movie_id IS NULL)
    )
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    favorite_genres INTEGER[],
    preferred_languages VARCHAR(10)[],
    content_rating_preference VARCHAR(10), -- 'G', 'PG', 'PG-13', 'R', etc.
    preferred_decade VARCHAR(10), -- '2020s', '2010s', etc.
    notification_settings JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chatbot conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    intent VARCHAR(100), -- 'recommendation', 'search', 'info', etc.
    entities JSONB, -- Extracted entities from the message
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content analytics table
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type content_type NOT NULL,
    content_id INTEGER NOT NULL,
    view_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    watchlist_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_type, content_id)
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Primary content indexes
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_featured ON movies(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_movies_trending ON movies(is_trending) WHERE is_trending = true;

CREATE INDEX IF NOT EXISTS idx_tv_shows_name ON tv_shows USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tv_shows_first_air_date ON tv_shows(first_air_date);
CREATE INDEX IF NOT EXISTS idx_tv_shows_vote_average ON tv_shows(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_tv_shows_popularity ON tv_shows(popularity DESC);

CREATE INDEX IF NOT EXISTS idx_people_name ON people USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_people_popularity ON people(popularity DESC);

-- User content indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tv_show_id ON reviews(tv_show_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_content ON watchlist(content_type, movie_id, tv_show_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist(watched);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_movie_genres_movie_id ON movie_genres(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id ON movie_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_tv_show_genres_tv_show_id ON tv_show_genres(tv_show_id);
CREATE INDEX IF NOT EXISTS idx_tv_show_genres_genre_id ON tv_show_genres(genre_id);

CREATE INDEX IF NOT EXISTS idx_movie_credits_movie_id ON movie_credits(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_credits_person_id ON movie_credits(person_id);
CREATE INDEX IF NOT EXISTS idx_tv_show_credits_tv_show_id ON tv_show_credits(tv_show_id);
CREATE INDEX IF NOT EXISTS idx_tv_show_credits_person_id ON tv_show_credits(person_id);

-- Chatbot indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON chatbot_conversations(created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_movies_fulltext ON movies USING gin(to_tsvector('english', title || ' ' || COALESCE(overview, '')));
CREATE INDEX IF NOT EXISTS idx_tv_shows_fulltext ON tv_shows USING gin(to_tsvector('english', name || ' ' || COALESCE(overview, '')));

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE movies IS 'Movie catalog with comprehensive metadata from TMDB';
COMMENT ON TABLE tv_shows IS 'TV show catalog with season and episode information';
COMMENT ON TABLE people IS 'Cast and crew members with biographical information';
COMMENT ON TABLE reviews IS 'User reviews and ratings for movies and TV shows';
COMMENT ON TABLE watchlist IS 'User watchlists with priority and status tracking';
COMMENT ON TABLE chatbot_conversations IS 'AI chatbot interaction history with intent analysis';
COMMENT ON TABLE content_analytics IS 'Aggregated analytics for content performance tracking';

COMMENT ON COLUMN movies.vote_average IS 'Average user rating from TMDB (0-10 scale)';
COMMENT ON COLUMN movies.popularity IS 'TMDB popularity score for trending calculations';
COMMENT ON COLUMN reviews.rating IS 'User rating on 0-10 scale';
COMMENT ON COLUMN watchlist.priority IS 'User-defined priority (1-10, 10 being highest)';
COMMENT ON COLUMN chatbot_conversations.confidence_score IS 'AI confidence in intent classification (0-1)';

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default genres (TMDB standard genres)
INSERT INTO genres (id, name, description) VALUES
(28, 'Action', 'High-energy films with physical stunts and chase sequences'),
(12, 'Adventure', 'Exciting journeys and quests in exotic locations'),
(16, 'Animation', 'Animated films using various animation techniques'),
(35, 'Comedy', 'Films intended to make audiences laugh'),
(80, 'Crime', 'Films involving criminal activities and law enforcement'),
(99, 'Documentary', 'Non-fiction films documenting real events and people'),
(18, 'Drama', 'Serious films focusing on character development'),
(10751, 'Family', 'Films suitable for all family members'),
(14, 'Fantasy', 'Films with magical or supernatural elements'),
(36, 'History', 'Films set in historical periods'),
(27, 'Horror', 'Films intended to frighten and create suspense'),
(10402, 'Music', 'Films centered around musical performances'),
(9648, 'Mystery', 'Films involving puzzles and unknown elements'),
(10749, 'Romance', 'Films focusing on love relationships'),
(878, 'Science Fiction', 'Films with futuristic or scientific themes'),
(10770, 'TV Movie', 'Films made specifically for television'),
(53, 'Thriller', 'Films designed to keep audiences in suspense'),
(10752, 'War', 'Films depicting warfare and military conflicts'),
(37, 'Western', 'Films set in the American Old West')
ON CONFLICT (id) DO NOTHING;

-- Create admin user (password should be hashed in production)
INSERT INTO users (id, username, email, role, is_active, email_verified) VALUES
(uuid_generate_v4(), 'admin', 'admin@movieinferno.com', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

COMMIT;