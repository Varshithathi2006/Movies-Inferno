import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiUser, 
  FiBookmark, 
  FiStar, 
  FiTrendingUp, 
  FiClock, 
  FiHeart,
  FiEye,
  FiCalendar,
  FiSettings
} from 'react-icons/fi';

export default function Dashboard() {
  const { user, userProfile, getUserStats, getWatchlist, getUserReviews, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentWatchlist, setRecentWatchlist] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoadingStats(true);
    
    try {
      // Load user statistics
      const statsResult = await getUserStats();
      if (statsResult.data) {
        setStats(statsResult.data);
      }

      // Load recent watchlist items
      const watchlistResult = await getWatchlist(null, null);
      if (watchlistResult.data) {
        setRecentWatchlist(watchlistResult.data.slice(0, 6));
      }

      // Load recent reviews
      const reviewsResult = await getUserReviews(6, 0);
      if (reviewsResult.data) {
        setRecentReviews(reviewsResult.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Movie Inferno</title>
        <meta name="description" content="Your personal movie dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Movie Lover'}!</h1>
                <p className="text-red-100 mt-2">Ready to discover your next favorite movie?</p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center"
                >
                  <FiSettings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<FiBookmark className="w-6 h-6" />}
              title="Watchlist"
              value={stats?.watchlist_count || 0}
              subtitle="items to watch"
              color="blue"
            />
            <StatCard
              icon={<FiStar className="w-6 h-6" />}
              title="Reviews"
              value={stats?.reviews_count || 0}
              subtitle="movies reviewed"
              color="yellow"
            />
            <StatCard
              icon={<FiEye className="w-6 h-6" />}
              title="Watched"
              value={stats?.watched_count || 0}
              subtitle="movies watched"
              color="green"
            />
            <StatCard
              icon={<FiHeart className="w-6 h-6" />}
              title="Avg Rating"
              value={stats?.average_rating ? `${stats.average_rating.toFixed(1)}★` : 'N/A'}
              subtitle="your average"
              color="red"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Watchlist */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <FiBookmark className="w-5 h-5 mr-2 text-blue-400" />
                    Recent Watchlist
                  </h2>
                  <Link
                    href="/watchlist"
                    className="text-red-400 hover:text-red-300 text-sm font-medium"
                  >
                    View All
                  </Link>
                </div>

                {recentWatchlist.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {recentWatchlist.map((item) => (
                      <WatchlistCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiBookmark className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Your watchlist is empty</p>
                    <Link
                      href="/movies"
                      className="text-red-400 hover:text-red-300 text-sm mt-2 inline-block"
                    >
                      Discover movies to add
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white flex items-center mb-6">
                  <FiClock className="w-5 h-5 mr-2 text-green-400" />
                  Recent Activity
                </h2>

                {recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentReviews.map((review) => (
                      <ActivityItem key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiStar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No recent activity</p>
                    <Link
                      href="/movies"
                      className="text-red-400 hover:text-red-300 text-sm mt-2 inline-block"
                    >
                      Start reviewing movies
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <QuickActionButton
                    href="/search"
                    icon={<FiTrendingUp className="w-4 h-4" />}
                    text="Discover Movies"
                  />
                  <QuickActionButton
                    href="/watchlist"
                    icon={<FiBookmark className="w-4 h-4" />}
                    text="Manage Watchlist"
                  />
                  <QuickActionButton
                    href="/reviews"
                    icon={<FiStar className="w-4 h-4" />}
                    text="My Reviews"
                  />
                  <QuickActionButton
                    href="/chatbot"
                    icon={<FiUser className="w-4 h-4" />}
                    text="Movie Chatbot"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    green: 'text-green-400 bg-green-400/10',
    red: 'text-red-400 bg-red-400/10'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function WatchlistCard({ item }) {
  const content = item.movies || item.tv_shows;
  const title = content?.title || content?.name;
  const releaseDate = content?.release_date || content?.first_air_date;
  const posterPath = content?.poster_path;

  return (
    <div className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors">
      <div className="aspect-[2/3] bg-gray-600 relative">
        {posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${posterPath}`}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiBookmark className="w-8 h-8 text-gray-400" />
          </div>
        )}
        {item.watched && (
          <div className="absolute top-2 right-2 bg-green-600 rounded-full p-1">
            <FiEye className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-white text-sm font-medium truncate">{title}</h3>
        <p className="text-gray-400 text-xs mt-1">
          {releaseDate ? new Date(releaseDate).getFullYear() : 'Unknown'}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ review }) {
  const content = review.movies || review.tv_shows;
  const title = content?.title || content?.name;

  return (
    <div className="flex items-start space-x-3">
      <div className="bg-yellow-400/10 p-2 rounded-lg">
        <FiStar className="w-4 h-4 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm">
          Reviewed <span className="font-medium">{title}</span>
        </p>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <FiStar
                key={i}
                className={`w-3 h-3 ${
                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-gray-400 text-xs ml-2">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ href, icon, text }) {
  return (
    <Link
      href={href}
      className="flex items-center w-full p-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
    >
      {icon}
      <span className="ml-3 text-sm">{text}</span>
    </Link>
  );
}