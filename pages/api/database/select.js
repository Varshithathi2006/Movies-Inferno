import { azurePostgreSQLClient } from '../../../azure/config/azure-config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { table, columns = '*', orderBy, ascending, limit, filters } = req.query;

    if (!table) {
      return res.status(400).json({ message: 'Table parameter is required' });
    }

    await azurePostgreSQLClient.initialize();
    
    let query = `SELECT ${columns} FROM ${table}`;
    const queryParams = [];
    let paramIndex = 1;

    // Add WHERE clause for filters
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        if (parsedFilters.length > 0) {
          const whereConditions = parsedFilters.map(filter => {
            queryParams.push(filter.value);
            return `${filter.column} = $${paramIndex++}`;
          });
          query += ` WHERE ${whereConditions.join(' AND ')}`;
        }
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
    }

    // Add ORDER BY clause
    if (orderBy) {
      const direction = ascending === 'true' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${orderBy} ${direction}`;
    }

    // Add LIMIT clause
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }

    console.log('Executing query:', query, 'with params:', queryParams);
    const result = await azurePostgreSQLClient.query(query, queryParams);
    
    console.log('Query result:', { rowCount: result.rowCount, rows: result.rows });
    const response = { data: result.rows, error: null };
    console.log('API Response:', response);

    res.status(200).json(response);
  } catch (error) {
    console.error('Database select error:', error);
    res.status(500).json({ data: null, error: error.message });
  }
}