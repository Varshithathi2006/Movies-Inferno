import { ApplicationInsights } from '@microsoft/applicationinsights-web';

class MonitoringService {
  constructor() {
    this.appInsights = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING) {
        this.appInsights = new ApplicationInsights({
          config: {
            connectionString: process.env.NEXT_PUBLIC_AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING,
            enableAutoRouteTracking: true,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            enableAjaxErrorStatusText: true,
            enableAjaxPerfTracking: true,
            maxAjaxCallsPerView: 20,
            disableExceptionTracking: false,
            disableTelemetry: false,
            verboseLogging: process.env.NODE_ENV === 'development',
            enableDebugExceptions: process.env.NODE_ENV === 'development',
            samplingPercentage: process.env.NODE_ENV === 'production' ? 50 : 100,
            extensions: [],
            extensionConfig: {}
          }
        });

        this.appInsights.loadAppInsights();
        this.appInsights.trackPageView();
        this.isInitialized = true;

        // Set up global error handling
        this.setupGlobalErrorHandling();
      }
    } catch (error) {
      console.error('Failed to initialize Application Insights:', error);
    }
  }

  setupGlobalErrorHandling() {
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.trackException(event.reason, {
          type: 'unhandledrejection',
          promise: event.promise?.toString()
        });
      });

      // Handle global errors
      window.addEventListener('error', (event) => {
        this.trackException(event.error, {
          type: 'global_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
    }
  }

  // Track custom events
  trackEvent(name, properties = {}, measurements = {}) {
    if (!this.isInitialized) return;

    try {
      this.appInsights.trackEvent({
        name,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          url: typeof window !== 'undefined' ? window.location.href : 'server'
        },
        measurements
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Track page views
  trackPageView(name, url, properties = {}) {
    if (!this.isInitialized) return;

    try {
      this.appInsights.trackPageView({
        name,
        uri: url,
        properties: {
          ...properties,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  // Track exceptions
  trackException(error, properties = {}) {
    if (!this.isInitialized) return;

    try {
      this.appInsights.trackException({
        exception: error,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          stack: error?.stack,
          message: error?.message
        }
      });
    } catch (trackingError) {
      console.error('Error tracking exception:', trackingError);
    }
  }

  // Track custom metrics
  trackMetric(name, value, properties = {}) {
    if (!this.isInitialized) return;

    try {
      this.appInsights.trackMetric({
        name,
        average: value,
        properties: {
          ...properties,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error tracking metric:', error);
    }
  }

  // Track dependencies (API calls, database queries, etc.)
  trackDependency(name, data, duration, success, properties = {}) {
    if (!this.isInitialized) return;

    try {
      this.appInsights.trackDependencyData({
        name,
        data,
        duration,
        success,
        properties: {
          ...properties,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error tracking dependency:', error);
    }
  }

  // Track user actions
  trackUserAction(action, target, properties = {}) {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties
    });
  }

  // Track performance metrics
  trackPerformance(name, duration, properties = {}) {
    this.trackMetric(`performance_${name}`, duration, {
      type: 'performance',
      ...properties
    });
  }

  // Track business metrics
  trackBusinessMetric(metric, value, properties = {}) {
    this.trackMetric(`business_${metric}`, value, {
      type: 'business',
      ...properties
    });
  }

  // Track API calls
  trackAPICall(endpoint, method, statusCode, duration, properties = {}) {
    this.trackDependency(
      `API_${method}_${endpoint}`,
      `${method} ${endpoint}`,
      duration,
      statusCode >= 200 && statusCode < 400,
      {
        endpoint,
        method,
        statusCode,
        type: 'api_call',
        ...properties
      }
    );
  }

  // Track search queries
  trackSearch(query, resultsCount, properties = {}) {
    this.trackEvent('search_performed', {
      query,
      resultsCount,
      type: 'search',
      ...properties
    });
  }

  // Track content interactions
  trackContentInteraction(contentId, contentType, action, properties = {}) {
    this.trackEvent('content_interaction', {
      contentId,
      contentType,
      action,
      type: 'content',
      ...properties
    });
  }

  // Track authentication events
  trackAuth(action, success, properties = {}) {
    this.trackEvent('auth_event', {
      action,
      success,
      type: 'authentication',
      ...properties
    });
  }

  // Set user context
  setUser(userId, properties = {}) {
    if (!this.isInitialized) return;

    try {
      this.appInsights.setAuthenticatedUserContext(userId, undefined, true);
      this.appInsights.addTelemetryInitializer((envelope) => {
        envelope.tags = envelope.tags || {};
        envelope.tags['ai.user.id'] = userId;
        
        if (properties) {
          envelope.data = envelope.data || {};
          envelope.data.baseData = envelope.data.baseData || {};
          envelope.data.baseData.properties = {
            ...envelope.data.baseData.properties,
            ...properties
          };
        }
      });
    } catch (error) {
      console.error('Error setting user context:', error);
    }
  }

  // Clear user context
  clearUser() {
    if (!this.isInitialized) return;

    try {
      this.appInsights.clearAuthenticatedUserContext();
    } catch (error) {
      console.error('Error clearing user context:', error);
    }
  }

  // Flush telemetry
  flush() {
    if (!this.isInitialized) return;

    try {
      this.appInsights.flush();
    } catch (error) {
      console.error('Error flushing telemetry:', error);
    }
  }

  // Get session ID
  getSessionId() {
    if (!this.isInitialized) return null;

    try {
      return this.appInsights.context?.session?.id;
    } catch (error) {
      console.error('Error getting session ID:', error);
      return null;
    }
  }

  // Check if monitoring is enabled
  isEnabled() {
    return this.isInitialized;
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

export default monitoring;

// Server-side monitoring utilities
export class ServerMonitoring {
  static trackServerEvent(name, properties = {}) {
    if (process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING) {
      // In a real implementation, you would use the Node.js Application Insights SDK
      console.log(`[TELEMETRY] Event: ${name}`, properties);
    }
  }

  static trackServerException(error, properties = {}) {
    if (process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING) {
      console.error(`[TELEMETRY] Exception:`, error, properties);
    }
  }

  static trackServerMetric(name, value, properties = {}) {
    if (process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING) {
      console.log(`[TELEMETRY] Metric: ${name} = ${value}`, properties);
    }
  }

  static trackServerDependency(name, data, duration, success, properties = {}) {
    if (process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING) {
      console.log(`[TELEMETRY] Dependency: ${name}`, { data, duration, success, ...properties });
    }
  }
}