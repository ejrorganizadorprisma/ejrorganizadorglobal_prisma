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
      throw new AppError('Produto não encontrado', 404);
    }

    return this.repository.findByProductId(productId);
  }

  async addPart(productId: string, partData: AddProductPartDTO) {
    // Verificar se produto principal existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Verificar se peça existe
    const part = await this.productsRepository.findById(partData.partId);
    if (!part) {
      throw new AppError('Peça não encontrada', 404);
    }

    // Não permitir adicionar produto como peça de si mesmo
    if (productId === partData.partId) {
      throw new AppError('Um produto não pode ser peça de si mesmo', 400);
    }

    // Verificar se peça já existe no produto
    const existingPart = await this.repository.findByProductAndPart(productId, partData.partId);
    if (existingPart) {
      throw new AppError('Esta peça já está adicionada a este produto', 409);
    }

    // Validar quantidade
    if (partData.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    return this.repository.addPart(productId, partData);
  }

  async updatePart(productPartId: string, partData: UpdateProductPartDTO) {
    // Verificar se relação existe
    const existingPart = await this.repository.findById(productPartId);
    if (!existingPart) {
      throw new AppError('Peça não encontrada no produto', 404);
    }

    // Validar quantidade se fornecida
    if (partData.quantity !== undefined && partData.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    return this.repository.updatePart(productPartId, partData);
  }

  async removePart(productPartId: string) {
    // Verificar se relação existe
    const existingPart = await this.repository.findById(productPartId);
    if (!existingPart) {
      throw new AppError('Peça não encontrada no produto', 404);
    }

    return this.repository.removePart(productPartId);
  }

  async getBOM(productId: string) {
    // Verificar se produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    return this.repository.getBOM(productId);
  }

  async checkAvailability(productId: string, quantity: number = 1) {
    // Verificar se produto existe
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Validar quantidade
    if (quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    return this.repository.checkAvailability(productId, quantity);
  }
}
