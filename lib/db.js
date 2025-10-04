// Database connection module - exports the Database class
// This file provides a consistent interface for database operations

import { Database } from './database.js';

// Create a singleton instance
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

// Export the query function for direct usage
export async function query(text, params) {
  const db = getDatabase();
  return await db.query(text, params);
}

// Export the Database class as well for direct usage
export { Database } from './database.js';

// Default export for convenience
export default getDatabase();