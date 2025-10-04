"use client"

import { useEffect, useState } from "react"
import { movieApi, getImageUrl, type Movie } from "@/services/api"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Play, Info, Star, Calendar } from "lucide-react"

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch popular movies from TMDB API
        const popularMovies = await movieApi.getPopular()
        setMovies(popularMovies.results)
      } catch (err) {
        console.error("Error fetching movies:", err)
        setError("Failed to load movies. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  const getMovieYear = (releaseDate?: string) => {
    if (!releaseDate) return "N/A"
    return new Date(releaseDate).getFullYear()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-destructive text-center text-lg">{error}</p>
        </div>
        <Footer />
      </div>
    )
  }

  const heroMovie = movies.length > 0 ? movies[0] : null
  const otherMovies = movies.length > 1 ? movies.slice(1) : []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      {heroMovie && (
        <div className="relative h-[60vh] md:h-[80vh] flex items-end justify-start p-8 md:p-16">
          <Image
            src={getImageUrl(heroMovie.backdrop_path || heroMovie.poster_path, "w1280")}
            alt={heroMovie.title}
            fill
            className="object-cover object-center -z-10"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent -z-10" />
          <div className="relative z-10 max-w-2xl text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {heroMovie.title}
            </h1>
            <div className="flex items-center space-x-4 mb-4">
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {getMovieYear(heroMovie.release_date)}
              </Badge>
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                <Star className="h-3 w-3 mr-1" />
                {heroMovie.vote_average?.toFixed(1)}
              </Badge>
            </div>
            <p className="text-lg mb-6 line-clamp-3">
              {heroMovie.overview}
            </p>
            <div className="flex space-x-4">
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-lg">
                <Link href={`/movie/${heroMovie.id}`}>
                  <Play className="mr-2 h-5 w-5" /> Watch Trailer
                </Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 text-lg backdrop-blur-sm">
                <Link href={`/movie/${heroMovie.id}`}>
                  <Info className="mr-2 h-5 w-5" /> More Info
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Movies Grid */}
      <section className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-foreground">Explore Movies</h2>
          {otherMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {otherMovies.map((movie) => (
                <Link key={movie.id} href={`/movie/${movie.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-[2/3]">
                        <Image
                          src={getImageUrl(movie.poster_path)}
                          alt={movie.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{movie.title}</h3>
                          <div className="flex items-center justify-between text-xs">
                            <span>{getMovieYear(movie.release_date)}</span>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 mr-1 text-yellow-400" />
                              <span>{movie.vote_average?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No movies to display. Please sync more data.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}