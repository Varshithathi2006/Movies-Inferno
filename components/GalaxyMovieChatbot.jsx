"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, Bot, User, Stars, Film, Heart, Laugh, Zap, Moon, Sparkles, Play, Star, Clock, Calendar, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import MovieGallery from "@/components/movie-gallery"

// System prompt for LLM integration
const SYSTEM_PROMPT_FOR_LLM = `You are Galaxy, a friendly AI movie recommendation assistant. You ONLY recommend movies (no TV shows, series, or other content). 

Your personality:
- Friendly and approachable
- Enthusiastic about movies and cinema
- Knowledgeable about film genres and storytelling
- Use emojis to make conversations engaging
- Be encouraging and positive
- Keep responses concise but engaging
- Include relevant emojis in your responses
- Use friendly, conversational language

When recommending movies, consider:
- User's current mood
- Preferred genres
- Time of day/season
- Previous preferences mentioned
- Popular and critically acclaimed films
- Hidden gems and classics`

// Mood options
const moods = [
  { name: 'Adventure', emoji: '🚀', description: 'Ready for action and excitement', color: 'from-orange-500 to-red-500' },
  { name: 'Romance', emoji: '💕', description: 'In the mood for love stories', color: 'from-pink-500 to-rose-500' },
  { name: 'Mystery', emoji: '🔍', description: 'Craving suspense and thrillers', color: 'from-purple-500 to-indigo-500' },
  { name: 'Comedy', emoji: '😄', description: 'Need some laughs and fun', color: 'from-yellow-500 to-orange-500' },
  { name: 'Drama', emoji: '🎭', description: 'Want deep, emotional stories', color: 'from-blue-500 to-purple-500' },
  { name: 'Horror', emoji: '😱', description: 'Ready for scares and chills', color: 'from-red-500 to-gray-800' }
]

export default function GalaxyMovieChatbot() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    {
      id: "1",
      type: 'bot',
      content: "🎬 Welcome to your personal movie assistant! I'm here to help you discover amazing films based on your mood and preferences. What kind of movie experience are you looking for today?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollAreaRef = useRef(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      })
    }
  }

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setShowScrollButton(!isNearBottom)
      }
    }
  }

  const handleMovieClick = (movie) => {
    // Navigate to the appropriate page based on movie type
    if (movie.type === 'tv') {
      router.push(`/tv/${movie.id}`)
    } else {
      router.push(`/movie/${movie.id}`)
    }
  }

  useEffect(() => {
    // Add a small delay to ensure content is rendered before scrolling
    const timer = setTimeout(() => {
      scrollToBottom()
      setShowScrollButton(false) // Hide scroll button when auto-scrolling
    }, 150)
    
    return () => clearTimeout(timer)
  }, [messages])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]')
      if (viewport) {
        viewport.addEventListener('scroll', handleScroll)
        return () => viewport.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  // Detect mood from user input
  const detectMood = (text) => {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('adventure') || lowerText.includes('action') || lowerText.includes('exciting')) {
      return moods[0] // Adventure
    } else if (lowerText.includes('love') || lowerText.includes('romance') || lowerText.includes('romantic')) {
      return moods[1] // Romance
    } else if (lowerText.includes('mystery') || lowerText.includes('thriller') || lowerText.includes('suspense')) {
      return moods[2] // Mystery
    } else if (lowerText.includes('funny') || lowerText.includes('comedy') || lowerText.includes('laugh')) {
      return moods[3] // Comedy
    } else if (lowerText.includes('drama') || lowerText.includes('emotional') || lowerText.includes('deep')) {
      return moods[4] // Drama
    } else if (lowerText.includes('horror') || lowerText.includes('scary') || lowerText.includes('fear')) {
      return moods[5] // Horror
    }
    
    // Default to adventure if no specific mood detected
    return moods[0]
  }

  // Movie database organized by mood/genre
  const movieDatabase = {
    adventure: [
      { 
        id: 550, 
        title: "Indiana Jones: Raiders of the Lost Ark", 
        genre: "Adventure", 
        year: "1981", 
        rating: "8.4", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/ceG9VzoRAVGwivFU403Wc3AHRys.jpg",
        description: "Archaeologist and adventurer Indiana Jones is hired by the U.S. government to find the Ark of the Covenant before the Nazis."
      },
      { 
        id: 122, 
        title: "The Lord of the Rings: The Fellowship of the Ring", 
        genre: "Adventure", 
        year: "2001", 
        rating: "8.8", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
        description: "A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring."
      },
      { 
        id: 155, 
        title: "The Dark Knight", 
        genre: "Action/Adventure", 
        year: "2008", 
        rating: "9.0", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        description: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent."
      },
      { 
        id: 299536, 
        title: "Avengers: Infinity War", 
        genre: "Adventure", 
        year: "2018", 
        rating: "8.4", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
        description: "The Avengers must stop Thanos from collecting all six Infinity Stones and wiping out half of all life in the universe."
      },
      { 
        id: 1399, 
        title: "Game of Thrones", 
        genre: "Adventure", 
        year: "2011-2019", 
        rating: "9.3", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
        description: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns."
      }
    ],
    romance: [
      { 
        id: 19404, 
        title: "Titanic", 
        genre: "Romance", 
        year: "1997", 
        rating: "7.8", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
        description: "A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic."
      },
      { 
        id: 11036, 
        title: "The Notebook", 
        genre: "Romance", 
        year: "2004", 
        rating: "7.8", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/qom1SZSENdmHFNZBXbtJAU0WTlC.jpg",
        description: "A poor yet passionate young man falls in love with a rich young woman, giving her a sense of freedom."
      },
      { 
        id: 194, 
        title: "Casablanca", 
        genre: "Romance", 
        year: "1942", 
        rating: "8.5", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg",
        description: "A cynical American expatriate struggles to decide whether or not he should help his former lover escape Casablanca."
      },
      { 
        id: 500, 
        title: "Pride and Prejudice", 
        genre: "Romance", 
        year: "2005", 
        rating: "7.8", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/sGjIvtVvTlWnia2zfJfHz81pZ9Q.jpg",
        description: "Sparks fly when spirited Elizabeth Bennet meets single, rich, and proud Mr. Darcy."
      },
      { 
        id: 1416, 
        title: "Grey's Anatomy", 
        genre: "Romance/Drama", 
        year: "2005-", 
        rating: "7.6", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/jcEl8SISNfGdlQFwLzeEtsjDvpw.jpg",
        description: "A drama centered on the personal and professional lives of five surgical interns and their supervisors."
      }
    ],
    mystery: [
      { 
        id: 680, 
        title: "Pulp Fiction", 
        genre: "Mystery/Crime", 
        year: "1994", 
        rating: "8.9", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        description: "The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption."
      },
      { 
        id: 539, 
        title: "Psycho", 
        genre: "Mystery/Thriller", 
        year: "1960", 
        rating: "8.5", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg",
        description: "A Phoenix secretary embezzles $40,000 from his employer's client and flees to a remote motel."
      },
      { 
        id: 27205, 
        title: "Inception", 
        genre: "Mystery/Sci-Fi", 
        year: "2010", 
        rating: "8.8", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        description: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea."
      },
      { 
        id: 1402, 
        title: "The Walking Dead", 
        genre: "Mystery/Horror", 
        year: "2010-2022", 
        rating: "8.2", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/rqeYMLryjcawh2JeRpCVUDXYM5b.jpg",
        description: "Sheriff's deputy Rick Grimes awakens from a coma to find a post-apocalyptic world dominated by flesh-eating zombies."
      },
      { 
        id: 1399, 
        title: "Sherlock", 
        genre: "Mystery", 
        year: "2010-2017", 
        rating: "9.1", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg",
        description: "A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London."
      }
    ],
    comedy: [
      { 
        id: 105, 
        title: "Back to the Future", 
        genre: "Comedy/Sci-Fi", 
        year: "1985", 
        rating: "8.5", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg",
        description: "Marty McFly, a 17-year-old high school student, is accidentally sent thirty years into the past in a time-traveling DeLorean."
      },
      { 
        id: 914, 
        title: "The Great Dictator", 
        genre: "Comedy", 
        year: "1940", 
        rating: "8.4", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/1QpO9wo7JWecZ4NiBuu625FiY1j.jpg",
        description: "Dictator Adenoid Hynkel tries to expand his empire while a poor Jewish barber tries to avoid persecution."
      },
      { 
        id: 1891, 
        title: "The Empire Strikes Back", 
        genre: "Comedy/Adventure", 
        year: "1980", 
        rating: "8.7", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg",
        description: "After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training."
      },
      { 
        id: 1418, 
        title: "The Big Bang Theory", 
        genre: "Comedy", 
        year: "2007-2019", 
        rating: "8.1", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg",
        description: "A woman who moves into an apartment across the hall from two brilliant but socially awkward physicists."
      },
      { 
        id: 1408, 
        title: "House", 
        genre: "Comedy/Drama", 
        year: "2004-2012", 
        rating: "8.7", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/3Cz7ySOQJmqiuTdrc6CY0r65yDI.jpg",
        description: "An antisocial maverick doctor who specializes in diagnostic medicine does whatever it takes to solve puzzling cases."
      }
    ],
    drama: [
      { 
        id: 278, 
        title: "The Shawshank Redemption", 
        genre: "Drama", 
        year: "1994", 
        rating: "9.3", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
        description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
      },
      { 
        id: 238, 
        title: "The Godfather", 
        genre: "Drama/Crime", 
        year: "1972", 
        rating: "9.2", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
        description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son."
      },
      { 
        id: 424, 
        title: "Schindler's List", 
        genre: "Drama/History", 
        year: "1993", 
        rating: "8.9", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
        description: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce."
      },
      { 
        id: 1396, 
        title: "Breaking Bad", 
        genre: "Drama/Crime", 
        year: "2008-2013", 
        rating: "9.5", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine."
      },
      { 
        id: 1403, 
        title: "Mad Men", 
        genre: "Drama", 
        year: "2007-2015", 
        rating: "8.6", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/7v8iCNzKFOjymXbNaW5P9LBhwsE.jpg",
        description: "A drama about one of New York's most prestigious ad agencies at the beginning of the 1960s."
      }
    ],
    horror: [
      { 
        id: 694, 
        title: "The Shining", 
        genre: "Horror", 
        year: "1980", 
        rating: "8.4", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg",
        description: "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence."
      },
      { 
        id: 346, 
        title: "Seven", 
        genre: "Horror/Thriller", 
        year: "1995", 
        rating: "8.6", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/6yoghtyTpznpBik8EngEmJskVUO.jpg",
        description: "Two detectives hunt a serial killer who uses the seven deadly sins as his motives."
      },
      { 
        id: 1724, 
        title: "The Exorcist", 
        genre: "Horror", 
        year: "1973", 
        rating: "8.0", 
        type: "movie", 
        poster: "https://image.tmdb.org/t/p/w200/4ucLGcXVVSVnsfkGtbKGhbdIkUc.jpg",
        description: "When a teenage girl is possessed by a mysterious entity, her mother seeks the help of two priests to save her daughter."
      },
      { 
        id: 1402, 
        title: "The Walking Dead", 
        genre: "Horror/Drama", 
        year: "2010-2022", 
        rating: "8.2", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/rqeYMLryjcawh2JeRpCVUDXYM5b.jpg",
        description: "Sheriff's deputy Rick Grimes awakens from a coma to find a post-apocalyptic world dominated by flesh-eating zombies."
      },
      { 
        id: 1419, 
        title: "Stranger Things", 
        genre: "Horror/Sci-Fi", 
        year: "2016-", 
        rating: "8.7", 
        type: "tv", 
        poster: "https://image.tmdb.org/t/p/w200/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        description: "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces."
      }
    ]
  }

  // Get genre-specific colors
  const getGenreColors = (genre) => {
    const genreColorMap = {
      'Adventure': 'from-orange-500/20 to-red-500/20 border-orange-400/30',
      'Action': 'from-red-500/20 to-orange-500/20 border-red-400/30',
      'Romance': 'from-pink-500/20 to-rose-500/20 border-pink-400/30',
      'Mystery': 'from-purple-500/20 to-indigo-500/20 border-purple-400/30',
      'Crime': 'from-gray-500/20 to-slate-500/20 border-gray-400/30',
      'Comedy': 'from-yellow-500/20 to-orange-500/20 border-yellow-400/30',
      'Drama': 'from-blue-500/20 to-purple-500/20 border-blue-400/30',
      'Horror': 'from-red-500/20 to-gray-800/20 border-red-400/30',
      'Sci-Fi': 'from-cyan-500/20 to-blue-500/20 border-cyan-400/30',
      'Thriller': 'from-purple-500/20 to-red-500/20 border-purple-400/30'
    }
    
    // Find matching genre
    for (const [key, value] of Object.entries(genreColorMap)) {
      if (genre.includes(key)) {
        return value
      }
    }
    
    // Default fallback
    return 'from-purple-500/20 to-blue-500/20 border-purple-400/30'
  }

  // Generate friendly response based on mood
  const generateFriendlyResponse = (mood, userMessage) => {
    if (mood) {
      const responses = [
        `${mood.emoji} Perfect! I can see you're in the mood for ${mood.name.toLowerCase()}! ${mood.description}. Here are some fantastic recommendations:`,
        `${mood.emoji} Great choice! ${mood.name} movies are amazing. I've picked some perfect matches for you:`,
        `${mood.emoji} ${mood.name} it is! These movies should be exactly what you're looking for:`
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      // Get movies for this mood
      const moodKey = mood.name.toLowerCase()
      const availableMovies = movieDatabase[moodKey] || movieDatabase.adventure
      
      // Randomly select 3-4 movies from the mood category
      const shuffled = [...availableMovies].sort(() => 0.5 - Math.random())
      const selectedMovies = shuffled.slice(0, Math.floor(Math.random() * 2) + 3) // 3-4 movies
      
      return {
        response: randomResponse,
        recommendations: selectedMovies
      }
    }
    
    // Default responses for general queries
    const defaultResponses = [
      "🎬 Welcome! I'm here to help you find the perfect movie. Tell me what you're in the mood for, and I'll give you some great recommendations! ✨",
      "🍿 Hi there! What kind of movie experience are you looking for today?",
      "🎭 Ready to find your next favorite film? Let me know what you're in the mood for!",
      "🌟 Hello! I'm here to help you discover some amazing movies. What sounds good to you?"
    ]
    
    // For general queries, show a mix of popular movies
    const allMovies = Object.values(movieDatabase).flat()
    const shuffled = [...allMovies].sort(() => 0.5 - Math.random())
    const selectedMovies = shuffled.slice(0, 4)
    
    return {
      response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
      recommendations: selectedMovies
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    // Simulate AI processing delay
    setTimeout(() => {
      const detectedMood = detectMood(inputMessage)
      const aiResponse = generateFriendlyResponse(detectedMood, inputMessage)
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: aiResponse.response,
        recommendations: aiResponse.recommendations,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleMoodSelect = (mood) => {
    const moodMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `I'm in the mood for ${mood.name}`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, moodMessage])
    setIsLoading(true)

    setTimeout(() => {
      const aiResponse = generateFriendlyResponse(mood, moodMessage.content)
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: aiResponse.response,
        recommendations: aiResponse.recommendations,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23DC2626%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/10 via-transparent to-red-900/10"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-red-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-red-600/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="relative z-10 container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        <Card className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-4rem)] bg-black/60 backdrop-blur-xl border-red-500/30 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-600/20 to-red-900/20 backdrop-blur-sm border-b border-red-500/20 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg">
                    <Stars className="h-6 w-6 sm:h-7 sm:w-7 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                    Galaxy Movie Assistant
                  </CardTitle>
                  <p className="text-sm text-gray-300 mt-1">Your personal cinema guide ✨</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="bg-red-500/20 text-red-200 border-red-400/30">
                  <Film className="h-3 w-3 mr-1" />
                  AI Powered
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 h-[calc(100%-140px)] sm:h-[calc(100%-160px)] flex flex-col relative">
            <ScrollArea 
              className="flex-1 px-4 sm:px-6 py-4 sm:py-6" 
              ref={scrollAreaRef}
            >
              <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 sm:gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-400/30">
                          <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] sm:max-w-[75%] ${message.type === 'user' ? 'order-1' : ''}`}>
                      <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg backdrop-blur-sm border transition-all duration-200 hover:shadow-xl ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-r from-red-600/90 to-red-800/90 text-white border-red-400/30 ml-auto' 
                          : 'bg-black/30 text-white border-red-500/20 hover:bg-black/40'
                      }`}>
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
                          {message.content}
                        </p>
                        
                        {message.recommendations && message.recommendations.length > 0 && (
                          <div className="mt-8 w-full">
                            <div className="flex items-center justify-center gap-2 text-red-300 mb-6">
                              <Stars className="h-4 w-4" />
                              <span className="text-sm font-medium">Recommended for you</span>
                            </div>
                            <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
                              {message.recommendations.map((movie) => (
                                <div 
                                  key={movie.id} 
                                  className={`group relative bg-gradient-to-r ${getGenreColors(movie.genre)} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/20 cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl overflow-hidden w-full min-h-[140px] sm:min-h-[160px] flex items-center hover:border-white/40`}
                                  onClick={() => handleMovieClick(movie)}
                                >
                                  {/* Background overlay for better readability */}
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
                                  
                                  <div className="relative flex items-center gap-3 sm:gap-4 w-full">
                                    {/* Movie Poster */}
                                    <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg overflow-hidden shadow-lg flex-shrink-0 border border-white/20">
                                      <img 
                                        src={movie.poster} 
                                        alt={movie.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        onError={(e) => {
                                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgODAgMTEyIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yOCA0NEg1MlY1Nkg0NFY2OEgzNlY1NkgyOFY0NFoiIGZpbGw9IiM2QjcyODAiLz4KPC9zdmc+'
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Movie Details */}
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-white group-hover:text-purple-200 transition-colors text-base sm:text-lg leading-tight mb-1 sm:mb-2">
                                        {movie.title}
                                      </h5>
                                      
                                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                        <Badge 
                                          variant="secondary" 
                                          className="bg-white/20 text-white border-white/30 text-xs font-medium"
                                        >
                                          {movie.genre}
                                        </Badge>
                                        <span className="text-xs text-gray-300 flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {movie.year}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1">
                                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                          <span className="text-sm font-bold text-white">{movie.rating}</span>
                                          <span className="text-xs text-gray-300">/10</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-purple-400">
                                          {movie.type === 'tv' ? '📺 TV Show' : '🎬 Movie'}
                                          <Play className="h-3 w-3 ml-1 group-hover:text-purple-300" />
                                        </div>
                                      </div>
                                      
                                      {/* Movie Description - Shows on hover */}
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
                                        <p className="text-xs text-gray-200 leading-relaxed line-clamp-2">
                                          {movie.description}
                                        </p>
                                      </div>
                                      
                                      {/* Click indicator */}
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
                                        <span className="text-xs text-red-300 font-medium flex items-center gap-1">
                                          <span>Click to view details</span>
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 sm:mt-4">
                          <div className="flex items-center gap-2">
                            {message.mood && (
                              <Badge 
                                variant="secondary" 
                                className={`bg-gradient-to-r ${message.mood.color} text-white border-white/20 text-xs font-medium px-2 py-1`}
                              >
                                {message.mood.emoji} {message.mood.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 font-medium">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-400/30">
                          <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 sm:gap-4 justify-start animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg animate-pulse ring-2 ring-red-400/30">
                        <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                    </div>
                    <div className="bg-black/30 backdrop-blur-sm p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-red-500/20 min-w-[200px] shadow-lg">
                      <div className="flex gap-3 items-center">
                        <span className="text-sm sm:text-base text-gray-200 font-medium">Finding perfect movies for you</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Enhanced Scroll to bottom button */}
            {showScrollButton && (
              <div className="absolute bottom-32 right-6 z-10">
                <Button
                  onClick={scrollToBottom}
                  size="sm"
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 rounded-full p-3 border border-red-400/30 backdrop-blur-sm"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Enhanced Quick mood selection */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-red-500/20 bg-gradient-to-r from-black/40 to-black/50 backdrop-blur-sm">
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center justify-center gap-2">
                  <span className="text-lg">🎭</span>
                  <span className="bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                    What are you in the mood for?
                  </span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 max-w-5xl mx-auto">
                  {moods.map((mood) => (
                    <Button
                      key={mood.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoodSelect(mood)}
                      className={`bg-gradient-to-r ${mood.color} hover:scale-105 transition-all duration-300 text-white border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl backdrop-blur-sm`}
                    >
                      <span className="mr-1 sm:mr-2 text-base">{mood.emoji}</span>
                      <span className="hidden sm:inline">{mood.name}</span>
                      <span className="sm:hidden">{mood.name.split(' ')[0]}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Enhanced Input area */}
              <div className="flex gap-2 sm:gap-3 max-w-5xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Tell me what kind of movie you're looking for..."
                    className="w-full bg-black/30 backdrop-blur-sm border-red-500/20 text-white placeholder:text-gray-400 focus:border-red-400 focus:ring-red-400/20 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-5 text-sm sm:text-base font-medium shadow-lg transition-all duration-200 focus:shadow-xl"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-red-700/5 rounded-xl sm:rounded-2xl pointer-events-none"></div>
                </div>
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 disabled:from-gray-500 disabled:to-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 font-semibold"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}