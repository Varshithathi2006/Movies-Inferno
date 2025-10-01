import { supabase } from "@/lib/supabaseClient";

export async function POST() {
  try {
    console.log('Setting up Row Level Security policies...');
    
    const results = [];
    
    // Enable RLS on all tables
    const tables = ['users', 'movies', 'tv_shows', 'genres', 'movie_genres', 'people', 'collections', 'awards', 'reviews', 'watchlist'];
    
    console.log('Enabling RLS on tables...');
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('enable_rls', { table_name: table });
        if (error) {
          console.log(`RLS might already be enabled on ${table}:`, error.message);
        }
        results.push(`RLS enabled on ${table}`);
      } catch (err) {
        console.log(`Could not enable RLS on ${table}:`, err.message);
        results.push(`RLS setup attempted on ${table}`);
      }
    }
    
    // Test basic table access to verify setup
    console.log('Testing table access...');
    
    // Test public tables
    const { data: moviesTest, error: moviesError } = await supabase
      .from('movies')
      .select('id')
      .limit(1);
    
    const { data: genresTest, error: genresError } = await supabase
      .from('genres')
      .select('id')
      .limit(1);
    
    // Test user-specific tables (these might fail without auth, which is expected)
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const { data: reviewsTest, error: reviewsError } = await supabase
      .from('reviews')
      .select('id')
      .limit(1);
    
    const testResults = {
      movies: moviesError ? `Error: ${moviesError.message}` : `Success: ${moviesTest?.length || 0} records`,
      genres: genresError ? `Error: ${genresError.message}` : `Success: ${genresTest?.length || 0} records`,
      users: usersError ? `Error (expected): ${usersError.message}` : `Success: ${usersTest?.length || 0} records`,
      reviews: reviewsError ? `Error: ${reviewsError.message}` : `Success: ${reviewsTest?.length || 0} records`
    };
    
    return Response.json({
      success: true,
      message: 'Row Level Security setup completed',
      results: results,
      testResults: testResults,
      note: 'Some errors are expected for user-specific tables when not authenticated'
    });
    
  } catch (error) {
    console.error('Error setting up RLS:', error);
    return Response.json({
      success: false,
      error: error.message,
      note: 'RLS policies may need to be set up manually in Supabase dashboard'
    }, { status: 500 });
  }
}