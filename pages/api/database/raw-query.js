import { azurePostgreSQLClient } from '../../../azure/config/azure-config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sql, params = [] } = req.body;

    if (!sql) {
      return res.status(400).json({ message: 'SQL parameter is required' });
    }

    await azurePostgreSQLClient.initialize();
    const result = await azurePostgreSQLClient.query(sql, params);

    res.status(200).json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Database raw query error:', error);
    res.status(500).json({ data: null, error: error.message });
  }
}