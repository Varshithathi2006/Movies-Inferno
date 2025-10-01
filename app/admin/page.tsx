"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Loader2, Database, Download, CheckCircle, AlertCircle } from "lucide-react"

export default function AdminPage() {
  const [isPopulating, setIsPopulating] = useState(false)
  const [populationStatus, setPopulationStatus] = useState<string | null>(null)
  const [populationError, setPopulationError] = useState<string | null>(null)

  const handlePopulateDatabase = async () => {
    setIsPopulating(true)
    setPopulationStatus(null)
    setPopulationError(null)

    try {
      console.log("🚀 Starting database population...")
      
      const response = await fetch("/api/sync", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setPopulationStatus("Database populated successfully with TMDB data!")
        console.log("✅ Database population completed:", data)
      } else {
        setPopulationError(data.error || "Failed to populate database")
        console.error("❌ Database population failed:", data.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setPopulationError(errorMessage)
      console.error("❌ Database population error:", error)
    } finally {
      setIsPopulating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Movie Inferno Admin</h1>
          <p className="text-gray-400">Manage database and application settings</p>
        </div>

        <div className="grid gap-6">
          {/* Database Population Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="h-5 w-5" />
                Database Population
              </CardTitle>
              <CardDescription className="text-gray-400">
                Populate the database with comprehensive TMDB data including movies, TV shows, genres, people, collections, awards, reviews, and watchlist entries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handlePopulateDatabase}
                  disabled={isPopulating}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {isPopulating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Populating Database...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Populate Database
                    </>
                  )}
                </Button>
              </div>

              {/* Status Messages */}
              {populationStatus && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 text-sm">{populationStatus}</span>
                </div>
              )}

              {populationError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-500 text-sm">{populationError}</span>
                </div>
              )}

              {/* Data Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">60+</div>
                  <div className="text-sm text-gray-400">Movies</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">40+</div>
                  <div className="text-sm text-gray-400">TV Shows</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">40+</div>
                  <div className="text-sm text-gray-400">People</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">15+</div>
                  <div className="text-sm text-gray-400">Collections</div>
                </div>
              </div>
              
              {/* Additional Data Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">All</div>
                  <div className="text-sm text-gray-400">Genres</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">5+</div>
                  <div className="text-sm text-gray-400">Awards</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-pink-400">24+</div>
                  <div className="text-sm text-gray-400">Reviews</div>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-cyan-400">30+</div>
                  <div className="text-sm text-gray-400">Watchlist</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Status Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Application Status</CardTitle>
              <CardDescription className="text-gray-400">
                Current status of application features and enhancements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white">Enhanced Signup Form</span>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500">
                    ✅ Completed
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Chatbot Improvements</span>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500">
                    ✅ Completed
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Database Schema</span>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500">
                    ✅ Ready
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">TMDB Data Population</span>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500">
                    🔄 Available
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Links</CardTitle>
              <CardDescription className="text-gray-400">
                Navigate to different parts of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  <a href="/">Home</a>
                </Button>
                <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  <a href="/signup">Test Signup</a>
                </Button>
                <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  <a href="/chatbot">Test Chatbot</a>
                </Button>
                <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  <a href="/movies">Movies</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}