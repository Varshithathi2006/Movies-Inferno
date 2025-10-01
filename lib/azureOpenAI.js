import { OpenAIApi, Configuration } from 'openai';

class AzureOpenAIService {
  constructor() {
    this.configuration = new Configuration({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      basePath: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      baseOptions: {
        headers: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
        },
        params: {
          'api-version': '2024-02-15-preview'
        }
      }
    });
    
    this.openai = new OpenAIApi(this.configuration);
  }

  async generateMovieRecommendations(userPreferences, watchHistory = []) {
    try {
      const prompt = this.buildRecommendationPrompt(userPreferences, watchHistory);
      
      const response = await this.openai.createChatCompletion({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are a movie recommendation expert. Provide personalized movie and TV show recommendations based on user preferences and viewing history. Return recommendations in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      });

      return this.parseRecommendations(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  async generateReviewSummary(reviews) {
    try {
      const prompt = `Analyze the following movie/TV show reviews and provide a comprehensive summary highlighting the main themes, sentiments, and key points:

${reviews.map(review => `Rating: ${review.rating}/10\nReview: ${review.content}`).join('\n\n')}

Please provide:
1. Overall sentiment analysis
2. Common themes and topics
3. Key strengths and weaknesses mentioned
4. Average sentiment score (1-10)

Format the response as JSON with the structure:
{
  "overallSentiment": "positive/negative/mixed",
  "sentimentScore": number,
  "commonThemes": ["theme1", "theme2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "summary": "Brief summary text"
}`;

      const response = await this.openai.createChatCompletion({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing movie and TV show reviews. Provide detailed sentiment analysis and summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating review summary:', error);
      throw new Error('Failed to generate review summary');
    }
  }

  async generateContentDescription(title, genre, plot) {
    try {
      const prompt = `Create an engaging and informative description for the following movie/TV show:

Title: ${title}
Genre: ${genre}
Plot: ${plot}

Please create:
1. A compelling 2-3 sentence hook
2. A detailed description (100-150 words)
3. Key themes and elements
4. Target audience

Format as JSON:
{
  "hook": "Engaging hook text",
  "description": "Detailed description",
  "themes": ["theme1", "theme2"],
  "targetAudience": "Description of target audience"
}`;

      const response = await this.openai.createChatCompletion({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are a creative writer specializing in movie and TV show descriptions. Create engaging, informative content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating content description:', error);
      throw new Error('Failed to generate content description');
    }
  }

  async chatWithAssistant(userMessage, conversationHistory = []) {
    try {
      const systemMessage = {
        role: 'system',
        content: `You are Movie Inferno's AI assistant, specialized in movies and TV shows. You can:
        - Recommend movies and TV shows based on preferences
        - Answer questions about plot, cast, ratings, and reviews
        - Provide information about genres, directors, and actors
        - Help users discover new content
        - Discuss movie trivia and behind-the-scenes information
        
        Be friendly, knowledgeable, and helpful. Keep responses concise but informative.`
      };

      const messages = [
        systemMessage,
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: userMessage }
      ];

      const response = await this.openai.createChatCompletion({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages,
        max_tokens: 500,
        temperature: 0.8,
        top_p: 0.9
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error in chat assistant:', error);
      throw new Error('Failed to process chat message');
    }
  }

  async generateSearchSuggestions(query) {
    try {
      const prompt = `Based on the search query "${query}", suggest 5-8 related movie and TV show search terms that users might be interested in. Consider:
      - Similar genres
      - Related actors/directors
      - Similar themes or plots
      - Popular alternatives

      Return as a JSON array of strings: ["suggestion1", "suggestion2", ...]`;

      const response = await this.openai.createChatCompletion({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are a search suggestion expert for movies and TV shows. Provide relevant and helpful search suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.6
      });

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating search suggestions:', error);
      return [];
    }
  }

  buildRecommendationPrompt(preferences, watchHistory) {
    let prompt = `Generate personalized movie and TV show recommendations based on the following user preferences:

Favorite Genres: ${preferences.genres?.join(', ') || 'Not specified'}
Preferred Rating Range: ${preferences.minRating || 'Any'} - ${preferences.maxRating || 'Any'}
Content Type Preference: ${preferences.contentType || 'Both movies and TV shows'}
Preferred Release Years: ${preferences.yearRange || 'Any'}`;

    if (watchHistory.length > 0) {
      prompt += `\n\nRecent Watch History:\n${watchHistory.map(item => 
        `- ${item.title} (${item.type}) - Rated ${item.userRating}/10`
      ).join('\n')}`;
    }

    prompt += `\n\nPlease provide 8-10 recommendations in the following JSON format:
{
  "recommendations": [
    {
      "title": "Movie/Show Title",
      "type": "movie/tv",
      "genre": "Primary Genre",
      "year": "Release Year",
      "reason": "Why this is recommended based on preferences",
      "confidence": "high/medium/low"
    }
  ]
}`;

    return prompt;
  }

  parseRecommendations(content) {
    try {
      const parsed = JSON.parse(content);
      return parsed.recommendations || [];
    } catch (error) {
      console.error('Error parsing recommendations:', error);
      return [];
    }
  }

  async healthCheck() {
    try {
      const response = await this.openai.createChatCompletion({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10
      });
      
      return {
        status: 'healthy',
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

export default new AzureOpenAIService();