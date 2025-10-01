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

    const { contentId, reviewIds } = req.body;

    // Validate input
    if (!contentId && !reviewIds) {
      return res.status(400).json({ 
        error: 'Either contentId or reviewIds must be provided' 
      });
    }

    let reviews = [];

    if (contentId) {
      // Get all reviews for a specific content item
      const reviewsResult = await query(`
        SELECT 
          r.id,
          r.rating,
          r.content as review_content,
          r.created_at,
          u.username,
          c.title as content_title
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN content c ON r.content_id = c.id
        WHERE r.content_id = $1
          AND r.content IS NOT NULL
          AND LENGTH(r.content) > 10
        ORDER BY r.created_at DESC
        LIMIT 50
      `, [contentId]);

      reviews = reviewsResult.rows.map(row => ({
        id: row.id,
        rating: row.rating,
        content: row.review_content,
        username: row.username,
        createdAt: row.created_at,
        contentTitle: row.content_title
      }));

    } else if (reviewIds && Array.isArray(reviewIds)) {
      // Get specific reviews by IDs
      const placeholders = reviewIds.map((_, index) => `$${index + 1}`).join(',');
      const reviewsResult = await query(`
        SELECT 
          r.id,
          r.rating,
          r.content as review_content,
          r.created_at,
          u.username,
          c.title as content_title
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN content c ON r.content_id = c.id
        WHERE r.id IN (${placeholders})
          AND r.content IS NOT NULL
          AND LENGTH(r.content) > 10
      `, reviewIds);

      reviews = reviewsResult.rows.map(row => ({
        id: row.id,
        rating: row.rating,
        content: row.review_content,
        username: row.username,
        createdAt: row.created_at,
        contentTitle: row.content_title
      }));
    }

    if (reviews.length === 0) {
      return res.status(404).json({ 
        error: 'No reviews found for analysis' 
      });
    }

    if (reviews.length < 3) {
      return res.status(400).json({ 
        error: 'At least 3 reviews are required for meaningful analysis' 
      });
    }

    // Generate analysis using Azure OpenAI
    const analysis = await azureOpenAI.generateReviewSummary(reviews);

    // Calculate additional statistics
    const statistics = calculateReviewStatistics(reviews);

    // Save analysis to database for caching
    try {
      const analysisData = {
        ...analysis,
        statistics,
        reviewCount: reviews.length,
        generatedAt: new Date().toISOString()
      };

      if (contentId) {
        await query(`
          INSERT INTO content_analysis (content_id, analysis_type, analysis_data, created_at)
          VALUES ($1, 'review_summary', $2, NOW())
          ON CONFLICT (content_id, analysis_type) 
          DO UPDATE SET 
            analysis_data = $2,
            updated_at = NOW()
        `, [contentId, JSON.stringify(analysisData)]);
      }

      // Log the analysis request
      await query(`
        INSERT INTO user_activity (user_id, activity_type, activity_data)
        VALUES ($1, 'ai_review_analysis', $2)
      `, [
        session.user.id,
        JSON.stringify({
          contentId,
          reviewCount: reviews.length,
          analysisType: 'review_summary',
          timestamp: new Date().toISOString()
        })
      ]);

    } catch (error) {
      console.error('Error saving analysis:', error);
      // Don't fail the request if saving fails
    }

    res.status(200).json({
      success: true,
      analysis: {
        ...analysis,
        statistics
      },
      metadata: {
        reviewCount: reviews.length,
        contentId,
        generatedAt: new Date().toISOString(),
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
      }
    });

  } catch (error) {
    console.error('Error analyzing reviews:', error);
    res.status(500).json({ 
      error: 'Failed to analyze reviews',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function calculateReviewStatistics(reviews) {
  const ratings = reviews.map(r => r.rating);
  const total = ratings.length;
  
  // Calculate rating distribution
  const ratingDistribution = {};
  for (let i = 1; i <= 10; i++) {
    ratingDistribution[i] = ratings.filter(r => r === i).length;
  }

  // Calculate averages and percentiles
  const sortedRatings = [...ratings].sort((a, b) => a - b);
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / total;
  const median = total % 2 === 0 
    ? (sortedRatings[total / 2 - 1] + sortedRatings[total / 2]) / 2
    : sortedRatings[Math.floor(total / 2)];

  // Calculate sentiment distribution
  const positive = ratings.filter(r => r >= 7).length;
  const neutral = ratings.filter(r => r >= 5 && r < 7).length;
  const negative = ratings.filter(r => r < 5).length;

  return {
    totalReviews: total,
    averageRating: Math.round(average * 10) / 10,
    medianRating: median,
    ratingDistribution,
    sentimentDistribution: {
      positive: Math.round((positive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      negative: Math.round((negative / total) * 100)
    },
    highestRating: Math.max(...ratings),
    lowestRating: Math.min(...ratings)
  };
}

// Rate limiting configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};