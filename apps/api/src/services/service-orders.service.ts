import { ServiceOrdersRepository } from '../repositories/service-orders.repository';
import { ServicePartsRepository } from '../repositories/service-parts.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { AppError } from '../utils/errors';
import type { ServiceOrderStatus, CreateServiceOrderDTO, UpdateServiceOrderDTO, AddServicePartDTO } from '@ejr/shared-types';

export class ServiceOrdersService {
  private repository: ServiceOrdersRepository;
  private servicePartsRepository: ServicePartsRepository;
  private productsRepository: ProductsRepository;

  constructor() {
    this.repository = new ServiceOrdersRepository();
    this.servicePartsRepository = new ServicePartsRepository();
    this.productsRepository = new ProductsRepository();
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: ServiceOrderStatus;
    customerId?: string;
    technicianId?: string;
    isWarranty?: boolean;
  }) {
    const { page, limit, search, status, customerId, technicianId, isWarranty } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const [serviceOrders, total] = await Promise.all([
      this.repository.findMany({ page, limit, search, status, customerId, technicianId, isWarranty }),
      this.repository.count({ search, status, customerId, technicianId, isWarranty }),
    ]);

    return {
      data: serviceOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const serviceOrder = await this.repository.findById(id);

    if (!serviceOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404, 'SERVICE_ORDER_NOT_FOUND');
    }

    return serviceOrder;
  }

  async create(data: CreateServiceOrderDTO) {
    // Validar se cliente existe (verificação básica pelo ID)
    if (!data.customerId) {
      throw new AppError('Cliente é obrigatório', 400, 'CUSTOMER_REQUIRED');
    }

    // Validar se produto existe
    const product = await this.productsRepository.findById(data.productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Validar descrição do problema
    if (!data.issueDescription || data.issueDescription.trim().length === 0) {
      throw new AppError('Descrição do problema é obrigatória', 400, 'ISSUE_DESCRIPTION_REQUIRED');
    }

    // Validar data de entrega estimada se fornecida
    if (data.estimatedDelivery) {
      const estimatedDate = new Date(data.estimatedDelivery);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (estimatedDate < today) {
        throw new AppError('Data de entrega estimada não pode ser no passado', 400, 'INVALID_ESTIMATED_DELIVERY');
      }
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateServiceOrderDTO) {
    // Verificar se ordem de serviço existe
    const existingOrder = await this.repository.findById(id);
    if (!existingOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404, 'SERVICE_ORDER_NOT_FOUND');
    }

    // Não permitir editar OS completada ou cancelada
    if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELLED') {
      throw new AppError('Não é possível editar uma OS completada ou cancelada', 400, 'SERVICE_ORDER_NOT_EDITABLE');
    }

    // Validar custo de mão de obra se fornecido
    if (data.laborCost !== undefined && data.laborCost < 0) {
      throw new AppError('Custo de mão de obra não pode ser negativo', 400, 'INVALID_LABOR_COST');
    }

    // Validar data de entrega estimada se fornecida
    if (data.estimatedDelivery) {
      const estimatedDate = new Date(data.estimatedDelivery);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (estimatedDate < today) {
        throw new AppError('Data de entrega estimada não pode ser no passado', 400, 'INVALID_ESTIMATED_DELIVERY');
      }
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    // Verificar se ordem de serviço existe
    const existingOrder = await this.repository.findById(id);
    if (!existingOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404, 'SERVICE_ORDER_NOT_FOUND');
    }

    // Não permitir deletar OS completada
    if (existingOrder.status === 'COMPLETED') {
      throw new AppError('Não é possível deletar uma OS completada', 400, 'SERVICE_ORDER_COMPLETED');
    }

    return this.repository.delete(id);
  }

  async getByStatus(status: ServiceOrderStatus) {
    return this.repository.getByStatus(status);
  }

  async getByCustomer(customerId: string) {
    if (!customerId) {
      throw new AppError('ID do cliente é obrigatório', 400, 'CUSTOMER_ID_REQUIRED');
    }

    return this.repository.getByCustomer(customerId);
  }

  async addPart(serviceOrderId: string, partData: AddServicePartDTO) {
    // Verificar se ordem de serviço existe
    const serviceOrder = await this.repository.findById(serviceOrderId);
    if (!serviceOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404, 'SERVICE_ORDER_NOT_FOUND');
    }

    // Não permitir adicionar peças em OS completada ou cancelada
    if (serviceOrder.status === 'COMPLETED' || serviceOrder.status === 'CANCELLED') {
      throw new AppError('Não é possível adicionar peças em uma OS completada ou cancelada', 400, 'SERVICE_ORDER_NOT_EDITABLE');
    }

    // Verificar se produto existe
    const product = await this.productsRepository.findById(partData.productId);
    if (!product) {
      throw new AppError('Produto/peça não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Validar quantidade
    if (partData.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }

    // Verificar estoque disponível
    if (product.currentStock < partData.quantity) {
      throw new AppError(`Estoque insuficiente. Disponível: ${product.currentStock}`, 400, 'INSUFFICIENT_STOCK');
    }

    // Adicionar peça usando RPC (vai atualizar estoque e custos)
    return this.servicePartsRepository.add(serviceOrderId, partData);
  }

  async removePart(serviceOrderId: string, partId: string) {
    // Verificar se ordem de serviço existe
    const serviceOrder = await this.repository.findById(serviceOrderId);
    if (!serviceOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404, 'SERVICE_ORDER_NOT_FOUND');
    }

    // Não permitir remover peças de OS completada ou cancelada
    if (serviceOrder.status === 'COMPLETED' || serviceOrder.status === 'CANCELLED') {
      throw new AppError('Não é possível remover peças de uma OS completada ou cancelada', 400, 'SERVICE_ORDER_NOT_EDITABLE');
    }

    // Verificar se peça existe
    const part = await this.servicePartsRepository.findById(partId);
    if (!part) {
      throw new AppError('Peça não encontrada na ordem de serviço', 404, 'SERVICE_PART_NOT_FOUND');
    }

    // Verificar se peça pertence à OS
    if (part.serviceOrderId !== serviceOrderId) {
      throw new AppError('Peça não pertence a esta ordem de serviço', 400, 'PART_MISMATCH');
    }

    return this.servicePartsRepository.remove(partId);
  }

  async complete(id: string, servicePerformed: string, laborCost: number) {
    // Verificar se ordem de serviço existe
    const serviceOrder = await this.repository.findById(id);
    if (!serviceOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404, 'SERVICE_ORDER_NOT_FOUND');
    }

    // Verificar se já está completada
    if (serviceOrder.status === 'COMPLETED') {
      throw new AppError('Ordem de serviço já está completada', 400, 'SERVICE_ORDER_ALREADY_COMPLETED');
    }

    // Verificar se está cancelada
    if (serviceOrder.status === 'CANCELLED') {
      throw new AppError('Não é possível completar uma OS cancelada', 400, 'SERVICE_ORDER_CANCELLED');
    }

    // Validar descrição do serviço realizado
    if (!servicePerformed || servicePerformed.trim().length === 0) {
      throw new AppError('Descrição do serviço realizado é obrigatória', 400, 'SERVICE_PERFORMED_REQUIRED');
    }

    // Validar custo de mão de obra
    if (laborCost < 0) {
      throw new AppError('Custo de mão de obra não pode ser negativo', 400, 'INVALID_LABOR_COST');
    }

    // Completar usando RPC (vai atualizar status, data e custos)
    return this.repository.completeServiceOrder(id, servicePerformed, laborCost);
  }
}
