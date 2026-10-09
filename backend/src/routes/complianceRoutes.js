import express from 'express';
import {
  submitAttempt,
  getMyHistory,
  getTeamDashboard,
  getAnalyticsSummary,
  getTraineeAuditDetail,
  exportComplianceCSV,
  createAccount,
  getAllUsers,
  deleteUser,
} from '../controllers/complianceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Trainee endpoints
router.post('/submit', protect, submitAttempt);
router.get('/my-history', protect, getMyHistory);

// Supervisor / Admin protected analytics & team endpoints
router.get('/team', protect, requireRole('supervisor', 'admin'), getTeamDashboard);
router.get('/analytics', protect, requireRole('supervisor', 'admin'), getAnalyticsSummary);
router.get('/trainee/:id', protect, requireRole('supervisor', 'admin'), getTraineeAuditDetail);
router.get('/export-csv', protect, requireRole('supervisor', 'admin'), exportComplianceCSV);
router.post('/users', protect, requireRole('supervisor', 'admin'), createAccount);

// Admin-only user management
router.get('/users/all', protect, requireRole('admin'), getAllUsers);
// Declared AFTER '/users/all' deliberately. Express matches in order, so the
// literal path must be registered first or it would be captured as an :id.
router.delete('/users/:id', protect, requireRole('admin'), deleteUser);

export default router;
