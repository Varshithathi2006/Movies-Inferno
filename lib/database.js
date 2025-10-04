// Movie Inferno - Direct PostgreSQL Database Connection
// No Supabase dependencies - Pure PostgreSQL with pg library

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Import mock database for development
import MockDatabase from './mockDatabase.js';

// Database configuration
const dbConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require' 
    ? { rejectUnauthorized: false } 
    : process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout for connections
} : {
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'movieinferno',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || '',
  // SSL configuration for Azure PostgreSQL
  ssl: process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require' 
    ? { rejectUnauthorized: false } 
    : process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout for Azure connections
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database connection class
class Database {
  constructor() {
    this.pool = pool;
  }

  // Execute a query
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Get a client from the pool for transactions
  async getClient() {
    return await this.pool.connect();
  }

  // Close the pool
  async close() {
    await this.pool.end();
  }

  // Test database connection
  async testConnection() {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Initialize database (create tables if they don't exist)
  async initialize() {
    try {
      // Check if users table exists
      const tableCheck = await this.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('Database tables not found. Please run the schema creation script.');
        return false;
      }

      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization error:', error);
      return false;
    }
  }

  // User management methods
  async createUser(userData) {
    const { email, username, password, provider = 'email', provider_id, avatar_url } = userData;
    
    try {
      let password_hash = null;
      if (password) {
        password_hash = await bcrypt.hash(password, 12);
      }

      const result = await this.query(`
        INSERT INTO users (email, username, password_hash, provider, provider_id, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, provider, avatar_url, created_at
      `, [email, username, password_hash, provider, provider_id, avatar_url]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('User with this email or username already exists');
      }
      throw error;
    }
  }

  async getUserByEmail(email) {
    const result = await this.query(`
      SELECT u.*, up.first_name, up.last_name, up.bio, up.preferences
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.email = $1 AND u.is_active = true
    `, [email]);

    return result.rows[0] || null;
  }

  async getUserById(id) {
    const result = await this.query(`
      SELECT u.*, up.first_name, up.last_name, up.bio, up.preferences
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1 AND u.is_active = true
    `, [id]);

    return result.rows[0] || null;
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Session management
  async createSession(userId, sessionToken, expiresAt, ipAddress, userAgent) {
    const result = await this.query(`
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, sessionToken, expiresAt, ipAddress, userAgent]);

    return result.rows[0];
  }

  async getSession(sessionToken) {
    const result = await this.query(`
      SELECT s.*, u.email, u.username, u.avatar_url
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = $1 AND s.expires_at > NOW()
    `, [sessionToken]);

    return result.rows[0] || null;
  }

  async deleteSession(sessionToken) {
    await this.query('DELETE FROM user_sessions WHERE session_token = $1', [sessionToken]);
  }

  // Movie methods
  async getMovies(page = 1, limit = 20, sortBy = 'popularity', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    
    const result = await this.query(`
      SELECT * FROM movie_details
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await this.query('SELECT COUNT(*) FROM movies');
    const total = parseInt(countResult.rows[0].count);

    return {
      movies: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getMovieById(id) {
    const result = await this.query(`
      SELECT m.*, 
        COALESCE(
          json_agg(
            json_build_object('id', g.id, 'name', g.name)
          ) FILTER (WHERE g.id IS NOT NULL), 
          '[]'::json
        ) as genres,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id, 
              'name', p.name, 
              'character', mc.character_name,
              'profile_path', p.profile_path
            ) ORDER BY mc.cast_order
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as cast
      FROM movies m
      LEFT JOIN movie_genres mg ON m.id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.id
      LEFT JOIN movie_cast mc ON m.id = mc.movie_id
      LEFT JOIN people p ON mc.person_id = p.id
      WHERE m.id = $1
      GROUP BY m.id
    `, [id]);

    return result.rows[0] || null;
  }

  // TV Show methods
  async getTVShows(page = 1, limit = 20, sortBy = 'popularity', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;
    
    const result = await this.query(`
      SELECT * FROM tv_details
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await this.query('SELECT COUNT(*) FROM tv_shows');
    const total = parseInt(countResult.rows[0].count);

    return {
      tvShows: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTVShowById(id) {
    const result = await this.query(`
      SELECT t.*, 
        COALESCE(
          json_agg(
            json_build_object('id', g.id, 'name', g.name)
          ) FILTER (WHERE g.id IS NOT NULL), 
          '[]'::json
        ) as genres,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id, 
              'name', p.name, 
              'character', tc.character_name,
              'profile_path', p.profile_path
            ) ORDER BY tc.cast_order
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'::json
        ) as cast
      FROM tv_shows t
      LEFT JOIN tv_genres tg ON t.id = tg.tv_show_id
      LEFT JOIN genres g ON tg.genre_id = g.id
      LEFT JOIN tv_cast tc ON t.id = tc.tv_show_id
      LEFT JOIN people p ON tc.person_id = p.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);

    return result.rows[0] || null;
  }

  // Search methods
  async searchContent(searchTerm, contentType = 'both', page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const result = await this.query(`
      SELECT * FROM search_content($1, $2)
      LIMIT $3 OFFSET $4
    `, [searchTerm, contentType, limit, offset]);

    return {
      results: result.rows,
      pagination: {
        page,
        limit,
        total: result.rows.length
      }
    };
  }

  // Genre methods
  async getGenres(type = 'both') {
    let whereClause = '';
    const params = [];
    
    if (type !== 'both') {
      whereClause = 'WHERE type = $1 OR type = $2';
      params.push(type, 'both');
    }

    const result = await this.query(`
      SELECT * FROM genres ${whereClause}
      ORDER BY name
    `, params);

    return result.rows;
  }

  // User favorites methods
  async addToFavorites(userId, contentType, contentId) {
    try {
      const result = await this.query(`
        INSERT INTO user_favorites (user_id, content_type, content_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [userId, contentType, contentId]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Item already in favorites');
      }
      throw error;
    }
  }

  async removeFromFavorites(userId, contentType, contentId) {
    await this.query(`
      DELETE FROM user_favorites 
      WHERE user_id = $1 AND content_type = $2 AND content_id = $3
    `, [userId, contentType, contentId]);
  }

  async getUserFavorites(userId, contentType = 'both', page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let contentFilter = '';
    const params = [userId];
    
    if (contentType !== 'both') {
      contentFilter = 'AND uf.content_type = $2';
      params.push(contentType);
    }

    const result = await this.query(`
      SELECT uf.*, 
        CASE 
          WHEN uf.content_type = 'movie' THEN m.title
          WHEN uf.content_type = 'tv' THEN t.name
        END as title,
        CASE 
          WHEN uf.content_type = 'movie' THEN m.poster_path
          WHEN uf.content_type = 'tv' THEN t.poster_path
        END as poster_path
      FROM user_favorites uf
      LEFT JOIN movies m ON uf.content_type = 'movie' AND uf.content_id = m.id
      LEFT JOIN tv_shows t ON uf.content_type = 'tv' AND uf.content_id = t.id
      WHERE uf.user_id = $1 ${contentFilter}
      ORDER BY uf.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    return result.rows;
  }

  // Rating methods
  async addRating(userId, contentType, contentId, rating, review = null) {
    const result = await this.query(`
      INSERT INTO user_ratings (user_id, content_type, content_id, rating, review)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, content_type, content_id)
      DO UPDATE SET rating = $4, review = $5, updated_at = NOW()
      RETURNING *
    `, [userId, contentType, contentId, rating, review]);

    return result.rows[0];
  }

  async getUserRating(userId, contentType, contentId) {
    const result = await this.query(`
      SELECT * FROM user_ratings
      WHERE user_id = $1 AND content_type = $2 AND content_id = $3
    `, [userId, contentType, contentId]);

    return result.rows[0] || null;
  }

  // Close the database connection pool
  async close() {
    await this.pool.end();
  }
}

// Create and export database instance
const db = process.env.USE_MOCK_DATABASE === 'true' 
  ? new MockDatabase() 
  : new Database();

export default db;

// Export the pool and Database class for direct access if needed
export { pool, Database };