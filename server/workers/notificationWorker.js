const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');
const Notification = require('../models/Notification');

/**
 * Worker to process notification queue jobs asynchronously
 */
const notificationWorker = new Worker(
  'notification-queue',
  async (job) => {
    const { action, payload } = job.data;
    console.log(`[NotificationWorker] Processing job #${job.id} (${job.name}) - Action: ${action || job.name}`);

    try {
      if (action === 'CREATE_NOTIFICATION' || job.name === 'send-notification') {
        const {
          title,
          message,
          module: notifModule = 'System',
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
        } = payload || job.data;

        // Persist notification to MongoDB
        const notif = await Notification.create({
          title,
          message,
          module: notifModule,
          type,
          priority,
          referenceId,
          referenceType,
          createdBy,
          targetUser: targetUser || recipient,
          recipient: recipient || targetUser,
          senderName,
          isAdmin,
          actionUrl,
          icon
        });

        console.log(`[NotificationWorker] Notification #${notif._id} successfully created for user: ${targetUser || recipient || 'Admin'}`);
        return { success: true, notificationId: notif._id };
      }

      if (action === 'BATCH_NOTIFICATIONS') {
        const { notifications } = payload || job.data;
        if (Array.isArray(notifications) && notifications.length > 0) {
          const docs = await Notification.insertMany(notifications);
          console.log(`[NotificationWorker] Batch created ${docs.length} notifications.`);
          return { success: true, count: docs.length };
        }
      }

      return { success: true, message: 'No recognized action performed.' };
    } catch (err) {
      console.error(`[NotificationWorker Error] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5
  }
);

notificationWorker.on('completed', (job) => {
  // console.log(`[NotificationWorker] Job #${job.id} completed.`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] Job #${job?.id} failed with error: ${err.message}`);
});

module.exports = notificationWorker;
