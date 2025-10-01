-- Movie Inferno Database Seeding Script
-- This file now uses real-time TMDB data instead of static data
-- 
-- IMPORTANT: This seed script requires the Node.js seeder to be run first
-- Run: node database/seed-tmdb.js
-- 
-- The Node.js script will populate all tables with fresh TMDB data:
-- - genres (movie and TV genres from TMDB)
-- - movies (popular, trending, top-rated movies with full details)
-- - tv_shows (popular, trending, top-rated TV shows with full details)
-- - people (actors, directors, crew members)
-- - movie_genres & tv_show_genres (genre relationships)
-- - movie_credits & tv_show_credits (cast and crew information)
-- - collections (movie collections/franchises)
-- - movie_collections (movie-collection relationships)
-- - reviews (real TMDB user reviews)
-- - awards (generated based on high-rated content)
-- - users (sample users for testing)
-- - user_preferences (sample user preferences)
-- - watchlist (sample watchlist entries)
-- - chatbot_conversations (sample conversations)

-- Basic users for testing (these will remain static for development)
INSERT INTO users (id, username, email, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'moviefan1', 'moviefan1@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'cinephile', 'cinephile@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'filmcritic', 'filmcritic@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'serieslover', 'serieslover@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'actionfan', 'actionfan@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'dramaqueen', 'dramaqueen@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'comedylover', 'comedylover@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440008', 'horrorfan', 'horrorfan@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'scifienthusiast', 'scifienthusiast@example.com', NOW()),
('550e8400-e29b-41d4-a716-446655440010', 'romancereader', 'romancereader@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample user preferences (will be updated after genres are populated)
-- These will be populated by the Node.js seeder with real genre IDs
INSERT INTO user_preferences (user_id, favorite_genres, preferred_languages, min_rating) VALUES
('550e8400-e29b-41d4-a716-446655440001', ARRAY[28, 12, 16], ARRAY['en'], 7.0),
('550e8400-e29b-41d4-a716-446655440002', ARRAY[18, 80, 53], ARRAY['en'], 8.0),
('550e8400-e29b-41d4-a716-446655440003', ARRAY[18, 36, 10402], ARRAY['en', 'fr'], 7.5),
('550e8400-e29b-41d4-a716-446655440004', ARRAY[10759, 18, 9648], ARRAY['en'], 7.0),
('550e8400-e29b-41d4-a716-446655440005', ARRAY[28, 53, 878], ARRAY['en'], 6.5),
('550e8400-e29b-41d4-a716-446655440006', ARRAY[18, 10749, 10751], ARRAY['en'], 7.0),
('550e8400-e29b-41d4-a716-446655440007', ARRAY[35, 10751, 16], ARRAY['en'], 6.5),
('550e8400-e29b-41d4-a716-446655440008', ARRAY[27, 53, 9648], ARRAY['en'], 6.0),
('550e8400-e29b-41d4-a716-446655440009', ARRAY[878, 28, 12], ARRAY['en'], 7.5),
('550e8400-e29b-41d4-a716-446655440010', ARRAY[10749, 18, 10751], ARRAY['en'], 7.0)
ON CONFLICT (user_id) DO NOTHING;

-- Note: All other tables (movies, tv_shows, people, genres, etc.) 
-- will be populated with real-time TMDB data via the Node.js seeder script.
-- 
-- To populate the database with fresh TMDB data, run:
-- node database/seed-tmdb.js
--
-- This ensures you always have the latest movies, TV shows, and related data
-- from The Movie Database (TMDB) API.