import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const backupController = new BackupController();

// All routes require authentication
router.use(authenticate);

// Schedule settings
router.get('/settings', (req, res, next) => backupController.getSettings(req, res, next));
router.patch('/settings', (req, res, next) => backupController.updateSettings(req, res, next));

// Execute backup (manual)
router.post('/execute', (req, res, next) => backupController.executeBackup(req, res, next));

// History
router.get('/history', (req, res, next) => backupController.getHistory(req, res, next));

// Download a backup file
router.get('/download/:filename', (req, res, next) => backupController.downloadFile(req, res, next));

// Delete a backup
router.delete('/:id', (req, res, next) => backupController.deleteBackup(req, res, next));

// Database info (compatibility)
router.get('/info', (req, res, next) => backupController.getBackupInfo(req, res, next));

// Restore from uploaded SQL (compatibility)
router.post('/restore', (req, res, next) => backupController.restoreBackup(req, res, next));

export default router;
