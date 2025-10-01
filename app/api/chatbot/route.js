import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const userMessage = message.toLowerCase()
    let response = ""
    let movies = []
    let tvShows = []

    // Parse user intent and extract keywords
    const isMovieRequest = userMessage.includes('movie') || userMessage.includes('film')
    const isTVRequest = userMessage.includes('tv') || userMessage.includes('show') || userMessage.includes('series')
    
    // Extract genre keywords with more comprehensive mapping
    const genreKeywords = {
      'Action': ['action', 'adventure', 'thriller', 'fight', 'battle', 'war'],
      'Comedy': ['comedy', 'funny', 'humor', 'laugh', 'hilarious', 'comic'],
      'Drama': ['drama', 'dramatic', 'emotional', 'serious'],
      'Horror': ['horror', 'scary', 'fear', 'frightening', 'terrifying', 'spooky'],
      'Romance': ['romance', 'romantic', 'love', 'relationship', 'dating'],
      'Science Fiction': ['sci-fi', 'science fiction', 'scifi', 'space', 'future', 'alien'],
      'Fantasy': ['fantasy', 'magic', 'magical', 'wizard', 'supernatural'],
      'Crime': ['crime', 'criminal', 'detective', 'police', 'murder', 'investigation'],
      'Documentary': ['documentary', 'doc', 'real', 'factual'],
      'Animation': ['animation', 'animated', 'cartoon', 'anime'],
      'Thriller': ['thriller', 'suspense', 'tension', 'mystery'],
      'Adventure': ['adventure', 'journey', 'quest', 'exploration'],
      'Family': ['family', 'kids', 'children', 'wholesome'],
      'Western': ['western', 'cowboy', 'wild west'],
      'War': ['war', 'military', 'soldier', 'battle'],
      'Music': ['music', 'musical', 'song', 'band'],
      'History': ['history', 'historical', 'period', 'past']
    }

    let detectedGenres = []
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(keyword => userMessage.includes(keyword))) {
        detectedGenres.push(genre)
      }
    }

    // Handle specific requests
    if (isMovieRequest && !isTVRequest) {
      // Movie-specific request
      if (detectedGenres.length > 0) {
        // First try to get movies with genre relationships
        let { data, error } = await supabase
          .from('movies')
          .select(`
            id, title, poster, synopsis, rating, release_date,
            movie_genres!inner(
              genres!inner(name)
            )
          `)
          .in('movie_genres.genres.name', detectedGenres)
          .order('rating', { ascending: false })
          .limit(10)

        if (error) {
          console.log('Genre-based query failed, falling back to general movie query')
          // Fallback: get all movies and filter by keywords in title/synopsis
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('movies')
            .select('id, title, poster, synopsis, rating, release_date')
            .order('rating', { ascending: false })
            .limit(20)

          if (fallbackError) {
            console.error('Error fetching movies:', fallbackError)
          } else {
            // Filter movies by genre keywords in title or synopsis
            const genreKeywords = detectedGenres.flatMap(genre => {
              const keywordMap = {
                'Action': ['action', 'fight', 'battle', 'war', 'adventure'],
                'Comedy': ['comedy', 'funny', 'humor', 'laugh'],
                'Drama': ['drama', 'dramatic', 'emotional'],
                'Horror': ['horror', 'scary', 'fear', 'frightening'],
                'Romance': ['romance', 'romantic', 'love'],
                'Science Fiction': ['sci-fi', 'science', 'space', 'future'],
                'Fantasy': ['fantasy', 'magic', 'magical'],
                'Crime': ['crime', 'criminal', 'detective', 'police'],
                'Thriller': ['thriller', 'suspense', 'mystery']
              }
              return keywordMap[genre] || [genre.toLowerCase()]
            })

            data = fallbackData?.filter(movie => {
              const searchText = `${movie.title} ${movie.synopsis}`.toLowerCase()
              return genreKeywords.some(keyword => searchText.includes(keyword))
            }).slice(0, 10) || []
          }
        }

        movies = data?.map(movie => ({
          ...movie,
          poster_url: movie.poster,
          description: movie.synopsis,
          release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          genres: movie.movie_genres?.map(mg => mg.genres.name) || []
        })) || []
        
        response = `Here are some great ${detectedGenres.join(', ')} movies I found for you:`
      } else {
        // General movie request
        const { data, error } = await supabase
          .from('movies')
          .select('id, title, poster, synopsis, rating, release_date')
          .order('rating', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching movies:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
        } else {
          console.log('General movies query result:', data?.length || 0, 'movies found')
          movies = data?.map(movie => ({
            ...movie,
            poster_url: movie.poster,
            description: movie.synopsis,
            release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            genres: []
          })) || []
        }
        
        response = "Here are some popular movies I recommend:"
      }
    } else if (isTVRequest && !isMovieRequest) {
      // TV show-specific request
      if (detectedGenres.length > 0) {
        // First try to get TV shows with genre relationships
        let { data, error } = await supabase
          .from('tv_shows')
          .select(`
            id, title, poster, synopsis, rating, first_air_date,
            tv_show_genres!inner(
              genres!inner(name)
            )
          `)
          .in('tv_show_genres.genres.name', detectedGenres)
          .order('rating', { ascending: false })
          .limit(10)

        if (error) {
          console.log('Genre-based TV query failed, falling back to general TV query')
          // Fallback: get all TV shows and filter by keywords
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('tv_shows')
            .select('id, title, poster, synopsis, rating, first_air_date')
            .order('rating', { ascending: false })
            .limit(20)

          if (fallbackError) {
            console.error('Error fetching TV shows:', fallbackError)
          } else {
            // Filter TV shows by genre keywords in title or synopsis
            const genreKeywords = detectedGenres.flatMap(genre => {
              const keywordMap = {
                'Action': ['action', 'fight', 'battle', 'war', 'adventure'],
                'Comedy': ['comedy', 'funny', 'humor', 'laugh'],
                'Drama': ['drama', 'dramatic', 'emotional'],
                'Horror': ['horror', 'scary', 'fear', 'frightening'],
                'Romance': ['romance', 'romantic', 'love'],
                'Science Fiction': ['sci-fi', 'science', 'space', 'future'],
                'Fantasy': ['fantasy', 'magic', 'magical'],
                'Crime': ['crime', 'criminal', 'detective', 'police'],
                'Thriller': ['thriller', 'suspense', 'mystery']
              }
              return keywordMap[genre] || [genre.toLowerCase()]
            })

            data = fallbackData?.filter(show => {
              const searchText = `${show.title} ${show.synopsis}`.toLowerCase()
              return genreKeywords.some(keyword => searchText.includes(keyword))
            }).slice(0, 10) || []
          }
        }

        tvShows = data?.map(show => ({
          ...show,
          poster_url: show.poster,
          description: show.synopsis,
          first_air_year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
          genres: show.tv_show_genres?.map(tg => tg.genres.name) || []
        })) || []
        
        response = `Here are some excellent ${detectedGenres.join(', ')} TV shows for you:`
      } else {
        // General TV show request
        const { data, error } = await supabase
          .from('tv_shows')
          .select('id, title, poster, synopsis, rating, first_air_date')
          .order('rating', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching TV shows:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
        } else {
          console.log('General TV shows query result:', data?.length || 0, 'shows found')
          tvShows = data?.map(show => ({
            ...show,
            poster_url: show.poster,
            description: show.synopsis,
            first_air_year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
            genres: []
          })) || []
        }
        
        response = "Here are some popular TV shows I recommend:"
      }
    } else {
      // General request or both movies and TV shows
      if (detectedGenres.length > 0) {
        // Fetch both movies and TV shows with detected genres
        const [moviesResult, tvShowsResult] = await Promise.all([
           supabase
             .from('movies')
             .select(`
               id, title, poster, synopsis, rating, release_date,
               movie_genres!inner(
                 genres!inner(name)
               )
             `)
             .in('movie_genres.genres.name', detectedGenres)
             .order('rating', { ascending: false })
             .limit(6),
          supabase
            .from('tv_shows')
            .select(`
              id, title, poster, synopsis, rating, first_air_date,
              tv_show_genres!inner(
                genres!inner(name)
              )
            `)
            .in('tv_show_genres.genres.name', detectedGenres)
            .order('rating', { ascending: false })
            .limit(6)
        ])

        if (!moviesResult.error) {
          movies = moviesResult.data?.map(movie => ({
            ...movie,
            poster_url: movie.poster,
            description: movie.synopsis,
            release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            genres: movie.movie_genres?.map(mg => mg.genres.name) || []
          })) || []
        }

        if (!tvShowsResult.error) {
          tvShows = tvShowsResult.data?.map(show => ({
            ...show,
            poster_url: show.poster,
            description: show.synopsis,
            first_air_year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
            genres: show.tv_show_genres?.map(tg => tg.genres.name) || []
          })) || []
        }
        
        response = `Here are some great ${detectedGenres.join(', ')} recommendations:`
      } else {
        // General recommendations
        const [moviesResult, tvShowsResult] = await Promise.all([
           supabase
             .from('movies')
             .select(`
               id, title, poster, synopsis, rating, release_date,
               movie_genres(
                 genres(name)
               )
             `)
             .order('rating', { ascending: false })
             .limit(6),
          supabase
            .from('tv_shows')
            .select(`
              id, title, poster, synopsis, rating, first_air_date,
              tv_show_genres(
                genres(name)
              )
            `)
            .order('rating', { ascending: false })
            .limit(6)
        ])

        if (!moviesResult.error) {
          movies = moviesResult.data?.map(movie => ({
            ...movie,
            poster_url: movie.poster,
            description: movie.synopsis,
            release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            genres: movie.movie_genres?.map(mg => mg.genres.name) || []
          })) || []
        }

        if (!tvShowsResult.error) {
          tvShows = tvShowsResult.data?.map(show => ({
            ...show,
            poster_url: show.poster,
            description: show.synopsis,
            first_air_year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
            genres: show.tv_show_genres?.map(tg => tg.genres.name) || []
          })) || []
        }
        
        response = "Here are some popular recommendations for you:"
      }
    }

    // If no results found, provide a helpful message
    if (movies.length === 0 && tvShows.length === 0) {
      response = "I couldn't find any specific recommendations for that request. Try asking for movies or TV shows by genre like 'action movies' or 'comedy shows'."
    }

    // Store conversation in database (optional)
    try {
      await supabase
        .from('chatbot_conversations')
        .insert({
          user_message: message,
          bot_response: response,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error storing conversation:', error)
      // Don't fail the request if conversation storage fails
    }

    return NextResponse.json({
      response,
      movies,
      tvShows
    })

  } catch (error) {
    console.error('Chatbot API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
