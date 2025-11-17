import { ProductSuppliersRepository } from '../repositories/product-suppliers.repository';
import { ProductsRepository } from '../repositories/products.repository';
import { SuppliersRepository } from '../repositories/suppliers.repository';
import { AppError } from '../utils/errors';
import type { CreateProductSupplierDTO, UpdateProductSupplierDTO } from '@ejr/shared-types';

export class ProductSuppliersService {
  private repository: ProductSuppliersRepository;
  private productsRepository: ProductsRepository;
  private suppliersRepository: SuppliersRepository;

  constructor() {
    this.repository = new ProductSuppliersRepository();
    this.productsRepository = new ProductsRepository();
    this.suppliersRepository = new SuppliersRepository();
  }

  async findByProductId(productId: string) {
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.repository.findByProductId(productId);
  }

  async findBySupplierId(supplierId: string) {
    const supplier = await this.suppliersRepository.findById(supplierId);
    if (!supplier) {
      throw new AppError('Fornecedor não encontrado', 404, 'SUPPLIER_NOT_FOUND');
    }

    return this.repository.findBySupplierId(supplierId);
  }

  async create(productId: string, data: CreateProductSupplierDTO) {
    const product = await this.productsRepository.findById(productId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    const supplier = await this.suppliersRepository.findById(data.supplierId);
    if (!supplier) {
      throw new AppError('Fornecedor não encontrado', 404, 'SUPPLIER_NOT_FOUND');
    }

    const existing = await this.repository.findByProductAndSupplier(productId, data.supplierId);
    if (existing) {
      throw new AppError('Este fornecedor já está vinculado a este produto', 409, 'DUPLICATE_SUPPLIER');
    }

    if (data.unitPrice < 0) {
      throw new AppError('Preço unitário não pode ser negativo', 400, 'INVALID_PRICE');
    }

    if (data.minimumQuantity !== undefined && data.minimumQuantity < 1) {
      throw new AppError('Quantidade mínima deve ser pelo menos 1', 400, 'INVALID_MINIMUM_QUANTITY');
    }

    if (data.leadTimeDays !== undefined && data.leadTimeDays < 0) {
      throw new AppError('Prazo de entrega não pode ser negativo', 400, 'INVALID_LEAD_TIME');
    }

    return this.repository.create(productId, data);
  }

  async update(id: string, data: UpdateProductSupplierDTO) {
    const existingRelation = await this.repository.findById(id);
    if (!existingRelation) {
      throw new AppError('Relacionamento não encontrado', 404, 'RELATION_NOT_FOUND');
    }

    if (data.unitPrice !== undefined && data.unitPrice < 0) {
      throw new AppError('Preço unitário não pode ser negativo', 400, 'INVALID_PRICE');
    }

    if (data.minimumQuantity !== undefined && data.minimumQuantity < 1) {
      throw new AppError('Quantidade mínima deve ser pelo menos 1', 400, 'INVALID_MINIMUM_QUANTITY');
    }

    if (data.leadTimeDays !== undefined && data.leadTimeDays < 0) {
      throw new AppError('Prazo de entrega não pode ser negativo', 400, 'INVALID_LEAD_TIME');
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    const existingRelation = await this.repository.findById(id);
    if (!existingRelation) {
      throw new AppError('Relacionamento não encontrado', 404, 'RELATION_NOT_FOUND');
    }

    return this.repository.delete(id);
  }
}
