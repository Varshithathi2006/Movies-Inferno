"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroCarousel } from "@/components/hero-carousel"
import { MovieSlider } from "@/components/movie-slider"
import { LoadingSpinner } from "@/components/loading-spinner"
import { movieApi, tvApi, type Movie, type TVShow } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Film, Tv, MessageCircle, Search, Star, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  console.log("[DEBUG] HomePage component is rendering")
  
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([])
  const [popularMovies, setPopularMovies] = useState<Movie[]>([])
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([])
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([])
  const [trendingTVShows, setTrendingTVShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log("[DEBUG] State initialized, loading:", loading)

  useEffect(() => {
    console.log("[DEBUG] useEffect is running")
    
    const fetchMovies = async () => {
      console.log("[DEBUG] Starting to fetch movies")
      setLoading(true)
      setError(null)
      
      try {
        console.log("[DEBUG] Fetching trending movies...")
        const trending = await movieApi.getTrending()
        console.log("[DEBUG] Trending movies fetched:", trending.results.length)
        
        console.log("[DEBUG] Fetching popular movies...")
        const popular = await movieApi.getPopular()
        console.log("[DEBUG] Popular movies fetched:", popular.results.length)
        
        console.log("[DEBUG] Fetching top rated movies...")
        const topRated = await movieApi.getTopRated()
        console.log("[DEBUG] Top rated movies fetched:", topRated.results.length)
        
        console.log("[DEBUG] Fetching upcoming movies...")
        const upcoming = await movieApi.getUpcoming()
        console.log("[DEBUG] Upcoming movies fetched:", upcoming.results.length)
        
        console.log("[DEBUG] Fetching trending TV shows...")
        const trendingTV = await tvApi.getTrending()
        console.log("[DEBUG] Trending TV shows fetched:", trendingTV.results.length)
        
        setTrendingMovies(trending.results)
        setPopularMovies(popular.results)
        setTopRatedMovies(topRated.results)
        setUpcomingMovies(upcoming.results)
        setTrendingTVShows(trendingTV.results)
        
        console.log("[DEBUG] All movies set in state")
      } catch (err) {
        console.error("[DEBUG] Error fetching movies:", err)
        setError("Failed to load movies. Please try again later.")
      } finally {
        setLoading(false)
        console.log("[DEBUG] Loading set to false")
      }
    }

    fetchMovies()
  }, [])

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
          <div className="text-center">
            <p className="text-destructive text-lg mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="space-y-12 pb-12">
        {/* Hero Carousel */}
        {trendingMovies.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <HeroCarousel movies={trendingMovies.slice(0, 5)} />
          </div>
        )}

        {/* Movie Sections */}
        <div className="space-y-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {popularMovies.length > 0 && (
            <MovieSlider title="Popular Movies" movies={popularMovies} />
          )}
          
          {topRatedMovies.length > 0 && (
            <MovieSlider title="Top Rated Movies" movies={topRatedMovies} />
          )}
          
          {upcomingMovies.length > 0 && (
            <MovieSlider title="Upcoming Movies" movies={upcomingMovies} />
          )}
        </div>

        {/* Features Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Explore Movie Inferno</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Discover trending movies, explore detailed information, and dive into the world of cinema with our comprehensive platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Film className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Browse Movies</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    Explore thousands of movies with detailed information, ratings, and reviews
                  </CardDescription>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/movies">
                      <Film className="mr-2 h-4 w-4" />
                      View Movies
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Tv className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">TV Shows</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    Discover popular TV shows, series, and binge-worthy content
                  </CardDescription>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/tv">
                      <Tv className="mr-2 h-4 w-4" />
                      View TV Shows
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Search className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Search</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    Find specific movies, TV shows, and actors with our powerful search
                  </CardDescription>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/search">
                      <Search className="mr-2 h-4 w-4" />
                      Search Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">AI Chatbot</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    Get personalized movie recommendations from our AI assistant
                  </CardDescription>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/chatbot">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{trendingMovies.length}+</div>
                <div className="text-sm text-muted-foreground">Trending Movies</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{popularMovies.length}+</div>
                <div className="text-sm text-muted-foreground">Popular Movies</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Tv className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{trendingTVShows.length}+</div>
                <div className="text-sm text-muted-foreground">TV Shows</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <Film className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{upcomingMovies.length}+</div>
                <div className="text-sm text-muted-foreground">Upcoming Movies</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
