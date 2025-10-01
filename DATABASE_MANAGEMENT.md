# Database Management Guide

This guide explains how to use the database management features in the Movie Inferno application.

## Admin Dashboard

Access the database administration panel at: `http://localhost:3000/admin/database`

## Available Features

### 1. Database Setup
- **Setup Movie Database Schema**: Creates the original movie database tables (users, movies, tv_shows, etc.)
- **Setup Row Level Security (RLS)**: Enables security policies to protect your data

### 2. Table Creation
Create different types of tables for various use cases:

#### Sample Tables
- `sample_products`: Basic product catalog
- `sample_customers`: Customer information

#### Blog Tables
- `blog_posts`: Blog articles with title, content, author
- `blog_comments`: Comments on blog posts

#### E-commerce Tables
- `products`: Product catalog with pricing and inventory
- `orders`: Customer orders
- `order_items`: Individual items within orders

#### Social Media Tables
- `social_posts`: User posts and content
- `social_follows`: User follow relationships
- `social_likes`: Post likes and reactions

### 3. Table Deletion
- Delete specific tables by name (comma-separated)
- Leave empty to delete all default tables
- **Warning**: This permanently removes data!

## API Endpoints

### Setup Database Schema
```bash
POST /api/setup-db
```

### Setup Row Level Security
```bash
POST /api/setup-rls
```

### Create Tables
```bash
POST /api/create-tables
Content-Type: application/json

{
  "tableType": "sample|blog|ecommerce|social|custom",
  "tableName": "custom_table_name" // only for custom type
}
```

### Delete Tables
```bash
POST /api/delete-tables
Content-Type: application/json

{
  "tables": ["table1", "table2"],
  "confirmDelete": true
}
```

## Row Level Security (RLS) Policies

The RLS setup creates the following security policies:

### Users Table
- Users can view and update their own profile
- Registration is allowed for new users

### Public Content Tables (Movies, TV Shows, Genres, etc.)
- Read access for all users (authenticated and anonymous)
- No write access through RLS (admin-only)

### Reviews Table
- All users can read reviews
- Users can create, update, and delete their own reviews
- Must be authenticated to create reviews

### Watchlist Table
- Users can only access their own watchlist
- Full CRUD operations for own watchlist items

## Security Features

1. **Row Level Security**: Ensures users can only access their own data
2. **Authentication Required**: Sensitive operations require user authentication
3. **Public Read Access**: Movie data is publicly readable for better UX
4. **User Isolation**: Personal data (watchlist, reviews) is isolated per user

## Usage Examples

### Creating Sample Tables
1. Go to `/admin/database`
2. Select "Sample Tables" from the dropdown
3. Click "Create Tables"

### Setting Up Security
1. Click "Setup Row Level Security (RLS)"
2. Wait for confirmation
3. Your database is now secured!

### Deleting Specific Tables
1. Enter table names in the deletion field: `sample_products, sample_customers`
2. Click "⚠️ Delete Tables"
3. Confirm the operation

## Troubleshooting

- **Table not found errors**: Normal when trying to delete non-existent tables
- **RLS errors**: May occur if policies already exist (this is usually fine)
- **Permission errors**: Ensure your Supabase project has proper permissions

## File Structure

```
/app/api/
├── setup-db/route.js      # Original database setup
├── setup-rls/route.js     # Row Level Security setup
├── create-tables/route.js # Table creation
└── delete-tables/route.js # Table deletion

/app/admin/
└── database/page.tsx      # Admin dashboard

/database/
└── rls-setup.sql         # RLS policies SQL script
```

## Notes

- Always backup your data before deleting tables
- RLS policies protect your data but may need manual setup in Supabase dashboard for full functionality
- The admin dashboard provides a user-friendly interface for all database operations
- Check the browser console and terminal for detailed operation logs