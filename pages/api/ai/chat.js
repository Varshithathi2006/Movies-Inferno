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

    const { message, conversationId, conversationHistory = [] } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(session.user.id);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Get conversation history from database if conversationId is provided
    let dbConversationHistory = [];
    if (conversationId) {
      try {
        const historyResult = await query(`
          SELECT message, response, created_at
          FROM chat_conversations
          WHERE conversation_id = $1 AND user_id = $2
          ORDER BY created_at ASC
          LIMIT 20
        `, [conversationId, session.user.id]);

        dbConversationHistory = historyResult.rows.flatMap(row => [
          { role: 'user', content: row.message },
          { role: 'assistant', content: row.response }
        ]);
      } catch (error) {
        console.error('Error fetching conversation history:', error);
        // Continue without history if there's an error
      }
    }

    // Combine database history with provided history
    const fullHistory = [...dbConversationHistory, ...conversationHistory];

    // Generate response using Azure OpenAI
    const response = await azureOpenAI.chatWithAssistant(message, fullHistory);

    // Save conversation to database
    const newConversationId = conversationId || generateConversationId();
    try {
      await query(`
        INSERT INTO chat_conversations (conversation_id, user_id, message, response)
        VALUES ($1, $2, $3, $4)
      `, [newConversationId, session.user.id, message, response]);
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't fail the request if saving fails
    }

    // Log the chat interaction for analytics
    try {
      await query(`
        INSERT INTO user_activity (user_id, activity_type, activity_data)
        VALUES ($1, 'ai_chat_interaction', $2)
      `, [
        session.user.id,
        JSON.stringify({
          messageLength: message.length,
          responseLength: response.length,
          conversationId: newConversationId,
          timestamp: new Date().toISOString()
        })
      ]);
    } catch (error) {
      console.error('Error logging chat interaction:', error);
    }

    res.status(200).json({
      success: true,
      response,
      conversationId: newConversationId,
      metadata: {
        messageId: generateMessageId(),
        timestamp: new Date().toISOString(),
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
      }
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function checkRateLimit(userId) {
  try {
    // Check how many chat messages the user has sent in the last hour
    const result = await query(`
      SELECT COUNT(*) as count
      FROM user_activity
      WHERE user_id = $1 
        AND activity_type = 'ai_chat_interaction'
        AND created_at > NOW() - INTERVAL '1 hour'
    `, [userId]);

    const count = parseInt(result.rows[0].count);
    const limit = 50; // 50 messages per hour

    if (count >= limit) {
      return {
        allowed: false,
        retryAfter: 3600 // 1 hour in seconds
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Allow the request if rate limit check fails
    return { allowed: true };
  }
}

function generateConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Rate limiting configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};