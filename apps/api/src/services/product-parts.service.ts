import { ProductPartsRepository } from '../repositories/product-parts.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { AppError } from '../utils/errors';
import type { AddProductPartDTO, UpdateProductPartDTO } from '@ejr/shared-types';

export class ProductPartsService {
  private repository: ProductPartsRepository;
  private productsRepository: ProductsRepository;

  constructor() {
    this.repository = new ProductPartsRepository();
    this.productsRepository = new ProductsRepository();
  }

  async findByProductId(productId: string) {
    // Verificar se produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.repository.findByProductId(productId);
  }

  async addPart(productId: string, partData: AddProductPartDTO) {
    // Verificar se produto principal existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Verificar se peça existe
    const part = await this.productsRepository.findById(partData.partId);
    if (!part) {
      throw new AppError('Peça não encontrada', 404, 'PART_NOT_FOUND');
    }

    // Não permitir adicionar produto como peça de si mesmo
    if (productId === partData.partId) {
      throw new AppError('Um produto não pode ser peça de si mesmo', 400, 'SELF_REFERENCE_NOT_ALLOWED');
    }

    // Verificar se peça já existe no produto
    const existingPart = await this.repository.findByProductAndPart(productId, partData.partId);
    if (existingPart) {
      throw new AppError('Esta peça já está adicionada a este produto', 409, 'DUPLICATE_PART');
    }

    // Validar quantidade
    if (partData.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }

    return this.repository.addPart(productId, partData);
  }

  async updatePart(productPartId: string, partData: UpdateProductPartDTO) {
    // Verificar se relação existe
    const existingPart = await this.repository.findById(productPartId);
    if (!existingPart) {
      throw new AppError('Peça não encontrada no produto', 404, 'PRODUCT_PART_NOT_FOUND');
    }

    // Validar quantidade se fornecida
    if (partData.quantity !== undefined && partData.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }

    return this.repository.updatePart(productPartId, partData);
  }

  async removePart(productPartId: string) {
    // Verificar se relação existe
    const existingPart = await this.repository.findById(productPartId);
    if (!existingPart) {
      throw new AppError('Peça não encontrada no produto', 404, 'PRODUCT_PART_NOT_FOUND');
    }

    return this.repository.removePart(productPartId);
  }

  async getBOM(productId: string) {
    // Verificar se produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.repository.getBOM(productId);
  }

  async checkAvailability(productId: string, quantity: number = 1) {
    // Verificar se produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Validar quantidade
    if (quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }

    return this.repository.checkAvailability(productId, quantity);
  }
}
