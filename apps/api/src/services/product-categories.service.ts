import { ProductCategoriesRepository } from '../repositories/product-categories.repository';
import type { ProductCategory, CreateProductCategoryDTO, UpdateProductCategoryDTO } from '@ejr/shared-types';

export class ProductCategoriesService {
  private repository: ProductCategoriesRepository;

  constructor() {
    this.repository = new ProductCategoriesRepository();
  }

  async getAll(): Promise<ProductCategory[]> {
    return this.repository.findAll();
  }

  async getActive(): Promise<ProductCategory[]> {
    return this.repository.findActive();
  }

  async getById(id: string): Promise<ProductCategory | null> {
    return this.repository.findById(id);
  }

  async create(data: CreateProductCategoryDTO): Promise<ProductCategory> {
    // Check if category already exists
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new Error('Já existe uma categoria com este nome');
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateProductCategoryDTO): Promise<ProductCategory> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new Error('Categoria não encontrada');
    }

    // If changing name, check if new name already exists
    if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await this.repository.findByName(data.name);
      if (existing) {
        throw new Error('Já existe uma categoria com este nome');
      }
    }

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new Error('Categoria não encontrada');
    }

    return this.repository.delete(id);
  }
}
