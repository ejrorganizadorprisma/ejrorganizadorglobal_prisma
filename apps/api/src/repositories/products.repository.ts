import { db } from '../config/database';
import type { Product, ProductStatus, CreateProductDTO, UpdateProductDTO, Currency } from '@ejr/shared-types';

export class ProductsRepository {
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

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR factory_code ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de categoria
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    // Filtro de família
    if (family) {
      conditions.push(`family = $${paramIndex}`);
      values.push(family);
      paramIndex++;
    }

    // Filtro de fabricante
    if (manufacturer) {
      conditions.push(`manufacturer ILIKE $${paramIndex}`);
      values.push(`%${manufacturer}%`);
      paramIndex++;
    }

    // Filtro de status
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Filtro de estoque
    if (inStock) {
      conditions.push(`current_stock > 0`);
    }

    // Filtro de tipo de produto
    if (productType) {
      conditions.push(`product_type = $${paramIndex}`);
      values.push(productType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    let orderBy = 'created_at DESC';
    if (sortBy === 'stock_urgency') {
      // Urgência: estoque zerado primeiro, depois abaixo do mínimo, depois por nome
      orderBy = 'CASE WHEN current_stock <= 0 THEN 0 WHEN current_stock <= minimum_stock THEN 1 ELSE 2 END ASC, current_stock ASC, name ASC';
    } else if (sortBy === 'name') {
      orderBy = 'name ASC';
    }

    const query = `
      SELECT *
      FROM products
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, values);

    // Converte snake_case para camelCase
    const mapped = result.rows.map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      family: product.family,
      description: product.description,
      status: product.status,
      manufacturer: product.manufacturer,
      productType: product.product_type,
      version: product.version,
      warehouseLocation: product.warehouse_location,
      leadTimeDays: product.lead_time_days,
      minimumLotQuantity: product.minimum_lot_quantity,
      technicalDescription: product.technical_description,
      commercialDescription: product.commercial_description,
      warrantyMonths: product.warranty_months,
      currentStock: product.current_stock,
      minimumStock: product.minimum_stock,
      costPrice: product.cost_price,
      costPriceCurrency: product.cost_price_currency as Currency,
      salePrice: product.sale_price,
      salePriceCurrency: product.sale_price_currency as Currency,
      wholesalePrice: product.wholesale_price,
      wholesalePriceCurrency: product.wholesale_price_currency as Currency,
      imageUrls: product.image_urls || [],
      isAssembly: product.is_assembly,
      isPart: product.is_part,
      assemblyCost: product.assembly_cost,
      unit: product.unit,
      factoryCode: product.factory_code,
      warrantyExpirationDate: product.warranty_expiration_date,
      observations: product.observations,
      quantityPerBox: product.quantity_per_box ?? 1,
      spaceId: product.space_id,
      shelfId: product.shelf_id,
      sectionId: product.section_id,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));

    return mapped;
  }

  async count(params: {
    search?: string;
    category?: string;
    family?: string;
    manufacturer?: string;
    status?: ProductStatus;
    inStock?: boolean;
    productType?: 'FINAL' | 'COMPONENT';
  }) {
    const { search, category, family, manufacturer, status, inStock, productType } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR factory_code ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de categoria
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    // Filtro de família
    if (family) {
      conditions.push(`family = $${paramIndex}`);
      values.push(family);
      paramIndex++;
    }

    // Filtro de fabricante
    if (manufacturer) {
      conditions.push(`manufacturer ILIKE $${paramIndex}`);
      values.push(`%${manufacturer}%`);
      paramIndex++;
    }

    // Filtro de status
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Filtro de estoque
    if (inStock) {
      conditions.push(`current_stock > 0`);
    }

    // Filtro de tipo de produto
    if (productType) {
      conditions.push(`product_type = $${paramIndex}`);
      values.push(productType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT COUNT(*) as count
      FROM products
      ${whereClause}
    `;

    try {
      const result = await db.query(query, values);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Database count error:', error);
      // Retorna 0 em caso de erro para não quebrar a listagem
      return 0;
    }
  }

  async findById(id: string) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null; // Não encontrado
    }

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
      family: data.family,
      description: data.description,
      status: data.status,
      manufacturer: data.manufacturer,
      productType: data.product_type,
      version: data.version,
      warehouseLocation: data.warehouse_location,
      leadTimeDays: data.lead_time_days,
      minimumLotQuantity: data.minimum_lot_quantity,
      technicalDescription: data.technical_description,
      commercialDescription: data.commercial_description,
      warrantyMonths: data.warranty_months,
      currentStock: data.current_stock,
      minimumStock: data.minimum_stock,
      costPrice: data.cost_price,
      costPriceCurrency: data.cost_price_currency as Currency,
      salePrice: data.sale_price,
      salePriceCurrency: data.sale_price_currency as Currency,
      wholesalePrice: data.wholesale_price,
      wholesalePriceCurrency: data.wholesale_price_currency as Currency,
      imageUrls: data.image_urls || [],
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      unit: data.unit,
      spaceId: data.space_id,
      shelfId: data.shelf_id,
      factoryCode: data.factory_code,
      warrantyExpirationDate: data.warranty_expiration_date,
      observations: data.observations,
      quantityPerBox: data.quantity_per_box ?? 1,
      sectionId: data.section_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findByCode(code: string) {
    const query = 'SELECT * FROM products WHERE code = $1';
    const result = await db.query(query, [code]);

    if (result.rows.length === 0) {
      return null; // Não encontrado
    }

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
      family: data.family,
      description: data.description,
      status: data.status,
      manufacturer: data.manufacturer,
      productType: data.product_type,
      version: data.version,
      warehouseLocation: data.warehouse_location,
      leadTimeDays: data.lead_time_days,
      minimumLotQuantity: data.minimum_lot_quantity,
      technicalDescription: data.technical_description,
      commercialDescription: data.commercial_description,
      warrantyMonths: data.warranty_months,
      currentStock: data.current_stock,
      minimumStock: data.minimum_stock,
      costPrice: data.cost_price,
      costPriceCurrency: data.cost_price_currency as Currency,
      salePrice: data.sale_price,
      salePriceCurrency: data.sale_price_currency as Currency,
      wholesalePrice: data.wholesale_price,
      wholesalePriceCurrency: data.wholesale_price_currency as Currency,
      imageUrls: data.image_urls || [],
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      unit: data.unit,
      spaceId: data.space_id,
      shelfId: data.shelf_id,
      factoryCode: data.factory_code,
      warrantyExpirationDate: data.warranty_expiration_date,
      observations: data.observations,
      quantityPerBox: data.quantity_per_box ?? 1,
      sectionId: data.section_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Generate next sequential code for product
  private async generateProductCode(): Promise<string> {
    // Get all product codes to find the highest number
    const query = 'SELECT code FROM products';

    try {
      const result = await db.query(query);

      if (result.rows.length === 0) {
        // First product
        return 'PROD-0001';
      }

      // Extract all numbers from codes and find the maximum
      let maxNumber = 0;
      for (const product of result.rows) {
        const match = product.code.match(/PROD-(\d+)/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }

      // Generate next code
      const nextNumber = maxNumber + 1;
      return `PROD-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error fetching product codes:', error);
      // If error, start from 1
      return 'PROD-0001';
    }
  }

  async create(productData: CreateProductDTO) {
    // Generate a unique ID for the product
    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Auto-generate code
    const code = await this.generateProductCode();

    const query = `
      INSERT INTO products (
        id, code, name, category, family, manufacturer, status, product_type,
        technical_description, commercial_description, warranty_months,
        current_stock, minimum_stock, cost_price, cost_price_currency, sale_price, sale_price_currency,
        wholesale_price, wholesale_price_currency, image_urls,
        is_assembly, is_part, assembly_cost, unit,
        factory_code, warranty_expiration_date, observations, quantity_per_box,
        space_id, shelf_id, section_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      RETURNING *
    `;

    const values = [
      id,
      code,
      productData.name,
      productData.category,
      productData.family || null,
      productData.manufacturer,
      productData.status,
      (productData as any).productType || 'COMPONENT',
      productData.technicalDescription,
      productData.commercialDescription,
      productData.warrantyMonths || 0,
      0, // current_stock
      productData.minimumStock,
      productData.costPrice,
      (productData as any).costPriceCurrency || 'BRL',
      productData.salePrice,
      (productData as any).salePriceCurrency || 'BRL',
      productData.wholesalePrice || 0,
      (productData as any).wholesalePriceCurrency || 'BRL',
      (productData as any).imageUrls || [],
      productData.isAssembly || false,
      productData.isPart || false,
      productData.assemblyCost || 0,
      (productData as any).unit || 'UNIT',
      (productData as any).factoryCode || null,
      (productData as any).warrantyExpirationDate || null,
      (productData as any).observations || null,
      (productData as any).quantityPerBox || 1,
      (productData as any).spaceId || null,
      (productData as any).shelfId || null,
      (productData as any).sectionId || null,
    ];

    try {
      const result = await db.query(query, values);
      const data = result.rows[0];

      // Converte snake_case para camelCase
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        category: data.category,
        family: data.family,
        description: data.description,
        status: data.status,
        manufacturer: data.manufacturer,
        productType: data.product_type,
        version: data.version,
        warehouseLocation: data.warehouse_location,
        leadTimeDays: data.lead_time_days,
        minimumLotQuantity: data.minimum_lot_quantity,
        technicalDescription: data.technical_description,
        commercialDescription: data.commercial_description,
        warrantyMonths: data.warranty_months,
        currentStock: data.current_stock,
        minimumStock: data.minimum_stock,
        costPrice: data.cost_price,
        costPriceCurrency: data.cost_price_currency as Currency,
        salePrice: data.sale_price,
        salePriceCurrency: data.sale_price_currency as Currency,
        wholesalePrice: data.wholesale_price,
        wholesalePriceCurrency: data.wholesale_price_currency as Currency,
        imageUrls: data.image_urls || [],
        isAssembly: data.is_assembly,
        isPart: data.is_part,
        assemblyCost: data.assembly_cost,
        unit: data.unit,
        factoryCode: data.factory_code,
        warrantyExpirationDate: data.warranty_expiration_date,
        observations: data.observations,
        quantityPerBox: data.quantity_per_box ?? 1,
        spaceId: data.space_id,
        shelfId: data.shelf_id,
        sectionId: data.section_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      console.error('Database error creating product:', JSON.stringify(error, null, 2));
      throw new Error(`Erro ao criar produto: ${error.message}`);
    }
  }

  async update(id: string, productData: UpdateProductDTO) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Do not allow code to be updated - it's auto-generated
    if (productData.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(productData.name);
    }
    if (productData.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(productData.category);
    }
    if (productData.family !== undefined) {
      setClauses.push(`family = $${paramIndex++}`);
      values.push(productData.family || null);
    }
    if (productData.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(productData.status);
    }
    if ((productData as any).productType !== undefined) {
      setClauses.push(`product_type = $${paramIndex++}`);
      values.push((productData as any).productType);
    }
    if ((productData as any).version !== undefined) {
      setClauses.push(`version = $${paramIndex++}`);
      values.push((productData as any).version);
    }
    if ((productData as any).warehouseLocation !== undefined) {
      setClauses.push(`warehouse_location = $${paramIndex++}`);
      values.push((productData as any).warehouseLocation);
    }
    if ((productData as any).leadTimeDays !== undefined) {
      setClauses.push(`lead_time_days = $${paramIndex++}`);
      values.push((productData as any).leadTimeDays);
    }
    if ((productData as any).minimumLotQuantity !== undefined) {
      setClauses.push(`minimum_lot_quantity = $${paramIndex++}`);
      values.push((productData as any).minimumLotQuantity);
    }
    if ((productData as any).technicalDescription !== undefined) {
      setClauses.push(`technical_description = $${paramIndex++}`);
      values.push((productData as any).technicalDescription);
    }
    if ((productData as any).commercialDescription !== undefined) {
      setClauses.push(`commercial_description = $${paramIndex++}`);
      values.push((productData as any).commercialDescription);
    }
    if ((productData as any).manufacturer !== undefined) {
      setClauses.push(`manufacturer = $${paramIndex++}`);
      values.push((productData as any).manufacturer);
    }
    if ((productData as any).warrantyMonths !== undefined) {
      setClauses.push(`warranty_months = $${paramIndex++}`);
      values.push((productData as any).warrantyMonths);
    }
    if (productData.minimumStock !== undefined) {
      setClauses.push(`minimum_stock = $${paramIndex++}`);
      values.push(productData.minimumStock);
    }
    if (productData.costPrice !== undefined) {
      setClauses.push(`cost_price = $${paramIndex++}`);
      values.push(productData.costPrice);
    }
    if ((productData as any).costPriceCurrency !== undefined) {
      setClauses.push(`cost_price_currency = $${paramIndex++}`);
      values.push((productData as any).costPriceCurrency);
    }
    if (productData.salePrice !== undefined) {
      setClauses.push(`sale_price = $${paramIndex++}`);
      values.push(productData.salePrice);
    }
    if ((productData as any).salePriceCurrency !== undefined) {
      setClauses.push(`sale_price_currency = $${paramIndex++}`);
      values.push((productData as any).salePriceCurrency);
    }
    if (productData.wholesalePrice !== undefined) {
      setClauses.push(`wholesale_price = $${paramIndex++}`);
      values.push(productData.wholesalePrice);
    }
    if ((productData as any).wholesalePriceCurrency !== undefined) {
      setClauses.push(`wholesale_price_currency = $${paramIndex++}`);
      values.push((productData as any).wholesalePriceCurrency);
    }
    if ((productData as any).imageUrls !== undefined) {
      setClauses.push(`image_urls = $${paramIndex++}`);
      values.push((productData as any).imageUrls);
    }
    if (productData.isAssembly !== undefined) {
      setClauses.push(`is_assembly = $${paramIndex++}`);
      values.push(productData.isAssembly);
    }
    if (productData.isPart !== undefined) {
      setClauses.push(`is_part = $${paramIndex++}`);
      values.push(productData.isPart);
    }
    if (productData.assemblyCost !== undefined) {
      setClauses.push(`assembly_cost = $${paramIndex++}`);
      values.push(productData.assemblyCost);
    }
    if ((productData as any).unit !== undefined) {
      setClauses.push(`unit = $${paramIndex++}`);
      values.push((productData as any).unit);
    }
    if ((productData as any).spaceId !== undefined) {
      setClauses.push(`space_id = $${paramIndex++}`);
      values.push((productData as any).spaceId || null);
    }
    if ((productData as any).shelfId !== undefined) {
      setClauses.push(`shelf_id = $${paramIndex++}`);
      values.push((productData as any).shelfId || null);
    }
    if ((productData as any).sectionId !== undefined) {
      setClauses.push(`section_id = $${paramIndex++}`);
      values.push((productData as any).sectionId || null);
    }
    if ((productData as any).factoryCode !== undefined) {
      setClauses.push(`factory_code = $${paramIndex++}`);
      values.push((productData as any).factoryCode || null);
    }
    if ((productData as any).warrantyExpirationDate !== undefined) {
      setClauses.push(`warranty_expiration_date = $${paramIndex++}`);
      values.push((productData as any).warrantyExpirationDate || null);
    }
    if ((productData as any).observations !== undefined) {
      setClauses.push(`observations = $${paramIndex++}`);
      values.push((productData as any).observations || null);
    }
    if ((productData as any).quantityPerBox !== undefined) {
      setClauses.push(`quantity_per_box = $${paramIndex++}`);
      values.push((productData as any).quantityPerBox || 1);
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);

    const query = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Produto não encontrado`);
    }

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
      family: data.family,
      description: data.description,
      status: data.status,
      manufacturer: data.manufacturer,
      productType: data.product_type,
      version: data.version,
      warehouseLocation: data.warehouse_location,
      leadTimeDays: data.lead_time_days,
      minimumLotQuantity: data.minimum_lot_quantity,
      technicalDescription: data.technical_description,
      commercialDescription: data.commercial_description,
      warrantyMonths: data.warranty_months,
      currentStock: data.current_stock,
      minimumStock: data.minimum_stock,
      costPrice: data.cost_price,
      costPriceCurrency: data.cost_price_currency as Currency,
      salePrice: data.sale_price,
      salePriceCurrency: data.sale_price_currency as Currency,
      wholesalePrice: data.wholesale_price,
      wholesalePriceCurrency: data.wholesale_price_currency as Currency,
      imageUrls: data.image_urls || [],
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      unit: data.unit,
      spaceId: data.space_id,
      shelfId: data.shelf_id,
      factoryCode: data.factory_code,
      warrantyExpirationDate: data.warranty_expiration_date,
      observations: data.observations,
      quantityPerBox: data.quantity_per_box ?? 1,
      sectionId: data.section_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string) {
    const query = 'DELETE FROM products WHERE id = $1';

    try {
      await db.query(query, [id]);
      return { success: true };
    } catch (error: any) {
      // Detectar erro de constraint de chave estrangeira
      if (error.message.includes('violates foreign key constraint') || error.code === '23503') {
        if (error.message.includes('quote_items')) {
          throw new Error('Não é possível excluir este produto pois ele está sendo usado em orçamentos. Exclua os orçamentos relacionados primeiro.');
        }
        if (error.message.includes('production_orders')) {
          throw new Error('Não é possível excluir este produto pois ele está sendo usado em ordens de produção. Exclua as ordens relacionadas primeiro.');
        }
        if (error.message.includes('inventory_movements')) {
          throw new Error('Não é possível excluir este produto pois ele possui movimentações de estoque registradas.');
        }
        throw new Error('Não é possível excluir este produto pois ele está sendo usado em outros registros do sistema.');
      }
      throw new Error(`Erro ao deletar produto: ${error.message}`);
    }
  }

  async getCategories() {
    const query = `
      SELECT DISTINCT category
      FROM products
      WHERE category IS NOT NULL
      ORDER BY category ASC
    `;

    const result = await db.query(query);
    return result.rows.map(row => row.category);
  }

  async getManufacturers() {
    const query = `
      SELECT DISTINCT manufacturer
      FROM products
      WHERE manufacturer IS NOT NULL AND manufacturer <> ''
      ORDER BY manufacturer ASC
    `;

    const result = await db.query(query);
    return result.rows.map(row => row.manufacturer);
  }

  async getLowStock() {
    const query = `
      SELECT *
      FROM products
      WHERE status = 'ACTIVE' AND current_stock <= minimum_stock
      ORDER BY current_stock ASC
    `;

    const result = await db.query(query);

    // Converte snake_case para camelCase
    return result.rows.map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      family: product.family,
      description: product.description,
      status: product.status,
      manufacturer: product.manufacturer,
      productType: product.product_type,
      version: product.version,
      warehouseLocation: product.warehouse_location,
      leadTimeDays: product.lead_time_days,
      minimumLotQuantity: product.minimum_lot_quantity,
      technicalDescription: product.technical_description,
      commercialDescription: product.commercial_description,
      warrantyMonths: product.warranty_months,
      currentStock: product.current_stock,
      minimumStock: product.minimum_stock,
      costPrice: product.cost_price,
      costPriceCurrency: product.cost_price_currency as Currency,
      salePrice: product.sale_price,
      salePriceCurrency: product.sale_price_currency as Currency,
      wholesalePrice: product.wholesale_price,
      wholesalePriceCurrency: product.wholesale_price_currency as Currency,
      imageUrls: product.image_urls || [],
      isAssembly: product.is_assembly,
      isPart: product.is_part,
      assemblyCost: product.assembly_cost,
      unit: product.unit,
      spaceId: product.space_id,
      shelfId: product.shelf_id,
      factoryCode: product.factory_code,
      warrantyExpirationDate: product.warranty_expiration_date,
      observations: product.observations,
      quantityPerBox: product.quantity_per_box ?? 1,
      sectionId: product.section_id,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));
  }

  // Novos métodos para tipos de produtos
  async findByType(type: 'FINAL' | 'COMPONENT') {
    const query = `
      SELECT *
      FROM products
      WHERE product_type = $1
      ORDER BY name ASC
    `;

    const result = await db.query(query, [type]);

    // Converte snake_case para camelCase
    return result.rows.map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      family: product.family,
      description: product.description,
      status: product.status,
      manufacturer: product.manufacturer,
      productType: product.product_type,
      version: product.version,
      warehouseLocation: product.warehouse_location,
      leadTimeDays: product.lead_time_days,
      minimumLotQuantity: product.minimum_lot_quantity,
      technicalDescription: product.technical_description,
      commercialDescription: product.commercial_description,
      warrantyMonths: product.warranty_months,
      currentStock: product.current_stock,
      minimumStock: product.minimum_stock,
      costPrice: product.cost_price,
      costPriceCurrency: product.cost_price_currency as Currency,
      salePrice: product.sale_price,
      salePriceCurrency: product.sale_price_currency as Currency,
      wholesalePrice: product.wholesale_price,
      wholesalePriceCurrency: product.wholesale_price_currency as Currency,
      imageUrls: product.image_urls || [],
      isAssembly: product.is_assembly,
      isPart: product.is_part,
      assemblyCost: product.assembly_cost,
      unit: product.unit,
      spaceId: product.space_id,
      shelfId: product.shelf_id,
      factoryCode: product.factory_code,
      warrantyExpirationDate: product.warranty_expiration_date,
      observations: product.observations,
      quantityPerBox: product.quantity_per_box ?? 1,
      sectionId: product.section_id,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));
  }

  async findComponents() {
    return this.findByType('COMPONENT');
  }

  async findFinalProducts() {
    return this.findByType('FINAL');
  }
}
