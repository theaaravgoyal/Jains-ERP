const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue } = require('bullmq');
const { allQueues } = require('../queues/queueManager');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Only register valid BullMQ Queue instances (avoids crashes when queues are fallback/mock objects)
const adapters = [];
if (Array.isArray(allQueues)) {
  for (const queue of allQueues) {
    if (queue instanceof Queue) {
      try {
        adapters.push(new BullMQAdapter(queue));
      } catch (err) {
        console.warn(`[BullBoard] Skipping queue "${queue?.name}": ${err.message}`);
      }
    }
  }
}

createBullBoard({
  queues: adapters,
  serverAdapter
});

module.exports = {
  serverAdapter
};

