// Authentication Context for Azure AD B2C integration
import { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (session?.user) {
      setUser(session.user);
      fetchUserProfile(session.user.id);
    } else {
      setUser(null);
      setUserProfile(null);
    }

    setLoading(false);
  }, [session, status]);

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`);
      if (!response.ok) {
        console.error('Error fetching user profile:', response.statusText);
        return;
      }

      const data = await response.json();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            ...updates,
            updated_at: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating user profile:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      
      // Update local state
      setUserProfile(prev => ({ ...prev, ...data }));
      return { data, error: null };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { error: error.message };
    }
  };

  const updateUserPreferences = async (preferences) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          preferences: {
            ...preferences,
            updated_at: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating user preferences:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        user_preferences: data
      }));

      return { data, error: null };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return { error: error.message };
    }
  };

  const getUserStats = async () => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch(`/api/user/stats?userId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching user stats:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { error: error.message };
    }
  };

  const addToWatchlist = async (contentType, contentId, notes = '') => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          contentId,
          notes,
          added_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error adding to watchlist:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return { error: error.message };
    }
  };

  const removeFromWatchlist = async (contentType, contentId) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/watchlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          contentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error removing from watchlist:', errorData.error);
        return { error: errorData.error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { error: error.message };
    }
  };

  const markAsWatched = async (contentType, contentId, watched = true) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/watchlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          contentId,
          watched,
          watched_at: watched ? new Date().toISOString() : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating watched status:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating watched status:', error);
      return { error: error.message };
    }
  };

  const addReview = async (contentType, contentId, rating, reviewText = '') => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          contentType,
          contentId,
          rating,
          reviewText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error adding review:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error adding review:', error);
      return { error: error.message };
    }
  };

  const updateReview = async (reviewId, rating, reviewText = '') => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          userId: user.id,
          rating,
          reviewText,
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating review:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating review:', error);
      return { error: error.message };
    }
  };

  const deleteReview = async (reviewId) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const response = await fetch('/api/user/reviews', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          userId: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting review:', errorData.error);
        return { error: errorData.error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting review:', error);
      return { error: error.message };
    }
  };

  const getWatchlist = async (contentType = null) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const url = contentType 
        ? `/api/user/watchlist?userId=${user.id}&contentType=${contentType}`
        : `/api/user/watchlist?userId=${user.id}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching watchlist:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return { error: error.message };
    }
  };

  const getUserReviews = async (contentType = null) => {
    if (!user?.id) return { error: 'No user logged in' };

    try {
      const url = contentType 
        ? `/api/user/reviews?userId=${user.id}&contentType=${contentType}`
        : `/api/user/reviews?userId=${user.id}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching user reviews:', errorData.error);
        return { error: errorData.error };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      return { error: error.message };
    }
  };

  const signInWithAzure = async (callbackUrl = '/') => {
    try {
      await signIn('azure-ad-b2c', { callbackUrl });
    } catch (error) {
      console.error('Error signing in with Azure:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut({ callbackUrl: '/' });
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    // User state
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,

    // Authentication methods
    signIn: signInWithAzure,
    signOut: signOutUser,

    // Profile management
    updateUserProfile,
    updateUserPreferences,
    getUserStats,

    // Watchlist management
    addToWatchlist,
    removeFromWatchlist,
    markAsWatched,
    getWatchlist,

    // Review management
    addReview,
    updateReview,
    deleteReview,
    getUserReviews,

    // Utility methods
    refreshProfile: () => fetchUserProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;