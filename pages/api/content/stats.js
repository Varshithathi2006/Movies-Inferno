import azureClient from '../../../lib/azureClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get content statistics
    const [
      moviesResult,
      tvShowsResult,
      usersResult,
      reviewsResult
    ] = await Promise.all([
      azureClient.from('movies').select('id', { count: 'exact' }),
      azureClient.from('tv_shows').select('id', { count: 'exact' }),
      azureClient.from('users').select('id', { count: 'exact' }),
      azureClient.from('reviews').select('id', { count: 'exact' })
    ]);

    const stats = {
      movies: moviesResult.count || 0,
      tv_shows: tvShowsResult.count || 0,
      users: usersResult.count || 0,
      reviews: reviewsResult.count || 0
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}