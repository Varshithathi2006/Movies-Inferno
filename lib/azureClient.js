// Azure Database Client for Movie Inferno
// Replaces Supabase client with Azure PostgreSQL integration

import { Pool } from 'pg';
import { azurePostgreSQLClient, AzureSecretManager } from '../azure/config/azure-config.js';

class AzureClient {
  constructor() {
    this.db = azurePostgreSQLClient;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.db.initialize();
      this.initialized = true;
    }
    return this;
  }

  // Authentication methods (to replace Supabase auth)
  auth = {
    // Get current user session
    getSession: async () => {
      // This would integrate with Azure AD B2C
      // For now, return null - implement based on your auth strategy
      return { data: { session: null }, error: null };
    },

    // Sign in with email/password
    signInWithPassword: async ({ email, password }) => {
      // Implement Azure AD B2C sign-in
      // This is a placeholder - actual implementation depends on your auth flow
      return { data: { user: null, session: null }, error: null };
    },

    // Sign up with email/password
    signUp: async ({ email, password, options = {} }) => {
      try {
        await this.initialize();
        
        // Create user in database
        const result = await this.db.query(
          `INSERT INTO users (email, password_hash, username, full_name, role, is_active, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, email, username, full_name, role, created_at`,
          [
            email,
            password, // In production, hash this password
            options.username || email.split('@')[0],
            options.full_name || '',
            'user',
            true,
            false
          ]
        );

        return {
          data: {
            user: result.rows[0],
            session: null
          },
          error: null
        };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: { message: error.message }
        };
      }
    },

    // Sign out
    signOut: async () => {
      await this.db.clearUserContext();
      return { error: null };
    },

    // Get current user
    getUser: async () => {
      // Implement based on your session management
      return { data: { user: null }, error: null };
    }
  };

  // Database query methods (to replace Supabase database operations)
  from(table) {
    return new AzureQueryBuilder(this.db, table);
  }

  // RPC (Remote Procedure Call) for database functions
  async rpc(functionName, params = {}) {
    try {
      await this.initialize();
      
      const paramKeys = Object.keys(params);
      const paramValues = Object.values(params);
      const paramPlaceholders = paramKeys.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `SELECT * FROM ${functionName}(${paramPlaceholders})`;
      const result = await this.db.query(query, paramValues);
      
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Storage methods (to replace Supabase storage)
  storage = {
    from: (bucket) => new AzureStorageClient(bucket)
  };

  // Set user context for RLS
  async setUserContext(userId) {
    await this.db.setUserContext(userId);
  }

  // Clear user context
  async clearUserContext() {
    await this.db.clearUserContext();
  }
}

// Query builder class to mimic Supabase's query interface
class AzureQueryBuilder {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.selectFields = '*';
    this.whereConditions = [];
    this.orderByClause = '';
    this.limitClause = '';
    this.offsetClause = '';
    this.joinClauses = [];
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column, value) {
    this.whereConditions.push(`${column} = $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  neq(column, value) {
    this.whereConditions.push(`${column} != $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  gt(column, value) {
    this.whereConditions.push(`${column} > $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  gte(column, value) {
    this.whereConditions.push(`${column} >= $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  lt(column, value) {
    this.whereConditions.push(`${column} < $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  lte(column, value) {
    this.whereConditions.push(`${column} <= $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  like(column, pattern) {
    this.whereConditions.push(`${column} LIKE $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(pattern);
    return this;
  }

  ilike(column, pattern) {
    this.whereConditions.push(`${column} ILIKE $${this.whereConditions.length + 1}`);
    this.params = this.params || [];
    this.params.push(pattern);
    return this;
  }

  in(column, values) {
    const placeholders = values.map((_, index) => `$${(this.params?.length || 0) + index + 1}`).join(', ');
    this.whereConditions.push(`${column} IN (${placeholders})`);
    this.params = this.params || [];
    this.params.push(...values);
    return this;
  }

  is(column, value) {
    if (value === null) {
      this.whereConditions.push(`${column} IS NULL`);
    } else {
      this.whereConditions.push(`${column} IS $${this.whereConditions.length + 1}`);
      this.params = this.params || [];
      this.params.push(value);
    }
    return this;
  }

  not(column, operator, value) {
    this.whereConditions.push(`NOT (${column} ${operator} $${this.whereConditions.length + 1})`);
    this.params = this.params || [];
    this.params.push(value);
    return this;
  }

  order(column, options = {}) {
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    const nulls = options.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
    this.orderByClause = `ORDER BY ${column} ${direction} ${nulls}`;
    return this;
  }

  limit(count) {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  range(from, to) {
    this.limitClause = `LIMIT ${to - from + 1}`;
    this.offsetClause = `OFFSET ${from}`;
    return this;
  }

  // Execute SELECT query
  async execute() {
    try {
      const whereClause = this.whereConditions.length > 0 
        ? `WHERE ${this.whereConditions.join(' AND ')}`
        : '';

      const query = `
        SELECT ${this.selectFields}
        FROM ${this.table}
        ${this.joinClauses.join(' ')}
        ${whereClause}
        ${this.orderByClause}
        ${this.limitClause}
        ${this.offsetClause}
      `.trim();

      const result = await this.db.query(query, this.params || []);
      return { data: result.rows, error: null, count: result.rowCount };
    } catch (error) {
      return { data: null, error: { message: error.message }, count: 0 };
    }
  }

  // Insert data
  async insert(data) {
    try {
      const isArray = Array.isArray(data);
      const records = isArray ? data : [data];
      
      if (records.length === 0) {
        return { data: [], error: null };
      }

      const columns = Object.keys(records[0]);
      const values = records.map(record => 
        columns.map(col => record[col])
      );

      const placeholders = records.map((_, recordIndex) => 
        `(${columns.map((_, colIndex) => 
          `$${recordIndex * columns.length + colIndex + 1}`
        ).join(', ')})`
      ).join(', ');

      const query = `
        INSERT INTO ${this.table} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
      `;

      const flatValues = values.flat();
      const result = await this.db.query(query, flatValues);
      
      return { 
        data: isArray ? result.rows : result.rows[0], 
        error: null 
      };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Update data
  async update(data) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = columns.map((col, index) => 
        `${col} = $${index + 1}`
      ).join(', ');

      const whereClause = this.whereConditions.length > 0 
        ? `WHERE ${this.whereConditions.join(' AND ')}`
        : '';

      const query = `
        UPDATE ${this.table}
        SET ${setClause}
        ${whereClause}
        RETURNING *
      `;

      const allParams = [...values, ...(this.params || [])];
      const result = await this.db.query(query, allParams);
      
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Delete data
  async delete() {
    try {
      const whereClause = this.whereConditions.length > 0 
        ? `WHERE ${this.whereConditions.join(' AND ')}`
        : '';

      const query = `
        DELETE FROM ${this.table}
        ${whereClause}
        RETURNING *
      `;

      const result = await this.db.query(query, this.params || []);
      
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Count records
  async count() {
    try {
      const whereClause = this.whereConditions.length > 0 
        ? `WHERE ${this.whereConditions.join(' AND ')}`
        : '';

      const query = `
        SELECT COUNT(*) as count
        FROM ${this.table}
        ${whereClause}
      `;

      const result = await this.db.query(query, this.params || []);
      
      return { 
        data: null, 
        error: null, 
        count: parseInt(result.rows[0].count) 
      };
    } catch (error) {
      return { data: null, error: { message: error.message }, count: 0 };
    }
  }
}

// Azure Storage client to replace Supabase storage
class AzureStorageClient {
  constructor(bucket) {
    this.bucket = bucket;
  }

  async upload(path, file, options = {}) {
    try {
      const { azureBlobStorage } = await import('../azure/config/azure-config.js');
      
      const result = await azureBlobStorage.uploadBlob(
        this.bucket,
        path,
        file,
        {
          contentType: options.contentType,
          metadata: options.metadata
        }
      );

      if (result.success) {
        return {
          data: {
            path: path,
            fullPath: `${this.bucket}/${path}`,
            id: result.etag,
            Key: path
          },
          error: null
        };
      } else {
        return {
          data: null,
          error: { message: result.error }
        };
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  async download(path) {
    try {
      const { azureBlobStorage } = await import('../azure/config/azure-config.js');
      const containerClient = await azureBlobStorage.getContainerClient(this.bucket);
      const blobClient = containerClient.getBlobClient(path);
      
      const downloadResponse = await blobClient.download();
      
      return {
        data: downloadResponse.readableStreamBody,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  async remove(paths) {
    try {
      const { azureBlobStorage } = await import('../azure/config/azure-config.js');
      const pathArray = Array.isArray(paths) ? paths : [paths];
      
      const results = await Promise.all(
        pathArray.map(path => azureBlobStorage.deleteBlob(this.bucket, path))
      );

      const errors = results.filter(result => !result.success);
      
      return {
        data: results.filter(result => result.success),
        error: errors.length > 0 ? { message: errors.map(e => e.error).join(', ') } : null
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  async getPublicUrl(path) {
    try {
      const { azureBlobStorage } = await import('../azure/config/azure-config.js');
      const containerClient = await azureBlobStorage.getContainerClient(this.bucket);
      const blobClient = containerClient.getBlobClient(path);
      
      return {
        data: {
          publicUrl: blobClient.url
        },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }

  async createSignedUrl(path, expiresIn = 3600) {
    try {
      const { azureBlobStorage } = await import('../azure/config/azure-config.js');
      const sasUrl = await azureBlobStorage.generateSasToken(
        this.bucket,
        path,
        'r',
        Math.floor(expiresIn / 3600)
      );
      
      return {
        data: {
          signedUrl: sasUrl
        },
        error: sasUrl ? null : { message: 'Failed to generate SAS token' }
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error.message }
      };
    }
  }
}

// Create and export the Azure client instance
const azureClient = new AzureClient();

export default azureClient;
export { AzureClient, AzureQueryBuilder, AzureStorageClient };