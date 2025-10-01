import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Head from 'next/head';
import { 
  FiUser, 
  FiMail, 
  FiCalendar, 
  FiSave, 
  FiEdit3,
  FiSettings,
  FiBell,
  FiShield,
  FiGlobe,
  FiHeart,
  FiStar,
  FiCheck,
  FiX
} from 'react-icons/fi';

export default function Profile() {
  const { user, userProfile, updateUserProfile, updateUserPreferences, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    location: '',
    website: '',
    birth_date: ''
  });

  const [preferences, setPreferences] = useState({
    preferred_genres: [],
    preferred_languages: ['en'],
    content_rating_preference: 'PG-13',
    notification_settings: {
      email_notifications: true,
      push_notifications: true,
      weekly_digest: true,
      new_releases: true
    },
    privacy_settings: {
      profile_visibility: 'public',
      show_watchlist: true,
      show_reviews: true,
      show_ratings: true
    }
  });

  const genres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
    'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  const contentRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        website: userProfile.website || '',
        birth_date: userProfile.birth_date || ''
      });

      if (userProfile.user_preferences) {
        setPreferences({
          preferred_genres: userProfile.user_preferences.preferred_genres || [],
          preferred_languages: userProfile.user_preferences.preferred_languages || ['en'],
          content_rating_preference: userProfile.user_preferences.content_rating_preference || 'PG-13',
          notification_settings: userProfile.user_preferences.notification_settings || {
            email_notifications: true,
            push_notifications: true,
            weekly_digest: true,
            new_releases: true
          },
          privacy_settings: userProfile.user_preferences.privacy_settings || {
            profile_visibility: 'public',
            show_watchlist: true,
            show_reviews: true,
            show_ratings: true
          }
        });
      }
    }
  }, [userProfile]);

  const handleProfileSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await updateUserProfile(profileData);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferencesSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await updateUserPreferences(preferences);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Preferences updated successfully!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenreToggle = (genre) => {
    setPreferences(prev => ({
      ...prev,
      preferred_genres: prev.preferred_genres.includes(genre)
        ? prev.preferred_genres.filter(g => g !== genre)
        : [...prev.preferred_genres, genre]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile - Movie Inferno</title>
        <meta name="description" content="Manage your profile and preferences" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <FiUser className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{user?.name || 'User Profile'}</h1>
                <p className="text-red-100 mt-1">{user?.email}</p>
                <p className="text-red-200 text-sm mt-1">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.type === 'success' 
                ? 'bg-green-900/50 border border-green-700 text-green-400' 
                : 'bg-red-900/50 border border-red-700 text-red-400'
            }`}>
              {message.type === 'success' ? (
                <FiCheck className="w-5 h-5 mr-2" />
              ) : (
                <FiX className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
            <TabButton
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              icon={<FiUser className="w-4 h-4" />}
              text="Profile"
            />
            <TabButton
              active={activeTab === 'preferences'}
              onClick={() => setActiveTab('preferences')}
              icon={<FiSettings className="w-4 h-4" />}
              text="Preferences"
            />
            <TabButton
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
              icon={<FiBell className="w-4 h-4" />}
              text="Notifications"
            />
            <TabButton
              active={activeTab === 'privacy'}
              onClick={() => setActiveTab('privacy')}
              icon={<FiShield className="w-4 h-4" />}
              text="Privacy"
            />
          </div>

          {/* Tab Content */}
          <div className="bg-gray-800 rounded-lg p-6">
            {activeTab === 'profile' && (
              <ProfileTab
                profileData={profileData}
                setProfileData={setProfileData}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                isSaving={isSaving}
                onSave={handleProfileSave}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesTab
                preferences={preferences}
                setPreferences={setPreferences}
                genres={genres}
                languages={languages}
                contentRatings={contentRatings}
                onGenreToggle={handleGenreToggle}
                isSaving={isSaving}
                onSave={handlePreferencesSave}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                preferences={preferences}
                setPreferences={setPreferences}
                isSaving={isSaving}
                onSave={handlePreferencesSave}
              />
            )}

            {activeTab === 'privacy' && (
              <PrivacyTab
                preferences={preferences}
                setPreferences={setPreferences}
                isSaving={isSaving}
                onSave={handlePreferencesSave}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TabButton({ active, onClick, icon, text }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-red-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="ml-2">{text}</span>
    </button>
  );
}

function ProfileTab({ profileData, setProfileData, isEditing, setIsEditing, isSaving, onSave }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Profile Information</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiEdit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={profileData.full_name}
            onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
          <input
            type="text"
            value={profileData.location}
            onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
          <input
            type="url"
            value={profileData.website}
            onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Birth Date</label>
          <input
            type="date"
            value={profileData.birth_date}
            onChange={(e) => setProfileData(prev => ({ ...prev, birth_date: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            disabled={!isEditing}
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>
    </div>
  );
}

function PreferencesTab({ preferences, setPreferences, genres, languages, contentRatings, onGenreToggle, isSaving, onSave }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Content Preferences</h2>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <FiSave className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Preferred Genres */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FiHeart className="w-5 h-5 mr-2 text-red-400" />
            Preferred Genres
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => onGenreToggle(genre)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  preferences.preferred_genres.includes(genre)
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Languages */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FiGlobe className="w-5 h-5 mr-2 text-blue-400" />
            Preferred Languages
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setPreferences(prev => ({
                    ...prev,
                    preferred_languages: prev.preferred_languages.includes(language.code)
                      ? prev.preferred_languages.filter(l => l !== language.code)
                      : [...prev.preferred_languages, language.code]
                  }));
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  preferences.preferred_languages.includes(language.code)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {language.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Rating */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FiStar className="w-5 h-5 mr-2 text-yellow-400" />
            Content Rating Preference
          </h3>
          <div className="flex space-x-3">
            {contentRatings.map((rating) => (
              <button
                key={rating}
                onClick={() => setPreferences(prev => ({ ...prev, content_rating_preference: rating }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  preferences.content_rating_preference === rating
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ preferences, setPreferences, isSaving, onSave }) {
  const updateNotificationSetting = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      notification_settings: {
        ...prev.notification_settings,
        [key]: value
      }
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Notification Settings</h2>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <FiSave className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        <NotificationToggle
          title="Email Notifications"
          description="Receive notifications via email"
          checked={preferences.notification_settings.email_notifications}
          onChange={(checked) => updateNotificationSetting('email_notifications', checked)}
        />
        <NotificationToggle
          title="Push Notifications"
          description="Receive push notifications in your browser"
          checked={preferences.notification_settings.push_notifications}
          onChange={(checked) => updateNotificationSetting('push_notifications', checked)}
        />
        <NotificationToggle
          title="Weekly Digest"
          description="Get a weekly summary of new releases and recommendations"
          checked={preferences.notification_settings.weekly_digest}
          onChange={(checked) => updateNotificationSetting('weekly_digest', checked)}
        />
        <NotificationToggle
          title="New Releases"
          description="Get notified about new movie and TV show releases"
          checked={preferences.notification_settings.new_releases}
          onChange={(checked) => updateNotificationSetting('new_releases', checked)}
        />
      </div>
    </div>
  );
}

function PrivacyTab({ preferences, setPreferences, isSaving, onSave }) {
  const updatePrivacySetting = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      privacy_settings: {
        ...prev.privacy_settings,
        [key]: value
      }
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Privacy Settings</h2>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <FiSave className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Profile Visibility</label>
          <select
            value={preferences.privacy_settings.profile_visibility}
            onChange={(e) => updatePrivacySetting('profile_visibility', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <NotificationToggle
          title="Show Watchlist"
          description="Allow others to see your watchlist"
          checked={preferences.privacy_settings.show_watchlist}
          onChange={(checked) => updatePrivacySetting('show_watchlist', checked)}
        />
        <NotificationToggle
          title="Show Reviews"
          description="Allow others to see your reviews"
          checked={preferences.privacy_settings.show_reviews}
          onChange={(checked) => updatePrivacySetting('show_reviews', checked)}
        />
        <NotificationToggle
          title="Show Ratings"
          description="Allow others to see your ratings"
          checked={preferences.privacy_settings.show_ratings}
          onChange={(checked) => updatePrivacySetting('show_ratings', checked)}
        />
      </div>
    </div>
  );
}

function NotificationToggle({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-red-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}