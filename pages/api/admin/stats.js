import azureClient from '../../../lib/azureClient';
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

    // Get current date for time-based queries
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch user statistics
    const [
      totalUsersResult,
      newUsersResult,
      activeUsersResult
    ] = await Promise.all([
      azureClient.from('users').select('id', { count: 'exact' }),
      azureClient
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      azureClient
        .from('users')
        .select('id', { count: 'exact' })
        .gte('last_sign_in_at', sevenDaysAgo.toISOString())
    ]);

    // Fetch content statistics
    const [
      moviesResult,
      tvShowsResult,
      newMoviesResult,
      newTvShowsResult
    ] = await Promise.all([
      azureClient.from('movies').select('id', { count: 'exact' }),
      azureClient.from('tv_shows').select('id', { count: 'exact' }),
      azureClient
        .from('movies')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      azureClient
        .from('tv_shows')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString())
    ]);

    // Fetch engagement statistics
    const [
      reviewsResult,
      ratingsResult,
      watchlistResult,
      newReviewsResult
    ] = await Promise.all([
      azureClient.from('reviews').select('id', { count: 'exact' }),
      azureClient.from('user_ratings').select('id', { count: 'exact' }),
      azureClient.from('watchlist').select('id', { count: 'exact' }),
      azureClient
        .from('reviews')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString())
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Get previous period data for comparison
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const [
      prevUsersResult,
      prevMoviesResult,
      prevTvShowsResult,
      prevReviewsResult
    ] = await Promise.all([
      azureClient
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString()),
      azureClient
        .from('movies')
        .select('id', { count: 'exact' })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString()),
      azureClient
        .from('tv_shows')
        .select('id', { count: 'exact' })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString()),
      azureClient
        .from('reviews')
        .select('id', { count: 'exact' })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())
    ]);

    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics();

    // Compile statistics
    const stats = {
      users: {
        total: totalUsersResult.count || 0,
        new_this_month: newUsersResult.count || 0,
        active_this_week: activeUsersResult.count || 0,
        change: calculateGrowth(
          newUsersResult.count || 0,
          prevUsersResult.count || 0
        )
      },
      content: {
        movies: moviesResult.count || 0,
        tv_shows: tvShowsResult.count || 0,
        movies_change: calculateGrowth(
          newMoviesResult.count || 0,
          prevMoviesResult.count || 0
        ),
        tv_shows_change: calculateGrowth(
          newTvShowsResult.count || 0,
          prevTvShowsResult.count || 0
        )
      },
      engagement: {
        reviews: reviewsResult.count || 0,
        ratings: ratingsResult.count || 0,
        watchlist_items: watchlistResult.count || 0,
        reviews_change: calculateGrowth(
          newReviewsResult.count || 0,
          prevReviewsResult.count || 0
        )
      },
      performance: performanceMetrics
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPerformanceMetrics() {
  try {
    // Simulate performance metrics - in a real app, these would come from monitoring tools
    const metrics = {
      avg_response_time: Math.floor(Math.random() * 200) + 50, // 50-250ms
      response_time_trend: Math.floor(Math.random() * 20) - 10, // -10% to +10%
      db_queries_per_minute: Math.floor(Math.random() * 1000) + 500, // 500-1500
      db_queries_trend: Math.floor(Math.random() * 30) - 15, // -15% to +15%
      active_sessions: Math.floor(Math.random() * 500) + 100, // 100-600
      sessions_trend: Math.floor(Math.random() * 40) - 20, // -20% to +20%
      memory_usage: Math.floor(Math.random() * 40) + 40, // 40-80%
      cpu_usage: Math.floor(Math.random() * 30) + 20, // 20-50%
      disk_usage: Math.floor(Math.random() * 20) + 60 // 60-80%
    };

    return metrics;
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return {
      avg_response_time: 0,
      response_time_trend: 0,
      db_queries_per_minute: 0,
      db_queries_trend: 0,
      active_sessions: 0,
      sessions_trend: 0,
      memory_usage: 0,
      cpu_usage: 0,
      disk_usage: 0
    };
  }
}