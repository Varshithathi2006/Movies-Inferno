"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Star, Calendar, Tv, Play, Bookmark } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { tvApi, getImageUrl, type TVShow } from "@/services/api"

export default function TVShowDetailsPage() {
  const params = useParams()
  const showId = Number.parseInt(params.id as string)

  const [show, setShow] = useState<TVShow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShowData = async () => {
      try {
        setLoading(true)
        const showDetails = await tvApi.getDetails(showId)
        setShow(showDetails)
      } catch (err) {
        setError("Failed to load TV show details. Please try again later.")
        console.error("Error fetching TV show data:", err)
      } finally {
        setLoading(false)
      }
    }

    if (showId) {
      fetchShowData()
    }
  }, [showId])

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

  if (error || !show) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">TV Show not found</h1>
            <p className="text-muted-foreground mb-8">{error || "The TV show you're looking for doesn't exist."}</p>
            <Button asChild>
              <Link href="/tv">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to TV Shows
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : "TBA"
  const rating = show.vote_average ? show.vote_average.toFixed(1) : "N/A"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0">
          <Image
            src={getImageUrl(show.backdrop_path, "original") || "/placeholder.svg"}
            alt={show.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Button variant="ghost" asChild className="mb-8 text-white hover:bg-white/20">
            <Link href="/tv">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to TV Shows
            </Link>
          </Button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* TV Show Poster */}
            <div className="flex-shrink-0">
              <div className="relative w-80 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={getImageUrl(show.poster_path) || "/placeholder.svg"}
                  alt={show.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* TV Show Info */}
            <div className="flex-1 text-white">
              <div className="mb-4">
                <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30 mb-4">
                  <Star className="w-3 h-3 mr-1 fill-accent" />
                  {rating}
                </Badge>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{show.name}</h1>

              <div className="flex flex-wrap items-center gap-6 mb-6 text-gray-300">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {releaseYear}
                </div>
                <div className="flex items-center">
                  <Tv className="w-4 h-4 mr-2" />
                  TV Series
                </div>
              </div>

              <p className="text-lg text-gray-200 mb-8 text-pretty leading-relaxed">{show.overview}</p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Trailer
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                >
                  <Bookmark className="w-5 h-5 mr-2" />
                  Add to Watchlist
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
