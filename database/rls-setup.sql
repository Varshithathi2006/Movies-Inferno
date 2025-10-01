-- Row Level Security Setup for Movie Inferno Database
-- This script sets up comprehensive RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

DROP POLICY IF EXISTS "Movies are publicly readable" ON movies;
DROP POLICY IF EXISTS "TV shows are publicly readable" ON tv_shows;
DROP POLICY IF EXISTS "Genres are publicly readable" ON genres;
DROP POLICY IF EXISTS "Movie genres are publicly readable" ON movie_genres;
DROP POLICY IF EXISTS "People are publicly readable" ON people;
DROP POLICY IF EXISTS "Collections are publicly readable" ON collections;
DROP POLICY IF EXISTS "Awards are publicly readable" ON awards;

DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

DROP POLICY IF EXISTS "Users can view their own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can manage their own watchlist" ON watchlist;

-- USERS TABLE POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow user registration (insert)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

-- PUBLIC CONTENT TABLES (READ-ONLY FOR ALL USERS)
-- Movies are publicly readable
CREATE POLICY "Movies are publicly readable" ON movies
    FOR SELECT USING (true);

-- TV shows are publicly readable
CREATE POLICY "TV shows are publicly readable" ON tv_shows
    FOR SELECT USING (true);

-- Genres are publicly readable
CREATE POLICY "Genres are publicly readable" ON genres
    FOR SELECT USING (true);

-- Movie genres are publicly readable
CREATE POLICY "Movie genres are publicly readable" ON movie_genres
    FOR SELECT USING (true);

-- People are publicly readable
CREATE POLICY "People are publicly readable" ON people
    FOR SELECT USING (true);

-- Collections are publicly readable
CREATE POLICY "Collections are publicly readable" ON collections
    FOR SELECT USING (true);

-- Awards are publicly readable
CREATE POLICY "Awards are publicly readable" ON awards
    FOR SELECT USING (true);

-- REVIEWS TABLE POLICIES
-- Users can view all reviews (public reading)
CREATE POLICY "Users can view all reviews" ON reviews
    FOR SELECT USING (true);

-- Users can create reviews (must be authenticated)
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- WATCHLIST TABLE POLICIES
-- Users can view their own watchlist
CREATE POLICY "Users can view their own watchlist" ON watchlist
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can manage their own watchlist (insert, update, delete)
CREATE POLICY "Users can manage their own watchlist" ON watchlist
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions to authenticated users
GRANT SELECT ON movies TO authenticated;
GRANT SELECT ON tv_shows TO authenticated;
GRANT SELECT ON genres TO authenticated;
GRANT SELECT ON movie_genres TO authenticated;
GRANT SELECT ON people TO authenticated;
GRANT SELECT ON collections TO authenticated;
GRANT SELECT ON awards TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON watchlist TO authenticated;

-- Grant permissions to anonymous users for public content
GRANT SELECT ON movies TO anon;
GRANT SELECT ON tv_shows TO anon;
GRANT SELECT ON genres TO anon;
GRANT SELECT ON movie_genres TO anon;
GRANT SELECT ON people TO anon;
GRANT SELECT ON collections TO anon;
GRANT SELECT ON awards TO anon;
GRANT SELECT ON reviews TO anon;

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE watchlist;