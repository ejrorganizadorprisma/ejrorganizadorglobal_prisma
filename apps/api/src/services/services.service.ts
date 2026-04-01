import { ServicesRepository } from '../repositories/services.repository';
import { AppError } from '../utils/errors';
import type { CreateServiceDTO, UpdateServiceDTO } from '@ejr/shared-types';

export class ServicesService {
  private repository: ServicesRepository;

  constructor() {
    this.repository = new ServicesRepository();
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const { page, limit, search, category, isActive } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const { data, total } = await this.repository.findMany({ page, limit, search, category, isActive });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const service = await this.repository.findById(id);

    if (!service) {
      throw new AppError('Serviço não encontrado', 404, 'SERVICE_NOT_FOUND');
    }

    return service;
  }

  async findByCode(code: string) {
    const service = await this.repository.findByCode(code);

    if (!service) {
      throw new AppError('Serviço não encontrado', 404, 'SERVICE_NOT_FOUND');
    }

    return service;
  }

  async create(data: CreateServiceDTO) {
    // Verificar se já existe serviço com o mesmo código
    const existingService = await this.repository.findByCode(data.code);
    if (existingService) {
      throw new AppError('Já existe um serviço com este código', 409, 'DUPLICATE_CODE');
    }

    // Validar preço
    if (data.defaultPrice < 0) {
      throw new AppError('Preço não pode ser negativo', 400, 'INVALID_PRICE');
    }

    // Validar duração
    if (data.durationMinutes !== undefined && data.durationMinutes <= 0) {
      throw new AppError('Duração deve ser maior que zero', 400, 'INVALID_DURATION');
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateServiceDTO) {
    // Verificar se serviço existe
    const existingService = await this.repository.findById(id);
    if (!existingService) {
      throw new AppError('Serviço não encontrado', 404, 'SERVICE_NOT_FOUND');
    }

    // Se código foi alterado, verificar se já existe outro serviço com o novo código
    if (data.code && data.code !== existingService.code) {
      const serviceWithCode = await this.repository.findByCode(data.code);
      if (serviceWithCode) {
        throw new AppError('Já existe um serviço com este código', 409, 'DUPLICATE_CODE');
      }
    }

    // Validar preço se fornecido
    if (data.defaultPrice !== undefined && data.defaultPrice < 0) {
      throw new AppError('Preço não pode ser negativo', 400, 'INVALID_PRICE');
    }

    // Validar duração se fornecida
    if (data.durationMinutes !== undefined && data.durationMinutes !== null && data.durationMinutes <= 0) {
      throw new AppError('Duração deve ser maior que zero', 400, 'INVALID_DURATION');
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    // Verificar se serviço existe
    const existingService = await this.repository.findById(id);
    if (!existingService) {
      throw new AppError('Serviço não encontrado', 404, 'SERVICE_NOT_FOUND');
    }

    // TODO: Verificar se serviço está sendo usado em orçamentos/pedidos ativos
    // Por enquanto, permitir exclusão

    return this.repository.delete(id);
  }
}
