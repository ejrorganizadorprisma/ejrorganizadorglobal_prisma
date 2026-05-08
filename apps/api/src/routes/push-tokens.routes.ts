import { Router } from 'express';
import { PushTokensController } from '../controllers/push-tokens.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new PushTokensController();

router.use(authenticate);

router.post('/', controller.register);
router.delete('/', controller.remove);

export default router;
