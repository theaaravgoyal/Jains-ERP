const express = require('express');
const router = express.Router();
const {
  getQueueHealthAndStats,
  triggerOverdueCheck,
  triggerCacheClean,
  triggerReportWarm
} = require('../controllers/queueController');

router.get('/status', getQueueHealthAndStats);
router.post('/trigger/overdue-check', triggerOverdueCheck);
router.post('/trigger/cache-clean', triggerCacheClean);
router.post('/trigger/report-warm', triggerReportWarm);

module.exports = router;
