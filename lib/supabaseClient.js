// Client-side Azure API compatibility layer for existing Supabase imports
// This provides a Supabase-compatible interface that uses API routes instead of direct database access

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    // The API already returns { data, error } format, so return it directly
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

// Export Azure client with Supabase-compatible interface
export const supabase = {
  // Initialize method (no-op for client-side)
  async initialize() {
    return this;
  },

  // Query method compatible with Supabase syntax
  from(table) {
    const queryBuilder = {
      _table: table,
      _columns: '*',
      _filters: [],
      _orderBy: null,
      _limit: null,
      _operation: 'select',

      select: function(columns = '*') {
        this._columns = columns;
        this._operation = 'select';
        return this;
      },
      
      insert: function(data) {
        this._data = data;
        this._operation = 'insert';
        return this;
      },

      update: function(data) {
        this._data = data;
        this._operation = 'update';
        return this;
      },

      delete: function() {
        this._operation = 'delete';
        return this;
      },

      // Supabase-style query filters
      eq: function(column, value) {
        this._filters.push({ column, operator: 'eq', value });
        return this;
      },

      // Order by clause
      order: function(column, options = {}) {
        this._orderBy = { column, ascending: options.ascending !== false };
        return this;
      },

      // Limit clause
      limit: function(count) {
        this._limit = count;
        return this;
      },

      // Execute the query
      async then(resolve, reject) {
        try {
          let result;
          
          if (this._operation === 'select') {
            const params = new URLSearchParams({
              table: this._table,
              columns: this._columns,
              _t: Date.now() // Cache busting
            });
            
            if (this._orderBy) {
              params.append('orderBy', this._orderBy.column);
              params.append('ascending', this._orderBy.ascending.toString());
            }
            
            if (this._limit) {
              params.append('limit', this._limit.toString());
            }
            
            if (this._filters.length > 0) {
              params.append('filters', JSON.stringify(this._filters));
            }
            
            const endpoint = `/api/database/select?${params.toString()}`;
            result = await apiCall(endpoint);
          } else if (this._operation === 'insert') {
            const endpoint = `/api/database/insert`;
            result = await apiCall(endpoint, {
              method: 'POST',
              body: JSON.stringify({ table: this._table, data: this._data }),
            });
          } else if (this._operation === 'update') {
            const endpoint = `/api/database/update`;
            result = await apiCall(endpoint, {
              method: 'PUT',
              body: JSON.stringify({ table: this._table, data: this._data, filters: this._filters }),
            });
          } else if (this._operation === 'delete') {
            const endpoint = `/api/database/delete`;
            result = await apiCall(endpoint, {
              method: 'DELETE',
              body: JSON.stringify({ table: this._table, filters: this._filters }),
            });
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    };

    return queryBuilder;
  },

  // Direct query method
  async query(sql, params = []) {
    const endpoint = `/api/database/raw-query`;
    return await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  },

  // Auth methods (placeholder for compatibility)
  auth: {
    getUser: async () => {
      const endpoint = `/api/auth/user`;
      return await apiCall(endpoint);
    },
    
    signOut: async () => {
      const endpoint = `/api/auth/signout`;
      return await apiCall(endpoint, { method: 'POST' });
    }
  }
};

