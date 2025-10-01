'use client';

import { useState } from 'react';

export default function DatabaseAdmin() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedTableType, setSelectedTableType] = useState('sample');
  const [customTableName, setCustomTableName] = useState('');
  const [tablesToDelete, setTablesToDelete] = useState('');

  const handleSetupRLS = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup-rls', {
        method: 'POST',
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: 'Failed to setup RLS' });
    }
    setLoading(false);
  };

  const handleCreateTables = async () => {
    setLoading(true);
    try {
      const body = {
        tableType: selectedTableType,
        ...(selectedTableType === 'custom' && { tableName: customTableName })
      };
      
      const response = await fetch('/api/create-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: 'Failed to create tables' });
    }
    setLoading(false);
  };

  const handleDeleteTables = async () => {
    if (!tablesToDelete.trim()) {
      setResults({ success: false, error: 'Please specify tables to delete' });
      return;
    }

    setLoading(true);
    try {
      const tables = tablesToDelete.split(',').map(t => t.trim()).filter(t => t);
      const response = await fetch('/api/delete-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tables, 
          confirmDelete: true 
        })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: 'Failed to delete tables' });
    }
    setLoading(false);
  };

  const handleSetupDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup-db', {
        method: 'POST',
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: 'Failed to setup database' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Database Administration</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Database Setup */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Database Setup</h2>
            <div className="space-y-4">
              <button
                onClick={handleSetupDatabase}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                Setup Movie Database Schema
              </button>
              
              <button
                onClick={handleSetupRLS}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                Setup Row Level Security (RLS)
              </button>
            </div>
          </div>

          {/* Table Creation */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Create Tables</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Table Type</label>
                <select
                  value={selectedTableType}
                  onChange={(e) => setSelectedTableType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="sample">Sample Tables</option>
                  <option value="blog">Blog Tables</option>
                  <option value="ecommerce">E-commerce Tables</option>
                  <option value="social">Social Media Tables</option>
                  <option value="custom">Custom Table</option>
                </select>
              </div>

              {selectedTableType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Table Name</label>
                  <input
                    type="text"
                    value={customTableName}
                    onChange={(e) => setCustomTableName(e.target.value)}
                    placeholder="my_custom_table"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              )}

              <button
                onClick={handleCreateTables}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                Create Tables
              </button>
            </div>
          </div>

          {/* Table Deletion */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Delete Tables</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tables to Delete (comma-separated)</label>
                <textarea
                  value={tablesToDelete}
                  onChange={(e) => setTablesToDelete(e.target.value)}
                  placeholder="table1, table2, table3"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Leave empty to delete all default tables
                </p>
              </div>

              <button
                onClick={handleDeleteTables}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                ⚠️ Delete Tables
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <div className="text-sm text-gray-300">
                <strong>Available Table Types:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Sample:</strong> sample_products, sample_customers</li>
                  <li><strong>Blog:</strong> blog_posts, blog_comments</li>
                  <li><strong>E-commerce:</strong> products, orders, order_items</li>
                  <li><strong>Social:</strong> social_posts, social_follows, social_likes</li>
                </ul>
              </div>
              
              <div className="text-sm text-gray-300 mt-4">
                <strong>Movie Database Tables:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>users, movies, tv_shows, genres</li>
                  <li>movie_genres, people, collections</li>
                  <li>awards, reviews, watchlist</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {results && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Results</h3>
            <div className={`p-4 rounded ${results.success ? 'bg-green-900 border border-green-600' : 'bg-red-900 border border-red-600'}`}>
              <pre className="text-sm overflow-auto whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}