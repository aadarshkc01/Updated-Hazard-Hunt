import express from 'express';
import { login, getMe, completeOnboarding } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/complete-onboarding', protect, completeOnboarding);

export default router;
