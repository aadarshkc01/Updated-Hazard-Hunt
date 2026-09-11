import express from 'express';
import { getActiveScenario, getAllScenarios } from '../controllers/scenarioController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/active', protect, getActiveScenario);
router.get('/', protect, getAllScenarios);

export default router;
