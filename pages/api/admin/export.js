import { azureClient } from '../../../lib/azureClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication and admin role
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role
    const { data: userProfile } = await azureClient
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({ error: 'Export type is required' });
    }

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'users':
        csvData = await exportUsers();
        filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'reviews':
        csvData = await exportReviews();
        filename = `reviews-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'content':
        csvData = await exportContent();
        filename = `content-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'analytics':
        csvData = await exportAnalytics();
        filename = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function exportUsers() {
  const { data: users, error } = await azureClient
    .from('users')
    .select(`
      id,
      email,
      full_name,
      role,
      created_at,
      last_sign_in_at,
      user_preferences(
        preferred_genres,
        preferred_languages,
        content_rating_preference
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch users data');
  }

  const headers = [
    'ID',
    'Email',
    'Full Name',
    'Role',
    'Created At',
    'Last Sign In',
    'Preferred Genres',
    'Preferred Languages',
    'Content Rating Preference'
  ];

  const rows = users.map(user => [
    user.id,
    user.email,
    user.full_name || '',
    user.role,
    user.created_at,
    user.last_sign_in_at || '',
    user.user_preferences?.preferred_genres?.join(';') || '',
    user.user_preferences?.preferred_languages?.join(';') || '',
    user.user_preferences?.content_rating_preference || ''
  ]);

  return convertToCSV(headers, rows);
}

async function exportReviews() {
  const { data: reviews, error } = await azureClient
    .from('reviews')
    .select(`
      id,
      content_type,
      content_id,
      rating,
      review_text,
      created_at,
      updated_at,
      users!inner(email, full_name),
      movies(title, release_date),
      tv_shows(title, first_air_date)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch reviews data');
  }

  const headers = [
    'Review ID',
    'User Email',
    'User Name',
    'Content Type',
    'Content Title',
    'Content Release Date',
    'Rating',
    'Review Text',
    'Created At',
    'Updated At'
  ];

  const rows = reviews.map(review => [
    review.id,
    review.users?.email || '',
    review.users?.full_name || '',
    review.content_type,
    review.movies?.title || review.tv_shows?.title || '',
    review.movies?.release_date || review.tv_shows?.first_air_date || '',
    review.rating,
    review.review_text || '',
    review.created_at,
    review.updated_at
  ]);

  return convertToCSV(headers, rows);
}

async function exportContent() {
  // Export movies
  const { data: movies, error: moviesError } = await azureClient
    .from('movies')
    .select(`
      id,
      title,
      release_date,
      runtime,
      budget,
      revenue,
      vote_average,
      vote_count,
      popularity,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (moviesError) {
    throw new Error('Failed to fetch movies data');
  }

  // Export TV shows
  const { data: tvShows, error: tvError } = await azureClient
    .from('tv_shows')
    .select(`
      id,
      title,
      first_air_date,
      last_air_date,
      number_of_episodes,
      number_of_seasons,
      vote_average,
      vote_count,
      popularity,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (tvError) {
    throw new Error('Failed to fetch TV shows data');
  }

  const headers = [
    'Type',
    'ID',
    'Title',
    'Release/First Air Date',
    'Last Air Date',
    'Runtime/Episodes',
    'Seasons',
    'Budget',
    'Revenue',
    'Vote Average',
    'Vote Count',
    'Popularity',
    'Created At'
  ];

  const movieRows = movies.map(movie => [
    'Movie',
    movie.id,
    movie.title,
    movie.release_date,
    '',
    movie.runtime,
    '',
    movie.budget,
    movie.revenue,
    movie.vote_average,
    movie.vote_count,
    movie.popularity,
    movie.created_at
  ]);

  const tvRows = tvShows.map(show => [
    'TV Show',
    show.id,
    show.title,
    show.first_air_date,
    show.last_air_date,
    show.number_of_episodes,
    show.number_of_seasons,
    '',
    '',
    show.vote_average,
    show.vote_count,
    show.popularity,
    show.created_at
  ]);

  const allRows = [...movieRows, ...tvRows];
  return convertToCSV(headers, allRows);
}

async function exportAnalytics() {
  // Get content analytics
  const { data: analytics, error } = await azureClient
    .from('content_analytics')
    .select(`
      content_type,
      content_id,
      view_count,
      like_count,
      share_count,
      average_rating,
      total_ratings,
      last_updated,
      movies(title, release_date),
      tv_shows(title, first_air_date)
    `)
    .order('view_count', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch analytics data');
  }

  const headers = [
    'Content Type',
    'Content ID',
    'Title',
    'Release Date',
    'View Count',
    'Like Count',
    'Share Count',
    'Average Rating',
    'Total Ratings',
    'Last Updated'
  ];

  const rows = analytics.map(item => [
    item.content_type,
    item.content_id,
    item.movies?.title || item.tv_shows?.title || '',
    item.movies?.release_date || item.tv_shows?.first_air_date || '',
    item.view_count,
    item.like_count,
    item.share_count,
    item.average_rating,
    item.total_ratings,
    item.last_updated
  ]);

  return convertToCSV(headers, rows);
}

function convertToCSV(headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(field => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringField = String(field || '');
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}