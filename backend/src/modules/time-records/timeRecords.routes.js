const express = require('express');
const router = express.Router();
const timeRecordsController = require('./timeRecords.controller');
const authMiddleware = require('../../middleware/auth');
const checkRole = require('../../middleware/rbac');
const upload = require('../../config/upload');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas para funcionários (próprios registros)
router.post('/', upload.single('photo'), timeRecordsController.create);
router.get('/my-records', timeRecordsController.getMyRecords);
router.get('/my-journey/:date', timeRecordsController.getMyDailyJourney);
router.get('/my-journey/:year/:month', timeRecordsController.getMyMonthlyJourney);

// Rotas para gestores/admin
router.get('/today', checkRole(['gestor', 'admin']), timeRecordsController.getTodayRecords);
router.get('/all', authMiddleware, timeRecordsController.getAllRecords);
router.get('/date/:date', checkRole(['gestor', 'admin']), timeRecordsController.getByDate);
router.get('/user/:userId', checkRole(['gestor', 'admin']), timeRecordsController.getUserRecords);
router.get('/journey/:userId/:date', checkRole(['gestor', 'admin']), timeRecordsController.getDailyJourney);
router.get('/journey/:userId/:year/:month', checkRole(['gestor', 'admin']), timeRecordsController.getMonthlyJourney);
router.get('/photo/:recordId', checkRole(['gestor', 'admin']), timeRecordsController.getRecordPhoto);
router.get('/inconsistencies/:userId/:date', checkRole(['gestor', 'admin']), timeRecordsController.checkInconsistencies);
router.get('/statistics/:userId', checkRole(['gestor', 'admin']), timeRecordsController.getStatistics);

// Apenas admin pode criar registros manuais
router.post('/manual', checkRole(['admin', 'gestor']), timeRecordsController.createManual);

module.exports = router;
