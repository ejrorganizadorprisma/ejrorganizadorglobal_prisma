import { Router } from 'express';
import { CarriersController } from '../controllers/carriers.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new CarriersController();

router.use(authenticate);

router.get('/', asyncHandler(controller.findMany));
router.post('/', authorize(['OWNER', 'DIRECTOR', 'MANAGER', 'EXPEDITION']), asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.findById));
router.put('/:id', authorize(['OWNER', 'DIRECTOR', 'MANAGER', 'EXPEDITION']), asyncHandler(controller.update));
router.delete('/:id', authorize(['OWNER', 'DIRECTOR']), asyncHandler(controller.delete));

export default router;
