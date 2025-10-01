import { azureClient } from '../../../lib/azureClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit) || 6;

    // Get featured movies (high-rated and popular)
    const { data: featuredMovies, error: moviesError } = await azureClient
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
        popularity
      `)
      .gte('vote_average', 7.0)
      .gte('vote_count', 100)
      .order('popularity', { ascending: false })
      .limit(Math.ceil(limit / 2));

    if (moviesError) {
      console.error('Error fetching featured movies:', moviesError);
    }

    // Get featured TV shows (high-rated and popular)
    const { data: featuredTvShows, error: tvError } = await azureClient
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
        popularity
      `)
      .gte('vote_average', 7.0)
      .gte('vote_count', 50)
      .order('popularity', { ascending: false })
      .limit(Math.floor(limit / 2));

    if (tvError) {
      console.error('Error fetching featured TV shows:', tvError);
    }

    // Combine and format the results
    const featuredContent = [];

    // Add movies with type indicator
    if (featuredMovies) {
      featuredMovies.forEach(movie => {
        featuredContent.push({
          ...movie,
          type: 'movie',
          release_date: movie.release_date,
          name: movie.title // For consistency with TV shows
        });
      });
    }

    // Add TV shows with type indicator
    if (featuredTvShows) {
      featuredTvShows.forEach(show => {
        featuredContent.push({
          ...show,
          type: 'tv',
          first_air_date: show.first_air_date,
          name: show.title // For consistency
        });
      });
    }

    // Sort by popularity and limit
    featuredContent.sort((a, b) => b.popularity - a.popularity);
    const limitedContent = featuredContent.slice(0, limit);

    res.status(200).json({
      content: limitedContent,
      total: limitedContent.length
    });

  } catch (error) {
    console.error('Error fetching featured content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}