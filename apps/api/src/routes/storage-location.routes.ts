import { Router } from 'express';
import { StorageLocationController } from '../controllers/storage-location.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new StorageLocationController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============================================
// STORAGE SPACES (Espaços)
// ============================================

router.get('/spaces', controller.getAllSpaces.bind(controller));
router.get('/spaces/:id', controller.getSpaceById.bind(controller));
router.post('/spaces', controller.createSpace.bind(controller));
router.put('/spaces/:id', controller.updateSpace.bind(controller));
router.delete('/spaces/:id', controller.deleteSpace.bind(controller));

// ============================================
// STORAGE SHELVES (Prateleiras)
// ============================================

router.get('/shelves', controller.getAllShelves.bind(controller));
router.get('/shelves/:id', controller.getShelfById.bind(controller));
router.post('/shelves', controller.createShelf.bind(controller));
router.put('/shelves/:id', controller.updateShelf.bind(controller));
router.delete('/shelves/:id', controller.deleteShelf.bind(controller));

// ============================================
// STORAGE SECTIONS (Seções)
// ============================================

router.get('/sections', controller.getAllSections.bind(controller));
router.get('/sections/:id', controller.getSectionById.bind(controller));
router.post('/sections', controller.createSection.bind(controller));
router.put('/sections/:id', controller.updateSection.bind(controller));
router.delete('/sections/:id', controller.deleteSection.bind(controller));

export default router;
