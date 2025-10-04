"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tv, Star, Calendar, Play, Info } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { tvApi, getImageUrl, TVShow } from "@/services/api"

export default function TVShowsPage() {
  const [heroShow, setHeroShow] = useState<TVShow | null>(null)
  const [otherShows, setOtherShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getTVShowYear = (firstAirDate?: string) => {
    if (!firstAirDate) return "N/A"
    return new Date(firstAirDate).getFullYear()
  }

  useEffect(() => {
    const fetchTVShows = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch popular TV shows from TMDB API
        const popularShows = await tvApi.getPopular()
        
        if (popularShows.results && popularShows.results.length > 0) {
          // Set hero show (first one)
          setHeroShow(popularShows.results[0])
          
          // Set other shows (excluding the hero)
          setOtherShows(popularShows.results.slice(1))
        }
      } catch (err) {
        console.error('Error fetching TV shows:', err)
        setError('Failed to load TV shows. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchTVShows()
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <>
              <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      {heroShow && (
        <div className="relative h-[60vh] md:h-[80vh] flex items-end justify-start p-8 md:p-16">
          <Image
            src={getImageUrl(heroShow.backdrop_path || heroShow.poster_path)}
            alt={heroShow.name}
            fill
            className="object-cover object-center -z-10"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent -z-10" />
          <div className="relative z-10 max-w-2xl text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {heroShow.name}
            </h1>
            <div className="flex items-center space-x-4 mb-4">
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {getTVShowYear(heroShow.first_air_date)}
              </Badge>
              <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                <Star className="h-3 w-3 mr-1" />
                {heroShow.vote_average?.toFixed(1)}
              </Badge>
            </div>
            <p className="text-lg mb-6 line-clamp-3">
              {heroShow.overview}
            </p>
            <div className="flex space-x-4">
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-lg">
                <Link href={`/tv/${heroShow.id}`}>
                  <Play className="mr-2 h-5 w-5" /> Watch Trailer
                </Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 text-lg backdrop-blur-sm">
                <Link href={`/tv/${heroShow.id}`}>
                  <Info className="mr-2 h-5 w-5" /> More Info
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TV Shows Grid */}
      <section className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-foreground">Explore TV Shows</h2>
          {otherShows.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {otherShows.map((show) => (
                <Link key={show.id} href={`/tv/${show.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-[2/3]">
                        <Image
                          src={getImageUrl(show.poster_path)}
                          alt={show.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{show.name}</h3>
                          <div className="flex items-center justify-between text-xs">
                            <span>{getTVShowYear(show.first_air_date)}</span>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 mr-1 text-yellow-400" />
                              <span>{show.vote_average?.toFixed(1)}</span>
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
              <p className="text-muted-foreground text-lg">No TV shows to display. Please sync more data.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
