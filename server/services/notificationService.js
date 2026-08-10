const Notification = require('../models/Notification');
const { addNotificationJob, addEmailJob } = require('../queues/queueManager');

/**
 * Reusable Global Notification Service
 * Dispatches notifications asynchronously via BullMQ with MongoDB fallback.
 */
class NotificationService {
  /**
   * Create and dispatch a new notification
   * @param {Object} data - Notification fields
   * @param {boolean} asyncMode - If true (default), enqueues to BullMQ worker
   */
  async create({
    title,
    message,
    module = 'System',
    type = 'INFO',
    priority = 'MEDIUM',
    referenceId = null,
    referenceType = null,
    createdBy = null,
    targetUser,
    recipient,
    senderName = '',
    isAdmin = false,
    actionUrl = '',
    icon = ''
  }, asyncMode = true) {
    try {
      const actualTarget = targetUser || recipient;

      if (!actualTarget && !isAdmin) {
        throw new Error('Target user or recipient is required to route the notification alert.');
      }

      const payload = {
        title,
        message,
        module,
        type,
        priority,
        referenceId,
        referenceType,
        createdBy,
        targetUser: actualTarget,
        recipient: actualTarget,
        senderName,
        isAdmin,
        actionUrl,
        icon
      };

      if (asyncMode) {
        // Enqueue to BullMQ worker for async decoupled processing
        await addNotificationJob('send-notification', {
          action: 'CREATE_NOTIFICATION',
          payload
        });
        return { success: true, queued: true, ...payload };
      } else {
        // Direct synchronous database write
        const notification = await Notification.create(payload);
        this.dispatchEvent(notification);
        return notification;
      }
    } catch (error) {
      console.error('NotificationService.create error:', error);
      throw error;
    }
  }

  /**
   * Broadcast dispatch logic and external triggers
   */
  dispatchEvent(notification) {
    if (notification.priority === 'CRITICAL' || notification.priority === 'HIGH') {
      this.sendExternalAlerts(notification);
    }
  }

  async sendExternalAlerts(notification) {
    console.log(`[NotificationService] High-priority alert for targetUser ${notification.targetUser || notification.recipient}: ${notification.title}`);
  }
}

module.exports = new NotificationService();
