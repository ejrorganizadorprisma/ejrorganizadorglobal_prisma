import { ProductsRepository } from '../repositories/products.repository';
import { AppError } from '../utils/errors';
import type { CreateProductDTO, UpdateProductDTO, ProductStatus } from '@ejr/shared-types';
import { supabase } from '../config/supabase';

export class ProductsService {
  private repository: ProductsRepository;

  constructor() {
    this.repository = new ProductsRepository();
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    status?: ProductStatus;
    inStock?: boolean;
  }) {
    const { page, limit, search, category, status, inStock } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const [products, total] = await Promise.all([
      this.repository.findMany({ page, limit, search, category, status, inStock }),
      this.repository.count({ search, category, status, inStock }),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return product;
  }

  async findByCode(code: string) {
    const product = await this.repository.findByCode(code);

    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return product;
  }

  async create(data: CreateProductDTO) {
    // Verificar se já existe produto com o mesmo código
    const existingProduct = await this.repository.findByCode(data.code);
    if (existingProduct) {
      throw new AppError('Já existe um produto com este código', 409, 'DUPLICATE_CODE');
    }

    // Validar preços
    if (data.costPrice < 0 || data.salePrice < 0) {
      throw new AppError('Preços não podem ser negativos', 400, 'INVALID_PRICE');
    }

    if (data.salePrice < data.costPrice) {
      throw new AppError('Preço de venda não pode ser menor que o preço de custo', 400, 'INVALID_PRICE');
    }

    // Validar estoque mínimo
    if (data.minimumStock && data.minimumStock < 0) {
      throw new AppError('Estoque mínimo não pode ser negativo', 400, 'INVALID_STOCK');
    }

    return this.repository.create(data);
  }

  async update(id: string, data: UpdateProductDTO) {
    // Verificar se produto existe
    const existingProduct = await this.repository.findById(id);
    if (!existingProduct) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Se código foi alterado, verificar se já existe outro produto com o novo código
    if (data.code && data.code !== existingProduct.code) {
      const productWithCode = await this.repository.findByCode(data.code);
      if (productWithCode) {
        throw new AppError('Já existe um produto com este código', 409, 'DUPLICATE_CODE');
      }
    }

    // Validar preços se fornecidos
    const costPrice = data.costPrice ?? existingProduct.costPrice;
    const salePrice = data.salePrice ?? existingProduct.salePrice;

    if (costPrice < 0 || salePrice < 0) {
      throw new AppError('Preços não podem ser negativos', 400, 'INVALID_PRICE');
    }

    if (salePrice < costPrice) {
      throw new AppError('Preço de venda não pode ser menor que o preço de custo', 400, 'INVALID_PRICE');
    }

    // Validar estoque mínimo
    if (data.minimumStock !== undefined && data.minimumStock < 0) {
      throw new AppError('Estoque mínimo não pode ser negativo', 400, 'INVALID_STOCK');
    }

    return this.repository.update(id, data);
  }

  async delete(id: string) {
    // Verificar se produto existe
    const existingProduct = await this.repository.findById(id);
    if (!existingProduct) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // TODO: Verificar se produto está sendo usado em orçamentos/pedidos ativos
    // Por enquanto, permitir exclusão

    return this.repository.delete(id);
  }

  async getCategories() {
    return this.repository.getCategories();
  }

  async getLowStock() {
    return this.repository.getLowStock();
  }

  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract') {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    let newStock: number;
    if (operation === 'add') {
      newStock = product.currentStock + quantity;
    } else {
      newStock = product.currentStock - quantity;
      if (newStock < 0) {
        throw new AppError('Estoque insuficiente', 400, 'INSUFFICIENT_STOCK');
      }
    }

    return this.repository.update(id, { currentStock: newStock });
  }

  // Novos métodos para tipos de produtos
  async getComponents() {
    return this.repository.findComponents();
  }

  async getFinalProducts() {
    return this.repository.findFinalProducts();
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;

    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new AppError(`Erro ao fazer upload da imagem: ${error.message}`, 500);
    }

    // Retornar URL pública da imagem
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }
}
