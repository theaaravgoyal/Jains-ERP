const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Notification Controller - Handles global notification center operations.
 * Enforces pagination, date filtering, module classification, and security checks.
 */

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      module, 
      priority, 
      isRead, 
      dateFilter 
    } = req.query;

    const queryFilter = {};
    if (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'Attendance Admin') {
      queryFilter.$or = [
        { targetUser: userId },
        { isAdmin: true }
      ];
    } else {
      queryFilter.targetUser = userId;
    }

    // Apply exact matches
    if (module) queryFilter.module = module;
    if (priority) queryFilter.priority = priority;
    if (isRead !== undefined && isRead !== '') {
      queryFilter.isRead = isRead === 'true';
    }

    // Apply date range filters
    if (dateFilter) {
      const now = new Date();
      let startDate;

      if (dateFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (dateFilter === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (startDate) {
        queryFilter.createdAt = { $gte: startDate };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(queryFilter)
    ]);

    return sendSuccess(res, 'Notifications retrieved successfully', {
      notifications,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    }, 200);

  } catch (error) {
    console.error('getNotifications error:', error);
    return sendError(res, 'Failed to fetch user notifications', [error.message], 500);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { module } = req.query;

    const queryFilter = { isRead: false };
    if (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'Attendance Admin') {
      queryFilter.$or = [
        { targetUser: userId },
        { isAdmin: true }
      ];
    } else {
      queryFilter.targetUser = userId;
    }

    if (module) queryFilter.module = module;

    const count = await Notification.countDocuments(queryFilter);
    return sendSuccess(res, 'Unread notification count retrieved', { count }, 200);
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return sendError(res, 'Failed to retrieve unread notification stats', [error.message], 500);
  }
};

const getNotificationById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    const notification = await Notification.findOne({ _id: id, targetUser: userId });
    if (!notification) {
      return sendError(res, 'Notification alert not found or unauthorized access.', [], 404);
    }

    return sendSuccess(res, 'Notification retrieved', notification, 200);
  } catch (error) {
    console.error('getNotificationById error:', error);
    return sendError(res, 'Failed to fetch single notification profile', [error.message], 500);
  }
};

const markRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    const query = { _id: id };
    if (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'Attendance Admin') {
      query.$or = [
        { targetUser: userId },
        { isAdmin: true }
      ];
    } else {
      query.targetUser = userId;
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return sendError(res, 'Notification not found or unauthorized access.', [], 404);
    }

    return sendSuccess(res, 'Notification marked as read', notification, 200);
  } catch (error) {
    console.error('markRead error:', error);
    return sendError(res, 'Failed to update notification read status', [error.message], 500);
  }
};

const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    const query = { isRead: false };
    if (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'Attendance Admin') {
      query.$or = [
        { targetUser: userId },
        { isAdmin: true }
      ];
    } else {
      query.targetUser = userId;
    }

    await Notification.updateMany(
      query,
      { isRead: true, readAt: new Date() }
    );

    return sendSuccess(res, 'All active user notifications marked as read', null, 200);
  } catch (error) {
    console.error('markAllRead error:', error);
    return sendError(res, 'Failed to mark all notifications as read', [error.message], 500);
  }
};

const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    const query = { _id: id };
    if (req.user.role === 'Admin' || req.user.role === 'Super Admin' || req.user.role === 'Attendance Admin') {
      query.$or = [
        { targetUser: userId },
        { isAdmin: true }
      ];
    } else {
      query.targetUser = userId;
    }

    const deleted = await Notification.findOneAndDelete(query);
    if (!deleted) {
      return sendError(res, 'Notification not found or unauthorized access.', [], 404);
    }

    return sendSuccess(res, 'Notification alert deleted successfully', null, 200);
  } catch (error) {
    console.error('deleteNotification error:', error);
    return sendError(res, 'Failed to delete notification alert', [error.message], 500);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markRead,
  markAllRead,
  deleteNotification
};
