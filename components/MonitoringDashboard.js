import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Database, Cloud, Cpu, MemoryStick } from 'lucide-react';

const MonitoringDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
      case 'warn':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
      case 'fail':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
      case 'fail':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatMemory = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading && !healthData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center space-x-2">
          <Activity className="w-6 h-6 animate-pulse text-blue-600" />
          <span className="text-gray-600">Loading system health...</span>
        </div>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="w-6 h-6" />
          <span>Failed to load health data: {error}</span>
        </div>
        <button
          onClick={fetchHealthData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
          <div className="flex items-center space-x-2">
            {getStatusIcon(healthData?.status)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(healthData?.status)}`}>
              {healthData?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{healthData?.responseTime || 'N/A'}</div>
            <div className="text-sm text-gray-500">Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{healthData?.application?.version || 'N/A'}</div>
            <div className="text-sm text-gray-500">Version</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{healthData?.application?.environment || 'N/A'}</div>
            <div className="text-sm text-gray-500">Environment</div>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthData?.checks && Object.entries(healthData.checks).map(([service, status]) => (
            <div key={service} className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {service === 'database' && <Database className="w-5 h-5" />}
                  {service === 'storage' && <Cloud className="w-5 h-5" />}
                  {service === 'keyVault' && <Cloud className="w-5 h-5" />}
                  {service === 'openai' && <Cpu className="w-5 h-5" />}
                  <span className="font-medium capitalize">{service}</span>
                </div>
                {getStatusIcon(status)}
              </div>
              <div className="mt-2 text-sm opacity-75">
                {status === 'pass' ? 'Operational' : 
                 status === 'warn' ? 'Degraded' : 
                 status === 'fail' ? 'Down' : 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Metrics */}
      {healthData?.application && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Uptime</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {formatUptime(healthData.application.uptime)}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MemoryStick className="w-5 h-5 text-green-600" />
                <span className="font-medium">Memory (RSS)</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {formatMemory(healthData.application.memory?.rss || 0)}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MemoryStick className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Memory (Heap)</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {formatMemory(healthData.application.memory?.heapUsed || 0)}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu className="w-5 h-5 text-orange-600" />
                <span className="font-medium">Node.js</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {healthData.application.nodeVersion}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
        {loading && <span className="ml-2">(Refreshing...)</span>}
      </div>

      {/* Manual Refresh */}
      <div className="text-center">
        <button
          onClick={fetchHealthData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>
    </div>
  );
};

export default MonitoringDashboard;