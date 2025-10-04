import azureClient from '../../../lib/azureClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication and admin role
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role
    const { data: userProfile } = await azureClient
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get recent activities from audit logs
    const { data: auditLogs, error: auditError } = await azureClient
      .from('audit_logs')
      .select(`
        id,
        table_name,
        operation,
        old_values,
        new_values,
        user_id,
        created_at,
        users!inner(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
    }

    // Get recent user registrations
    const { data: newUsers, error: usersError } = await azureClient
      .from('users')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) {
      console.error('Error fetching new users:', usersError);
    }

    // Get recent reviews
    const { data: recentReviews, error: reviewsError } = await azureClient
      .from('reviews')
      .select(`
        id,
        content_type,
        content_id,
        rating,
        created_at,
        users!inner(email, full_name),
        movies(title),
        tv_shows(title)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.error('Error fetching recent reviews:', reviewsError);
    }

    // Combine and format activities
    const activities = [];

    // Add audit log activities
    if (auditLogs) {
      auditLogs.forEach(log => {
        let description = '';
        const userName = log.users?.full_name || log.users?.email || 'Unknown User';
        
        switch (log.operation) {
          case 'INSERT':
            description = `${userName} created a new ${log.table_name.replace('_', ' ')}`;
            break;
          case 'UPDATE':
            description = `${userName} updated ${log.table_name.replace('_', ' ')}`;
            break;
          case 'DELETE':
            description = `${userName} deleted ${log.table_name.replace('_', ' ')}`;
            break;
          default:
            description = `${userName} performed ${log.operation} on ${log.table_name.replace('_', ' ')}`;
        }

        activities.push({
          id: `audit_${log.id}`,
          type: 'audit',
          description,
          timestamp: formatTimestamp(log.created_at),
          user: userName,
          details: {
            table: log.table_name,
            operation: log.operation,
            old_values: log.old_values,
            new_values: log.new_values
          }
        });
      });
    }

    // Add user registration activities
    if (newUsers) {
      newUsers.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'user_registration',
          description: `New user registered: ${user.full_name || user.email}`,
          timestamp: formatTimestamp(user.created_at),
          user: user.full_name || user.email,
          details: {
            user_id: user.id,
            email: user.email
          }
        });
      });
    }

    // Add review activities
    if (recentReviews) {
      recentReviews.forEach(review => {
        const contentTitle = review.movies?.title || review.tv_shows?.title || 'Unknown Content';
        const userName = review.users?.full_name || review.users?.email || 'Unknown User';
        
        activities.push({
          id: `review_${review.id}`,
          type: 'review',
          description: `${userName} reviewed "${contentTitle}" (${review.rating}/10)`,
          timestamp: formatTimestamp(review.created_at),
          user: userName,
          details: {
            content_type: review.content_type,
            content_id: review.content_id,
            content_title: contentTitle,
            rating: review.rating
          }
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to requested number of activities
    const limitedActivities = activities.slice(offset, offset + limit);

    res.status(200).json({
      activities: limitedActivities,
      total: activities.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching admin activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes < 10080) { // 7 days
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}