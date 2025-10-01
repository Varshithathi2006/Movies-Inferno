// app/api/setup-db/route.js

import { supabase } from "@/lib/supabaseClient";

export async function POST() {
  try {
    console.log("🚀 Setting up database schema...");

    // Since we can't execute raw SQL directly, let's verify the tables exist
    // by trying to query them and checking if they have the expected structure
    
    console.log("✅ Checking movies table...");
    const { data: moviesData, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .limit(1);
    
    if (moviesError) {
      console.error("❌ Movies table issue:", moviesError);
      return new Response(
        JSON.stringify({ 
          error: "Movies table not properly configured", 
          details: moviesError.message 
        }), 
        { status: 500 }
      );
    }
    
    console.log("✅ Checking tv_shows table...");
    const { data: tvData, error: tvError } = await supabase
      .from('tv_shows')
      .select('id, title, rating')
      .limit(1);
    
    if (tvError) {
      console.error("❌ TV shows table issue:", tvError);
      return new Response(
        JSON.stringify({ 
          error: "TV shows table not properly configured", 
          details: tvError.message 
        }), 
        { status: 500 }
      );
    }
    
    console.log("✅ Checking genres table...");
    const { data: genresData, error: genresError } = await supabase
      .from('genres')
      .select('id, name')
      .limit(1);
    
    if (genresError) {
      console.error("❌ Genres table issue:", genresError);
      return new Response(
        JSON.stringify({ 
          error: "Genres table not properly configured", 
          details: genresError.message 
        }), 
        { status: 500 }
      );
    }
    
    console.log("✅ Checking movie_genres table...");
    const { data: movieGenresData, error: movieGenresError } = await supabase
      .from('movie_genres')
      .select('movie_id, genre_id')
      .limit(1);
    
    if (movieGenresError) {
      console.error("❌ Movie genres table issue:", movieGenresError);
      return new Response(
        JSON.stringify({ 
          error: "Movie genres table not properly configured", 
          details: movieGenresError.message 
        }), 
        { status: 500 }
      );
    }
    
    console.log("✅ Checking tv_show_genres table...");
    const { data: tvGenresData, error: tvGenresError } = await supabase
      .from('tv_show_genres')
      .select('tv_show_id, genre_id')
      .limit(1);
    
    if (tvGenresError) {
      console.error("❌ TV show genres table issue:", tvGenresError);
      return new Response(
        JSON.stringify({ 
          error: "TV show genres table not properly configured", 
          details: tvGenresError.message 
        }), 
        { status: 500 }
      );
    }

    console.log("✅ All tables verified successfully!");

    return new Response(
      JSON.stringify({ 
        message: "Database schema verified successfully!",
        tables: {
          movies: moviesData?.length || 0,
          tv_shows: tvData?.length || 0,
          genres: genresData?.length || 0,
          movie_genres: movieGenresData?.length || 0,
          tv_show_genres: tvGenresData?.length || 0
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Database setup error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}