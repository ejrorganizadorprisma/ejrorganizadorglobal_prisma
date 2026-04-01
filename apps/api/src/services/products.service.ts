import { ProductsRepository } from '../repositories/products.repository';
import { AppError } from '../utils/errors';
import type { CreateProductDTO, UpdateProductDTO, ProductStatus } from '@ejr/shared-types';
import { db } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

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
    family?: string;
    manufacturer?: string;
    status?: ProductStatus;
    inStock?: boolean;
    productType?: 'FINAL' | 'COMPONENT';
    sortBy?: string;
  }) {
    const { page, limit, search, category, family, manufacturer, status, inStock, productType, sortBy } = params;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError('Parâmetros de paginação inválidos', 400, 'INVALID_PAGINATION');
    }

    const [products, total] = await Promise.all([
      this.repository.findMany({ page, limit, search, category, family, manufacturer, status, inStock, productType, sortBy }),
      this.repository.count({ search, category, family, manufacturer, status, inStock, productType }),
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

  async getManufacturers() {
    return this.repository.getManufacturers();
  }

  async getLowStock() {
    return this.repository.getLowStock();
  }

  async updateStock(
    id: string,
    quantity: number,
    operation: 'add' | 'subtract',
    userId?: string,
    reason?: string
  ) {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    const signedQty = operation === 'add' ? quantity : -quantity;

    // Use the centralized update_product_stock() function
    // Atomically: updates stock + inserts inventory_movements + creates low stock notification
    try {
      await db.query(
        `SELECT update_product_stock($1, $2, $3, $4, $5, $6, $7)`,
        [id, signedQty, userId || null, 'ADJUSTMENT', reason || 'Ajuste manual', null, 'MANUAL_ADJUSTMENT']
      );
    } catch (error: any) {
      if (error.message?.includes('Insufficient stock')) {
        throw new AppError('Estoque insuficiente', 400, 'INSUFFICIENT_STOCK');
      }
      throw error;
    }

    // Retorna o produto atualizado
    return this.repository.findById(id);
  }

  async getStockAdjustmentHistory(productId: string) {
    const query = `
      SELECT
        sah.id,
        sah.product_id,
        sah.user_id,
        sah.old_stock,
        sah.new_stock,
        sah.quantity_changed,
        sah.operation,
        sah.reason,
        sah.created_at,
        u.name as user_name,
        u.email as user_email
      FROM stock_adjustment_history sah
      LEFT JOIN users u ON sah.user_id = u.id
      WHERE sah.product_id = $1
      ORDER BY sah.created_at DESC
    `;
    const result = await db.query(query, [productId]);

    return result.rows.map((item) => ({
      id: item.id,
      productId: item.product_id,
      userId: item.user_id,
      userName: item.user_name || 'Desconhecido',
      userEmail: item.user_email,
      oldStock: item.old_stock,
      newStock: item.new_stock,
      quantityChanged: item.quantity_changed,
      operation: item.operation,
      reason: item.reason,
      createdAt: item.created_at,
    }));
  }

  // Novos métodos para tipos de produtos
  async getComponents() {
    return this.repository.findComponents();
  }

  async getFinalProducts() {
    return this.repository.findFinalProducts();
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    // Criar pasta de uploads se não existir
    const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = path.extname(file.originalname);
    const filename = `product-${timestamp}-${randomString}${extension}`;

    // Salvar arquivo
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // Retornar URL relativa
    const fileUrl = `/uploads/products/${filename}`;
    return fileUrl;
  }

  // Métodos para gerenciar BOM (Bill of Materials)
  async getProductParts(productId: string) {
    // Buscar peças do produto com informações completas
    const query = `
      SELECT
        pp.*,
        p.id as part_id,
        p.code as part_code,
        p.name as part_name,
        p.current_stock as part_current_stock,
        p.min_stock as part_min_stock,
        p.cost_price as part_cost_price
      FROM product_parts pp
      LEFT JOIN products p ON pp.part_id = p.id
      WHERE pp.product_id = $1
      ORDER BY pp.created_at ASC
    `;
    const result = await db.query(query, [productId]);

    return result.rows.map((row) => ({
      ...row,
      part: {
        id: row.part_id,
        code: row.part_code,
        name: row.part_name,
        current_stock: row.part_current_stock,
        min_stock: row.part_min_stock,
        cost_price: row.part_cost_price,
      },
    }));
  }

  async getProductBOM(productId: string) {
    // Buscar itens do BOM com informações dos produtos
    const query = `
      SELECT
        pp.part_id,
        pp.quantity,
        pp.is_optional,
        p.code as part_code,
        p.name as part_name,
        p.current_stock as part_current_stock,
        p.cost_price as part_cost_price
      FROM product_parts pp
      LEFT JOIN products p ON pp.part_id = p.id
      WHERE pp.product_id = $1
      ORDER BY pp.created_at ASC
    `;
    const result = await db.query(query, [productId]);

    if (result.rows.length === 0) {
      return [];
    }

    // Calcular custos e formatar resposta
    return result.rows.map((item) => ({
      partId: item.part_id,
      partCode: item.part_code || '',
      partName: item.part_name || '',
      quantity: item.quantity,
      isOptional: item.is_optional || false,
      unitCost: item.part_cost_price || 0,
      totalCost: (item.part_cost_price || 0) * item.quantity,
      availableStock: item.part_current_stock || 0,
    }));
  }

  async addProductPart(productId: string, data: { partId: string; quantity: number; isOptional?: boolean }) {
    // Verificar se o produto existe
    await this.findById(productId);

    // Verificar se a peça existe
    await this.findById(data.partId);

    // Verificar se a relação já existe
    const checkQuery = `
      SELECT * FROM product_parts
      WHERE product_id = $1 AND part_id = $2
    `;
    const checkResult = await db.query(checkQuery, [productId, data.partId]);

    if (checkResult.rows.length > 0) {
      throw new AppError('Esta peça já está adicionada ao BOM', 400, 'PART_ALREADY_EXISTS');
    }

    // Gerar ID único para a relação
    const id = `pp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Inserir nova peça no BOM
    const insertQuery = `
      INSERT INTO product_parts (id, product_id, part_id, quantity, is_optional)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const insertResult = await db.query(insertQuery, [
      id,
      productId,
      data.partId,
      data.quantity,
      data.isOptional || false,
    ]);

    return insertResult.rows[0];
  }

  async removeProductPart(productId: string, partId: string) {
    const query = `
      DELETE FROM product_parts
      WHERE product_id = $1 AND part_id = $2
    `;
    await db.query(query, [productId, partId]);
  }
}
