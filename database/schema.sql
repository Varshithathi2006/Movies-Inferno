-- Movie Inferno Database Schema
-- This file contains all table definitions for the movie recommendation application

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For custom auth (optional since using Supabase Auth)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Genres table for movie and TV show categorization
CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    release_date DATE,
    poster VARCHAR(500), -- URL to poster image
    synopsis TEXT,
    rating DECIMAL(3,1),
    vote_count INTEGER,
    duration INTEGER, -- in minutes
    budget BIGINT,
    revenue BIGINT,
    original_language VARCHAR(10),
    backdrop_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TV Shows table
CREATE TABLE IF NOT EXISTS tv_shows (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    first_air_date DATE,
    last_air_date DATE,
    poster VARCHAR(500), -- URL to poster image
    synopsis TEXT,
    rating DECIMAL(3,1),
    vote_count INTEGER,
    number_of_seasons INTEGER,
    number_of_episodes INTEGER,
    status VARCHAR(50), -- 'Ended', 'Returning Series', 'Canceled', etc.
    original_language VARCHAR(10),
    backdrop_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for movie-genre relationships (many-to-many)
CREATE TABLE IF NOT EXISTS movie_genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(movie_id, genre_id)
);

-- Junction table for TV show-genre relationships (many-to-many)
CREATE TABLE IF NOT EXISTS tv_show_genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tv_show_id, genre_id)
);

-- People table for actors, directors, etc.
CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    biography TEXT,
    birthday DATE,
    deathday DATE,
    place_of_birth VARCHAR(255),
    profile_path VARCHAR(500), -- URL to profile image
    known_for_department VARCHAR(100), -- 'Acting', 'Directing', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movie cast and crew
CREATE TABLE IF NOT EXISTS movie_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255), -- For actors
    job VARCHAR(100), -- 'Actor', 'Director', 'Producer', etc.
    department VARCHAR(100), -- 'Acting', 'Directing', 'Production', etc.
    order_index INTEGER, -- For ordering cast members
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TV show cast and crew
CREATE TABLE IF NOT EXISTS tv_show_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
    character_name VARCHAR(255), -- For actors
    job VARCHAR(100), -- 'Actor', 'Director', 'Producer', etc.
    department VARCHAR(100), -- 'Acting', 'Directing', 'Production', etc.
    order_index INTEGER, -- For ordering cast members
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collections table for movie series/franchises
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    overview TEXT,
    poster VARCHAR(500), -- URL to collection poster
    backdrop_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movie collections relationship
CREATE TABLE IF NOT EXISTS movie_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(movie_id, collection_id)
);

-- Reviews table for user reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    author VARCHAR(255),
    content TEXT NOT NULL,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure review is for either movie or TV show, not both
    CHECK ((movie_id IS NOT NULL AND tv_show_id IS NULL) OR (movie_id IS NULL AND tv_show_id IS NOT NULL))
);

-- Awards table
CREATE TABLE IF NOT EXISTS awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    year INTEGER,
    won BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure award is for either movie or TV show, not both
    CHECK ((movie_id IS NOT NULL AND tv_show_id IS NULL) OR (movie_id IS NULL AND tv_show_id IS NOT NULL))
);

-- Watchlist table for user's saved movies and TV shows
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    tv_show_id INTEGER REFERENCES tv_shows(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    watched BOOLEAN DEFAULT FALSE,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 10),
    -- Ensure watchlist item is for either movie or TV show, not both
    CHECK ((movie_id IS NOT NULL AND tv_show_id IS NULL) OR (movie_id IS NULL AND tv_show_id IS NOT NULL)),
    -- Ensure user can't add same item twice
    UNIQUE(user_id, movie_id),
    UNIQUE(user_id, tv_show_id)
);

-- Chatbot conversations table for storing user interactions
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID DEFAULT uuid_generate_v4(),
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    intent VARCHAR(100), -- 'movie_recommendation', 'genre_search', 'general_query', etc.
    recommended_movies INTEGER[], -- Array of movie IDs recommended
    recommended_tv_shows INTEGER[], -- Array of TV show IDs recommended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table for personalized recommendations
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    favorite_genres INTEGER[], -- Array of genre IDs
    preferred_languages VARCHAR(10)[],
    min_rating DECIMAL(2,1) DEFAULT 0,
    preferred_decade VARCHAR(10), -- '2020s', '2010s', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average);
CREATE INDEX IF NOT EXISTS idx_tv_shows_title ON tv_shows(title);
CREATE INDEX IF NOT EXISTS idx_tv_shows_first_air_date ON tv_shows(first_air_date);
CREATE INDEX IF NOT EXISTS idx_tv_shows_vote_average ON tv_shows(vote_average);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tv_show_id ON reviews(tv_show_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON chatbot_conversations(session_id);

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Watchlist policies
CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);

-- Chatbot conversations policies
CREATE POLICY "Users can view own conversations" ON chatbot_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON chatbot_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- Public read access for content tables
CREATE POLICY "Anyone can view movies" ON movies FOR SELECT USING (true);
CREATE POLICY "Anyone can view tv_shows" ON tv_shows FOR SELECT USING (true);
CREATE POLICY "Anyone can view genres" ON genres FOR SELECT USING (true);
CREATE POLICY "Anyone can view people" ON people FOR SELECT USING (true);
CREATE POLICY "Anyone can view collections" ON collections FOR SELECT USING (true);
CREATE POLICY "Anyone can view awards" ON awards FOR SELECT USING (true);
CREATE POLICY "Anyone can view movie_genres" ON movie_genres FOR SELECT USING (true);
CREATE POLICY "Anyone can view tv_show_genres" ON tv_show_genres FOR SELECT USING (true);
CREATE POLICY "Anyone can view movie_credits" ON movie_credits FOR SELECT USING (true);
CREATE POLICY "Anyone can view tv_show_credits" ON tv_show_credits FOR SELECT USING (true);
CREATE POLICY "Anyone can view movie_collections" ON movie_collections FOR SELECT USING (true);