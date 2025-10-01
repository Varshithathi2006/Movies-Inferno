import { azurePostgreSQLClient } from '../../../azure/config/azure-config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { table, data } = req.body;

    if (!table || !data) {
      return res.status(400).json({ message: 'Table and data parameters are required' });
    }

    await azurePostgreSQLClient.initialize();
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await azurePostgreSQLClient.query(query, values);

    res.status(200).json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ data: null, error: error.message });
  }
}