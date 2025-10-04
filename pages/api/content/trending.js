import azureClient from '../../../lib/azureClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type = 'all', limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    let trendingContent = [];

    if (type === 'movie' || type === 'all') {
      // Get trending movies (based on recent activity and popularity)
      const { data: trendingMovies, error: moviesError } = await azureClient
        .from('movies')
        .select(`
          id,
          title,
          overview,
          release_date,
          poster_path,
          backdrop_path,
          vote_average,
          vote_count,
          popularity,
          created_at
        `)
        .order('popularity', { ascending: false })
        .limit(type === 'movie' ? limitNum : Math.ceil(limitNum / 2));

      if (moviesError) {
        console.error('Error fetching trending movies:', moviesError);
      } else if (trendingMovies) {
        trendingMovies.forEach(movie => {
          trendingContent.push({
            ...movie,
            type: 'movie',
            name: movie.title,
            release_date: movie.release_date
          });
        });
      }
    }

    if (type === 'tv' || type === 'all') {
      // Get trending TV shows
      const { data: trendingTvShows, error: tvError } = await azureClient
        .from('tv_shows')
        .select(`
          id,
          title,
          overview,
          first_air_date,
          poster_path,
          backdrop_path,
          vote_average,
          vote_count,
          popularity,
          created_at
        `)
        .order('popularity', { ascending: false })
        .limit(type === 'tv' ? limitNum : Math.floor(limitNum / 2));

      if (tvError) {
        console.error('Error fetching trending TV shows:', tvError);
      } else if (trendingTvShows) {
        trendingTvShows.forEach(show => {
          trendingContent.push({
            ...show,
            type: 'tv',
            name: show.title,
            first_air_date: show.first_air_date
          });
        });
      }
    }

    // Sort by popularity and apply limit
    trendingContent.sort((a, b) => b.popularity - a.popularity);
    const limitedContent = trendingContent.slice(0, limitNum);

    res.status(200).json({
      content: limitedContent,
      total: limitedContent.length,
      type: type
    });

  } catch (error) {
    console.error('Error fetching trending content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}