import { StockReservationsRepository, CreateReservationDTO, UpdateReservationDTO, ReservationStatus, ReservationType } from '../repositories/stock-reservations.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { AppError } from '../utils/errors';

export class StockReservationsService {
  private repository: StockReservationsRepository;
  private productsRepository: ProductsRepository;

  constructor() {
    this.repository = new StockReservationsRepository();
    this.productsRepository = new ProductsRepository();
  }

  async findMany(filters?: {
    productId?: string;
    status?: ReservationStatus;
    reservedForType?: ReservationType;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const result = await this.repository.findMany({
      ...filters,
      page,
      limit,
    });

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async findById(id: string) {
    const reservation = await this.repository.findById(id);

    if (!reservation) {
      throw new AppError('Reserva não encontrada', 404, 'RESERVATION_NOT_FOUND');
    }

    return reservation;
  }

  async create(data: CreateReservationDTO) {
    // Validar quantidade
    if (data.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }

    // Verificar se o produto existe
    const product = await this.productsRepository.findById(data.productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Verificar estoque disponível
    const totalReserved = await this.repository.getTotalReserved(data.productId);
    const availableStock = product.currentStock - totalReserved;

    if (data.quantity > availableStock) {
      throw new AppError(
        `Estoque insuficiente. Disponível: ${availableStock}, Solicitado: ${data.quantity}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    // Validar data de expiração
    if (data.expiresAt) {
      const expirationDate = new Date(data.expiresAt);
      if (expirationDate <= new Date()) {
        throw new AppError('Data de expiração deve ser futura', 400, 'INVALID_EXPIRATION_DATE');
      }
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateReservationDTO) {
    // Verificar se a reserva existe
    const existingReservation = await this.repository.findById(id);
    if (!existingReservation) {
      throw new AppError('Reserva não encontrada', 404, 'RESERVATION_NOT_FOUND');
    }

    // Não permitir atualizar reservas já consumidas ou canceladas
    if (existingReservation.status === 'CONSUMED') {
      throw new AppError('Não é possível atualizar uma reserva já consumida', 400, 'RESERVATION_CONSUMED');
    }

    if (existingReservation.status === 'CANCELLED') {
      throw new AppError('Não é possível atualizar uma reserva cancelada', 400, 'RESERVATION_CANCELLED');
    }

    if (existingReservation.status === 'EXPIRED') {
      throw new AppError('Não é possível atualizar uma reserva expirada', 400, 'RESERVATION_EXPIRED');
    }

    // Se está atualizando a quantidade, validar estoque disponível
    if (data.quantity !== undefined && data.quantity !== existingReservation.quantity) {
      if (data.quantity <= 0) {
        throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
      }

      const product = await this.productsRepository.findById(existingReservation.productId);
      if (!product) {
        throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
      }

      // Calcular estoque disponível considerando a reserva atual
      const totalReserved = await this.repository.getTotalReserved(existingReservation.productId);
      const availableStock = product.currentStock - totalReserved + existingReservation.quantity;

      if (data.quantity > availableStock) {
        throw new AppError(
          `Estoque insuficiente. Disponível: ${availableStock}, Solicitado: ${data.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
    }

    // Validar data de expiração
    if (data.expiresAt) {
      const expirationDate = new Date(data.expiresAt);
      if (expirationDate <= new Date()) {
        throw new AppError('Data de expiração deve ser futura', 400, 'INVALID_EXPIRATION_DATE');
      }
    }

    // Não permitir mudança direta de status para CONSUMED ou CANCELLED
    if (data.status === 'CONSUMED') {
      throw new AppError('Use o endpoint /consume para consumir uma reserva', 400, 'USE_CONSUME_ENDPOINT');
    }

    if (data.status === 'CANCELLED') {
      throw new AppError('Use o endpoint /cancel para cancelar uma reserva', 400, 'USE_CANCEL_ENDPOINT');
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    // Verificar se a reserva existe
    const existingReservation = await this.repository.findById(id);
    if (!existingReservation) {
      throw new AppError('Reserva não encontrada', 404, 'RESERVATION_NOT_FOUND');
    }

    // Só permitir deletar reservas canceladas ou expiradas
    if (existingReservation.status === 'ACTIVE') {
      throw new AppError('Cancele a reserva antes de deletá-la', 400, 'RESERVATION_ACTIVE');
    }

    if (existingReservation.status === 'CONSUMED') {
      throw new AppError('Não é possível deletar uma reserva já consumida', 400, 'RESERVATION_CONSUMED');
    }

    return this.repository.delete(id);
  }

  async consumeReservation(id: string) {
    // Verificar se a reserva existe
    const reservation = await this.repository.findById(id);
    if (!reservation) {
      throw new AppError('Reserva não encontrada', 404, 'RESERVATION_NOT_FOUND');
    }

    // Verificar se a reserva está ativa
    if (reservation.status !== 'ACTIVE') {
      throw new AppError(`Reserva não pode ser consumida. Status atual: ${reservation.status}`, 400, 'RESERVATION_NOT_ACTIVE');
    }

    // Verificar se o produto existe
    const product = await this.productsRepository.findById(reservation.productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Verificar se há estoque suficiente para consumir
    if (product.currentStock < reservation.quantity) {
      throw new AppError(
        `Estoque insuficiente para consumir a reserva. Disponível: ${product.currentStock}, Reservado: ${reservation.quantity}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    // Atualizar o estoque do produto (diminuir)
    await this.productsRepository.update(reservation.productId, {
      currentStock: product.currentStock - reservation.quantity,
    } as any);

    // Marcar reserva como consumida
    return this.repository.update(id, { status: 'CONSUMED' });
  }

  async cancelReservation(id: string) {
    // Verificar se a reserva existe
    const reservation = await this.repository.findById(id);
    if (!reservation) {
      throw new AppError('Reserva não encontrada', 404, 'RESERVATION_NOT_FOUND');
    }

    // Verificar se a reserva está ativa
    if (reservation.status !== 'ACTIVE') {
      throw new AppError(`Reserva não pode ser cancelada. Status atual: ${reservation.status}`, 400, 'RESERVATION_NOT_ACTIVE');
    }

    // Marcar reserva como cancelada
    return this.repository.update(id, { status: 'CANCELLED' });
  }

  async getByProduct(productId: string, activeOnly = true) {
    // Verificar se o produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.repository.getByProduct(productId, activeOnly);
  }

  async getTotalReserved(productId: string) {
    // Verificar se o produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.repository.getTotalReserved(productId);
  }

  async cancelExpired() {
    return this.repository.cancelExpired();
  }
}
