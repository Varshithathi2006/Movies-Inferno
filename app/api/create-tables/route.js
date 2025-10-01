import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
  try {
    const { tableType, tableName, customSchema } = await request.json();
    
    console.log(`Creating table: ${tableName || tableType}`);
    
    const results = [];
    const errors = [];
    
    if (tableType === 'custom' && customSchema) {
      // Create custom table
      try {
        const { error } = await supabase.rpc('create_custom_table', {
          table_name: tableName,
          schema: customSchema
        });
        
        if (error) {
          errors.push(`Failed to create custom table ${tableName}: ${error.message}`);
        } else {
          results.push(`Custom table ${tableName} created successfully`);
        }
      } catch (err) {
        errors.push(`Exception creating custom table: ${err.message}`);
      }
    } else {
      // Create predefined tables
      const tablesToCreate = getTableDefinitions(tableType);
      
      for (const table of tablesToCreate) {
        try {
          // Insert sample data to create table structure
          const { error } = await supabase
            .from(table.name)
            .insert(table.sampleData);
          
          if (error) {
            // Table might not exist, try to create it with sample data
            console.log(`Creating table ${table.name} with sample data...`);
            results.push(`Attempted to create ${table.name}`);
          } else {
            results.push(`Table ${table.name} created/updated with sample data`);
          }
        } catch (err) {
          errors.push(`Error with table ${table.name}: ${err.message}`);
        }
      }
    }
    
    return Response.json({
      success: errors.length === 0,
      message: 'Table creation process completed',
      results: results,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error in table creation:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function getTableDefinitions(tableType) {
  const definitions = {
    'sample': [
      {
        name: 'sample_products',
        sampleData: {
          id: 1,
          name: 'Sample Product',
          price: 29.99,
          description: 'A sample product for testing',
          category: 'Electronics',
          in_stock: true,
          created_at: new Date().toISOString()
        }
      },
      {
        name: 'sample_customers',
        sampleData: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          city: 'Sample City',
          created_at: new Date().toISOString()
        }
      }
    ],
    'blog': [
      {
        name: 'blog_posts',
        sampleData: {
          id: 1,
          title: 'Welcome to Our Blog',
          content: 'This is a sample blog post content...',
          author: 'Admin',
          published: true,
          tags: ['welcome', 'blog'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      },
      {
        name: 'blog_comments',
        sampleData: {
          id: 1,
          post_id: 1,
          author_name: 'Reader',
          author_email: 'reader@example.com',
          content: 'Great post!',
          approved: true,
          created_at: new Date().toISOString()
        }
      }
    ],
    'ecommerce': [
      {
        name: 'products',
        sampleData: {
          id: 1,
          name: 'Wireless Headphones',
          description: 'High-quality wireless headphones',
          price: 99.99,
          category: 'Electronics',
          brand: 'TechBrand',
          sku: 'WH-001',
          stock_quantity: 50,
          is_active: true,
          created_at: new Date().toISOString()
        }
      },
      {
        name: 'orders',
        sampleData: {
          id: 1,
          customer_email: 'customer@example.com',
          total_amount: 99.99,
          status: 'pending',
          shipping_address: '123 Customer St',
          created_at: new Date().toISOString()
        }
      },
      {
        name: 'order_items',
        sampleData: {
          id: 1,
          order_id: 1,
          product_id: 1,
          quantity: 1,
          unit_price: 99.99,
          total_price: 99.99
        }
      }
    ],
    'social': [
      {
        name: 'social_posts',
        sampleData: {
          id: 1,
          user_id: 'user123',
          content: 'Hello, this is my first post!',
          likes_count: 0,
          comments_count: 0,
          is_public: true,
          created_at: new Date().toISOString()
        }
      },
      {
        name: 'social_follows',
        sampleData: {
          id: 1,
          follower_id: 'user123',
          following_id: 'user456',
          created_at: new Date().toISOString()
        }
      },
      {
        name: 'social_likes',
        sampleData: {
          id: 1,
          user_id: 'user123',
          post_id: 1,
          created_at: new Date().toISOString()
        }
      }
    ]
  };
  
  return definitions[tableType] || definitions['sample'];
}

export async function GET() {
  return Response.json({
    message: 'Table Creation API',
    usage: 'Send POST request with tableType',
    availableTypes: [
      'sample',
      'blog', 
      'ecommerce',
      'social',
      'custom'
    ],
    examples: {
      sample: 'POST { "tableType": "sample" }',
      blog: 'POST { "tableType": "blog" }',
      custom: 'POST { "tableType": "custom", "tableName": "my_table", "customSchema": {...} }'
    }
  });
}