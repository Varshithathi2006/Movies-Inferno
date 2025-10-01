"use client"

import { useState, useRef, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Film, Tv, Star, Calendar } from "lucide-react"
import Image from "next/image"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
  movies?: Movie[]
  tvShows?: TVShow[]
}

interface Movie {
  id: number
  title: string
  poster_url: string
  release_year: number
  description: string
  vote_average: number
  genres: string[]
}

interface TVShow {
  id: number
  title: string
  poster_url: string
  first_air_date: string
  description: string
  vote_average: number
  genres: string[]
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: "Hello! I'm your movie recommendation assistant. Ask me for movie or TV show suggestions! For example, try: 'Suggest action movies' or 'Show me comedy TV shows'.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: inputValue }),
      })

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: data.response,
        timestamp: new Date(),
        movies: data.movies || [],
        tvShows: data.tvShows || [],
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatPosterUrl = (posterPath: string) => {
    if (!posterPath) return "/placeholder-movie.jpg"
    if (posterPath.startsWith("http")) return posterPath
    return `https://image.tmdb.org/t/p/w500${posterPath}`
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-lg h-[calc(100vh-200px)] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Movie Recommendation Bot</h1>
                <p className="text-muted-foreground">Ask me for movie or TV show suggestions!</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  } rounded-lg p-4`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === "bot" && (
                      <Bot className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    {message.type === "user" && (
                      <User className="h-5 w-5 text-primary-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Movie Results */}
                      {message.movies && message.movies.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h4 className="font-semibold text-sm flex items-center">
                            <Film className="h-4 w-4 mr-1" />
                            Movies
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {message.movies.slice(0, 6).map((movie) => (
                              <Card key={movie.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                  <div className="flex space-x-3">
                                    <div className="relative w-16 h-24 flex-shrink-0">
                                      <Image
                                        src={formatPosterUrl(movie.poster_url)}
                                        alt={movie.title}
                                        fill
                                        className="object-cover rounded"
                                        sizes="64px"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-sm truncate">{movie.title}</h5>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Badge variant="secondary" className="text-xs">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {movie.release_year}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          <Star className="h-3 w-3 mr-1" />
                                          {movie.vote_average?.toFixed(1)}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {movie.description}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TV Show Results */}
                      {message.tvShows && message.tvShows.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h4 className="font-semibold text-sm flex items-center">
                            <Tv className="h-4 w-4 mr-1" />
                            TV Shows
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {message.tvShows.slice(0, 6).map((show) => (
                              <Card key={show.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                  <div className="flex space-x-3">
                                    <div className="relative w-16 h-24 flex-shrink-0">
                                      <Image
                                        src={formatPosterUrl(show.poster_url)}
                                        alt={show.title}
                                        fill
                                        className="object-cover rounded"
                                        sizes="64px"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-sm truncate">{show.title}</h5>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Badge variant="secondary" className="text-xs">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {new Date(show.first_air_date).getFullYear()}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          <Star className="h-3 w-3 mr-1" />
                                          {show.vote_average?.toFixed(1)}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {show.description}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-primary animate-pulse" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 border-t border-border">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask for movie suggestions... (e.g., 'Suggest action movies')"
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}