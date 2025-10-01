import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import azureOpenAI from '../../../lib/azureOpenAI';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { preferences, includeWatchHistory = true } = req.body;

    // Validate preferences
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    let watchHistory = [];

    // Get user's watch history if requested
    if (includeWatchHistory) {
      try {
        const historyResult = await query(`
          SELECT 
            c.title,
            c.type,
            r.rating as userRating,
            c.release_date
          FROM reviews r
          JOIN content c ON r.content_id = c.id
          WHERE r.user_id = $1
          ORDER BY r.created_at DESC
          LIMIT 20
        `, [session.user.id]);

        watchHistory = historyResult.rows;
      } catch (error) {
        console.error('Error fetching watch history:', error);
        // Continue without watch history if there's an error
      }
    }

    // Generate recommendations using Azure OpenAI
    const recommendations = await azureOpenAI.generateMovieRecommendations(
      preferences,
      watchHistory
    );

    // Log the recommendation request for analytics
    try {
      await query(`
        INSERT INTO user_activity (user_id, activity_type, activity_data)
        VALUES ($1, 'ai_recommendation_request', $2)
      `, [
        session.user.id,
        JSON.stringify({
          preferences,
          recommendationCount: recommendations.length,
          timestamp: new Date().toISOString()
        })
      ]);
    } catch (error) {
      console.error('Error logging recommendation request:', error);
      // Don't fail the request if logging fails
    }

    res.status(200).json({
      success: true,
      recommendations,
      metadata: {
        basedOnHistory: includeWatchHistory && watchHistory.length > 0,
        historyItemsUsed: watchHistory.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Rate limiting configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};