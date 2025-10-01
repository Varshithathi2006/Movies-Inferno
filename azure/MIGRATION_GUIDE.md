# Migration Guide: Supabase to Azure

This guide provides step-by-step instructions for migrating your Movie Inferno application from Supabase to Azure services.

## 📋 Migration Overview

### What We're Migrating

| Component | From | To |
|-----------|------|-----|
| Database | Supabase PostgreSQL | Azure Database for PostgreSQL |
| Authentication | Supabase Auth | Azure AD B2C (or Firebase Auth) |
| Storage | Supabase Storage | Azure Blob Storage |
| Hosting | Vercel/Netlify | Azure Static Web Apps |
| Functions | Supabase Edge Functions | Azure Functions (if needed) |

### Migration Strategy

1. **Parallel Setup** - Set up Azure infrastructure alongside existing Supabase
2. **Data Migration** - Export and import database data
3. **Code Updates** - Update application code to use Azure services
4. **Testing** - Validate functionality in Azure environment
5. **Cutover** - Switch DNS and decommission Supabase

## 🗄️ Database Migration

### Step 1: Export Supabase Data

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Export database schema
supabase db dump --schema-only > supabase_schema.sql

# Export data only
supabase db dump --data-only > supabase_data.sql

# Export complete database (schema + data)
supabase db dump > supabase_complete.sql
```

### Step 2: Prepare Azure Database

```bash
# Create Azure PostgreSQL server (if not done already)
az postgres flexible-server create \
  --resource-group movies-rg \
  --name movies-db-server \
  --location eastus \
  --admin-user movieadmin \
  --admin-password YourSecurePassword123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14

# Create database
az postgres flexible-server db create \
  --resource-group movies-rg \
  --server-name movies-db-server \
  --database-name movies_db
```

### Step 3: Schema Migration

```bash
# Connect to Azure PostgreSQL
psql "postgresql://movieadmin:YourSecurePassword123!@movies-db-server.postgres.database.azure.com:5432/movies_db?sslmode=require"

# Run Azure-specific schema
\i azure/database/migrate-to-azure.sql
\i azure/database/functions-azure.sql
\i azure/database/triggers-azure.sql
\i azure/database/rls-azure.sql
```

### Step 4: Data Migration

Create a data migration script:

```sql
-- azure/database/migrate-data.sql

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

-- Import users (adjust UUIDs if needed)
INSERT INTO users (id, email, username, full_name, avatar_url, created_at, updated_at)
SELECT 
  id,
  email,
  username,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM supabase_users_export;

-- Import movies data
INSERT INTO movies (id, tmdb_id, title, overview, release_date, poster_path, backdrop_path, vote_average, vote_count, popularity, runtime, budget, revenue, status, tagline, homepage, imdb_id, original_language, original_title, adult, video, created_at, updated_at)
SELECT * FROM supabase_movies_export;

-- Import TV shows data
INSERT INTO tv_shows (id, tmdb_id, name, overview, first_air_date, last_air_date, poster_path, backdrop_path, vote_average, vote_count, popularity, number_of_episodes, number_of_seasons, status, type, homepage, original_language, original_name, adult, in_production, created_at, updated_at)
SELECT * FROM supabase_tv_shows_export;

-- Import reviews
INSERT INTO reviews (id, user_id, content_type, content_id, rating, review_text, created_at, updated_at)
SELECT * FROM supabase_reviews_export;

-- Import watchlist
INSERT INTO watchlist (id, user_id, content_type, content_id, added_at, watched, watched_at, notes)
SELECT * FROM supabase_watchlist_export;

-- Import user preferences
INSERT INTO user_preferences (id, user_id, preferred_genres, preferred_languages, content_rating_preference, notification_settings, privacy_settings, created_at, updated_at)
SELECT * FROM supabase_user_preferences_export;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Update sequences
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));
-- Add other sequences as needed

-- Refresh materialized views if any
-- REFRESH MATERIALIZED VIEW content_analytics;
```

### Step 5: Verify Data Migration

```sql
-- Check record counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'movies', COUNT(*) FROM movies
UNION ALL
SELECT 'tv_shows', COUNT(*) FROM tv_shows
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'watchlist', COUNT(*) FROM watchlist;

-- Test functions
SELECT search_movies('action', 10);
SELECT get_movie_recommendations(1, 5);

-- Test RLS policies
SET ROLE authenticated;
SELECT * FROM reviews WHERE user_id = current_user_id();
```

## 🔐 Authentication Migration

### Option 1: Migrate to Azure AD B2C

#### Step 1: Set Up Azure AD B2C

```bash
# Create B2C tenant
az ad b2c tenant create \
  --country-code US \
  --display-name "Movie Inferno" \
  --domain-name movieinferno

# Create user flows
az ad b2c user-flow create \
  --tenant-name movieinferno.onmicrosoft.com \
  --name B2C_1_signupsignin \
  --type signUpOrSignIn
```

#### Step 2: Export Supabase Users

```javascript
// scripts/export-users.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportUsers() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const userData = users.map(user => ({
    id: user.id,
    email: user.email,
    email_verified: user.email_confirmed_at ? true : false,
    created_at: user.created_at,
    last_sign_in: user.last_sign_in_at,
    user_metadata: user.user_metadata
  }));

  fs.writeFileSync('users_export.json', JSON.stringify(userData, null, 2));
  console.log(`Exported ${userData.length} users`);
}

exportUsers();
```

#### Step 3: Import Users to Azure AD B2C

```javascript
// scripts/import-users-b2c.js
const { Client } = require('@azure/msal-node');
const axios = require('axios');
const fs = require('fs');

async function importUsers() {
  const users = JSON.parse(fs.readFileSync('users_export.json', 'utf8'));
  
  for (const user of users) {
    try {
      // Create user in Azure AD B2C
      const response = await axios.post(
        `https://graph.microsoft.com/v1.0/users`,
        {
          accountEnabled: true,
          displayName: user.user_metadata?.full_name || user.email,
          mailNickname: user.email.split('@')[0],
          userPrincipalName: `${user.email}`,
          passwordProfile: {
            forceChangePasswordNextSignIn: false,
            password: generateTemporaryPassword()
          },
          identities: [
            {
              signInType: "emailAddress",
              issuer: "movieinferno.onmicrosoft.com",
              issuerAssignedId: user.email
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Imported user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to import user ${user.email}:`, error.response?.data);
    }
  }
}
```

### Option 2: Keep Firebase Auth

If migrating authentication is too complex, you can keep Firebase Auth:

```javascript
// lib/auth.js - Updated for Azure backend
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { azureClient } from './azureClient';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Sync Firebase user with Azure database
export async function syncUserWithAzure(firebaseUser) {
  const { data, error } = await azureClient
    .from('users')
    .upsert({
      id: firebaseUser.uid,
      email: firebaseUser.email,
      username: firebaseUser.displayName,
      avatar_url: firebaseUser.photoURL,
      updated_at: new Date().toISOString()
    });
    
  return { data, error };
}
```

## 📁 Storage Migration

### Step 1: Export Supabase Storage

```javascript
// scripts/export-storage.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportStorage() {
  const buckets = ['media', 'posters', 'profiles'];
  
  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1000 });
      
    if (error) {
      console.error(`Error listing files in ${bucket}:`, error);
      continue;
    }
    
    for (const file of files) {
      const { data: fileData } = await supabase.storage
        .from(bucket)
        .download(file.name);
        
      if (fileData) {
        const localPath = path.join('storage_export', bucket, file.name);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, Buffer.from(await fileData.arrayBuffer()));
        console.log(`Downloaded: ${bucket}/${file.name}`);
      }
    }
  }
}

exportStorage();
```

### Step 2: Upload to Azure Blob Storage

```javascript
// scripts/import-storage.js
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

async function importStorage() {
  const containers = ['media', 'posters', 'profiles'];
  
  for (const containerName of containers) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Ensure container exists
    await containerClient.createIfNotExists({
      access: 'blob'
    });
    
    const exportPath = path.join('storage_export', containerName);
    
    if (fs.existsSync(exportPath)) {
      const files = fs.readdirSync(exportPath);
      
      for (const file of files) {
        const filePath = path.join(exportPath, file);
        const blockBlobClient = containerClient.getBlockBlobClient(file);
        
        await blockBlobClient.uploadFile(filePath);
        console.log(`Uploaded: ${containerName}/${file}`);
      }
    }
  }
}

importStorage();
```

## 🔄 Code Updates

### Step 1: Update Database Client

Replace Supabase client usage:

```javascript
// Before (Supabase)
import { supabase } from '../lib/supabaseClient';

const { data, error } = await supabase
  .from('movies')
  .select('*')
  .eq('id', movieId);

// After (Azure)
import { azureClient } from '../lib/azureClient';

const { data, error } = await azureClient
  .from('movies')
  .select('*')
  .eq('id', movieId);
```

### Step 2: Update Authentication

```javascript
// Before (Supabase Auth)
import { supabase } from '../lib/supabaseClient';

const { user, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// After (Azure AD B2C)
import { signIn } from 'next-auth/react';

const result = await signIn('azure-ad-b2c', {
  email,
  password,
  redirect: false
});
```

### Step 3: Update Storage Operations

```javascript
// Before (Supabase Storage)
const { data, error } = await supabase.storage
  .from('media')
  .upload(`posters/${movieId}.jpg`, file);

// After (Azure Blob Storage)
import { azureStorage } from '../lib/azureClient';

const { data, error } = await azureStorage
  .uploadFile('posters', `${movieId}.jpg`, file);
```

## 🧪 Testing Migration

### Step 1: Environment Setup

```bash
# Create test environment variables
cp .env.local .env.test
# Update .env.test with Azure connection strings

# Run tests against Azure
npm run test -- --env=test
```

### Step 2: Data Validation

```javascript
// tests/migration-validation.test.js
describe('Migration Validation', () => {
  test('User count matches', async () => {
    const supabaseCount = await getSupabaseUserCount();
    const azureCount = await getAzureUserCount();
    expect(azureCount).toBe(supabaseCount);
  });
  
  test('Movie data integrity', async () => {
    const sampleMovies = await getSupabaseSampleMovies();
    
    for (const movie of sampleMovies) {
      const azureMovie = await getAzureMovie(movie.id);
      expect(azureMovie.title).toBe(movie.title);
      expect(azureMovie.tmdb_id).toBe(movie.tmdb_id);
    }
  });
  
  test('User relationships preserved', async () => {
    const sampleUsers = await getSupabaseSampleUsers();
    
    for (const user of sampleUsers) {
      const supabaseReviews = await getSupabaseUserReviews(user.id);
      const azureReviews = await getAzureUserReviews(user.id);
      expect(azureReviews.length).toBe(supabaseReviews.length);
    }
  });
});
```

### Step 3: Performance Testing

```javascript
// tests/performance.test.js
describe('Performance Tests', () => {
  test('Database query performance', async () => {
    const start = Date.now();
    await azureClient.from('movies').select('*').limit(100);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
  
  test('Storage upload performance', async () => {
    const testFile = Buffer.from('test content');
    const start = Date.now();
    
    await azureStorage.uploadFile('test', 'performance-test.txt', testFile);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
```

## 🚀 Cutover Process

### Step 1: Pre-Cutover Checklist

- [ ] All data migrated and validated
- [ ] Application tested in Azure environment
- [ ] DNS records prepared
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
- [ ] Team notified of cutover window

### Step 2: Cutover Steps

1. **Enable maintenance mode**
2. **Final data sync** (incremental)
3. **Update DNS records**
4. **Switch application configuration**
5. **Validate functionality**
6. **Disable maintenance mode**

### Step 3: Post-Cutover

1. **Monitor application performance**
2. **Check error logs**
3. **Validate user authentication**
4. **Test critical user flows**
5. **Monitor Azure service health**

## 🔙 Rollback Plan

If issues occur during cutover:

1. **Immediate**: Switch DNS back to original hosting
2. **Application**: Revert environment variables to Supabase
3. **Database**: Use Supabase as primary (if data sync is current)
4. **Communication**: Notify users of temporary issues

## 📊 Post-Migration Optimization

### Database Optimization

```sql
-- Analyze table statistics
ANALYZE;

-- Update query planner statistics
VACUUM ANALYZE;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

### Performance Monitoring

```javascript
// Add performance monitoring
import { trackEvent } from '../lib/analytics';

// Track database query performance
const queryStart = Date.now();
const result = await azureClient.from('movies').select('*');
const queryDuration = Date.now() - queryStart;

trackEvent('database_query', {
  table: 'movies',
  duration: queryDuration,
  resultCount: result.data?.length || 0
});
```

## 🆘 Troubleshooting

### Common Issues

1. **Connection timeouts**: Increase connection pool size
2. **Authentication failures**: Check Azure AD B2C configuration
3. **Storage access errors**: Verify SAS tokens and permissions
4. **Performance degradation**: Review query plans and indexes

### Monitoring Commands

```bash
# Check Azure resource health
az resource list --resource-group movies-rg --query "[].{Name:name,Type:type,Status:properties.provisioningState}"

# Monitor database connections
az postgres flexible-server show --resource-group movies-rg --name movies-db-server --query "state"

# Check storage account status
az storage account show --name moviesstorageaccount --resource-group movies-rg --query "primaryEndpoints"
```

---

This migration guide provides a comprehensive approach to moving from Supabase to Azure while minimizing downtime and ensuring data integrity. Always test the migration process in a development environment before executing in production.