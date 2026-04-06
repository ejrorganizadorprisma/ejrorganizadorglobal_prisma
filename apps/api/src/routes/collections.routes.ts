import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { CollectionsRepository } from '../repositories/collections.repository';
import { CreateCollectionSchema } from '@ejr/shared-types';
import type { CollectionFilters } from '@ejr/shared-types';
import { ValidationError, NotFoundError } from '../utils/errors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();
const repo = new CollectionsRepository();

// Multer config para upload de fotos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
});

// Diretório para salvar fotos
const uploadDir = path.join(process.cwd(), 'uploads', 'collections');

function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function saveFiles(files: Express.Multer.File[]): string[] {
  ensureUploadDir();
  return files.map((file) => {
    const filename = Date.now() + '-' + file.originalname;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
    return '/uploads/collections/' + filename;
  });
}

// Todas as rotas requerem autenticação
router.use(authenticate);

// POST / — criar cobrança
router.post('/', upload.array('photos', 5), async (req: AuthRequest, res: Response) => {
  try {
    // Quando enviado via multipart/form-data, campos numéricos vêm como string
    const body = {
      ...req.body,
      amount: req.body.amount ? Number(req.body.amount) : undefined,
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
    };

    const parsed = CreateCollectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Dados inválidos', parsed.error.flatten().fieldErrors);
    }

    const dto = parsed.data;
    let photoUrls: string[] | undefined;

    // Salvar fotos se enviadas
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      photoUrls = saveFiles(files);
    }

    const collection = await repo.create(
      { ...dto, photoUrls },
      req.user!.id
    );

    res.status(201).json({ data: collection });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message, details: error.details });
    }
    throw error;
  }
});

// GET /stats — estatísticas (somente gestores)
router.get('/stats', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const filters: CollectionFilters = {
      sellerId: req.query.sellerId as string,
      customerId: req.query.customerId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const stats = await repo.getStats(filters);
    res.json({ data: stats });
  } catch (error) {
    throw error;
  }
});

// GET /by-sale/:saleId — cobranças de uma venda
router.get('/by-sale/:saleId', async (req: AuthRequest, res: Response) => {
  try {
    const result = await repo.getCollectionsBySale(req.params.saleId);
    res.json(result);
  } catch (error) {
    throw error;
  }
});

// GET / — listar cobranças com filtros
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const filters: CollectionFilters = {
      sellerId: req.query.sellerId as string,
      customerId: req.query.customerId as string,
      saleId: req.query.saleId as string,
      status: req.query.status as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };

    const result = await repo.findAll(filters);
    res.json(result);
  } catch (error) {
    throw error;
  }
});

// GET /:id — buscar cobrança por ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const collection = await repo.findById(req.params.id);
    if (!collection) {
      throw new NotFoundError('Cobrança não encontrada');
    }
    res.json({ data: collection });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
});

// PATCH /:id/approve — aprovar cobrança
router.patch('/:id/approve', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Cobrança não encontrada');
    }
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('Apenas cobranças pendentes podem ser aprovadas');
    }

    const collection = await repo.approve(req.params.id, req.user!.id);
    res.json({ data: collection });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});

// PATCH /:id/reject — rejeitar cobrança
router.patch('/:id/reject', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      throw new ValidationError('Motivo da rejeição é obrigatório');
    }

    const existing = await repo.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Cobrança não encontrada');
    }
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('Apenas cobranças pendentes podem ser rejeitadas');
    }

    const collection = await repo.reject(req.params.id, req.user!.id, reason);
    res.json({ data: collection });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});

// PATCH /:id/deposit — marcar como depositada
router.patch('/:id/deposit', authorize(['OWNER', 'DIRECTOR', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Cobrança não encontrada');
    }
    if (existing.status !== 'APPROVED') {
      throw new ValidationError('Apenas cobranças aprovadas podem ser marcadas como depositadas');
    }

    const collection = await repo.deposit(req.params.id);
    res.json({ data: collection });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});

// POST /upload-photo — upload de fotos (para sync mobile)
router.post('/upload-photo', upload.array('photos', 5), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new ValidationError('Nenhuma foto enviada');
    }

    const urls = saveFiles(files);
    res.json({ data: urls });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});

export default router;
