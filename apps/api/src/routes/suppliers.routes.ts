import { Router } from 'express';
import { SuppliersController } from '../controllers/suppliers.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new SuppliersController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas principais de Suppliers (rotas específicas antes das genéricas)
router.get('/', asyncHandler(controller.findMany));
router.get('/code/:code', asyncHandler(controller.findByCode));
router.post('/', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.create));

// Rotas nested: Addresses (antes de /:id para evitar conflito)
router.get('/:id/addresses', asyncHandler(controller.getAddresses));
router.post('/:id/addresses', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.addAddress));
router.put('/:id/addresses/:addressId', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.updateAddress));
router.delete('/:id/addresses/:addressId', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.deleteAddress));

// Rotas nested: Contacts
router.get('/:id/contacts', asyncHandler(controller.getContacts));
router.post('/:id/contacts', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.addContact));
router.put('/:id/contacts/:contactId', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.updateContact));
router.delete('/:id/contacts/:contactId', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.deleteContact));

// Rota: Produtos do fornecedor
router.get('/:id/products', asyncHandler(controller.getProducts));

// Rotas genéricas de Suppliers (por último para evitar conflito com rotas específicas)
router.get('/:id', asyncHandler(controller.findById));
router.put('/:id', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), asyncHandler(controller.update));
router.delete('/:id', authorize(['OWNER', 'DIRECTOR']), asyncHandler(controller.delete));

export default router;
