import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
  try {
    const { tables, confirmDelete } = await request.json();
    
    if (!confirmDelete) {
      return Response.json({
        success: false,
        error: 'Deletion not confirmed. Set confirmDelete: true to proceed.'
      }, { status: 400 });
    }
    
    console.log('Starting table deletion process...');
    
    // Default tables to delete if none specified
    const tablesToDelete = tables || [
      'watchlist',
      'reviews', 
      'awards',
      'collections',
      'people',
      'movie_genres',
      'genres',
      'tv_shows',
      'movies',
      'users'
    ];
    
    const results = [];
    const errors = [];
    
    // Delete tables in reverse dependency order
    for (const tableName of tablesToDelete) {
      try {
        console.log(`Attempting to delete table: ${tableName}`);
        
        // First try to drop the table using a direct query
        const { error } = await supabase.rpc('drop_table', { 
          table_name: tableName 
        });
        
        if (error) {
          // If RPC doesn't work, try alternative approach
          console.log(`RPC failed for ${tableName}, trying alternative...`);
          
          // Try to delete all data first, then the table structure
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
          
          if (deleteError) {
            errors.push(`Failed to delete data from ${tableName}: ${deleteError.message}`);
          } else {
            results.push(`Data cleared from ${tableName}`);
          }
        } else {
          results.push(`Table ${tableName} deleted successfully`);
        }
        
      } catch (err) {
        console.error(`Error deleting table ${tableName}:`, err);
        errors.push(`Exception deleting ${tableName}: ${err.message}`);
      }
    }
    
    // Test remaining tables
    const remainingTables = [];
    for (const tableName of tablesToDelete) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        if (!error) {
          remainingTables.push(tableName);
        }
      } catch (err) {
        // Table likely doesn't exist anymore, which is good
      }
    }
    
    return Response.json({
      success: errors.length === 0,
      message: `Table deletion process completed`,
      results: results,
      errors: errors,
      remainingTables: remainingTables,
      note: 'Some tables may still exist but be empty. Use Supabase dashboard for complete table structure removal.'
    });
    
  } catch (error) {
    console.error('Error in table deletion:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    message: 'Table Deletion API',
    usage: 'Send POST request with { "tables": ["table1", "table2"], "confirmDelete": true }',
    warning: 'This will permanently delete data. Use with caution!',
    defaultTables: [
      'watchlist',
      'reviews', 
      'awards',
      'collections',
      'people',
      'movie_genres',
      'genres',
      'tv_shows',
      'movies',
      'users'
    ]
  });
}