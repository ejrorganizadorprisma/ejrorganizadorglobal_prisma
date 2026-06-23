import { Router } from 'express';
import { ManufacturersController } from '../controllers/manufacturers.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new ManufacturersController();

router.use(authenticate);

router.get('/', asyncHandler(controller.findMany));
router.post('/', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.findById));
router.put('/:id', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.update));
router.delete('/:id', authorize(['OWNER', 'DIRECTOR']), asyncHandler(controller.delete));

export default router;
