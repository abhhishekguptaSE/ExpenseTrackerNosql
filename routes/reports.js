const express = require('express');

const reportsController = require('../controllers/reports');

const authenticatemiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/dailyreport', authenticatemiddleware.authenticate, reportsController.dailyReport);

router.post('/monthreport', authenticatemiddleware.authenticate, reportsController.monthReport);

router.get('/download', authenticatemiddleware.authenticate, reportsController.downloadReport);

router.get('/prevReport', authenticatemiddleware.authenticate, reportsController.prevReport);

module.exports = router;