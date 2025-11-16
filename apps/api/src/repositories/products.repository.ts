import { supabase } from '../config/supabase';
import type { Product, ProductStatus, CreateProductDTO, UpdateProductDTO } from '@ejr/shared-types';

export class ProductsRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    status?: ProductStatus;
    inStock?: boolean;
  }) {
    const { page, limit, search, category, status, inStock } = params;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Filtro de busca
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,category.ilike.%${search}%`);
    }

    // Filtro de categoria
    if (category) {
      query = query.eq('category', category);
    }

    // Filtro de status
    if (status) {
      query = query.eq('status', status);
    }

    // Filtro de estoque
    if (inStock) {
      query = query.gt('current_stock', 0);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
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
      salePrice: product.sale_price,
      isAssembly: product.is_assembly,
      isPart: product.is_part,
      assemblyCost: product.assembly_cost,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));
  }

  async count(params: {
    search?: string;
    category?: string;
    status?: ProductStatus;
    inStock?: boolean;
  }) {
    const { search, category, status, inStock } = params;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Filtro de busca
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,category.ilike.%${search}%`);
    }

    // Filtro de categoria
    if (category) {
      query = query.eq('category', category);
    }

    // Filtro de status
    if (status) {
      query = query.eq('status', status);
    }

    // Filtro de estoque
    if (inStock) {
      query = query.gt('current_stock', 0);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Supabase count error:', error);
      // Retorna 0 em caso de erro para não quebrar a listagem
      return 0;
    }

    return count || 0;
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
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
      salePrice: data.sale_price,
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findByCode(code: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
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
      salePrice: data.sale_price,
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async create(productData: CreateProductDTO) {
    // Generate a unique ID for the product
    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { data, error} = await supabase
      .from('products')
      .insert({
        id,
        code: productData.code,
        name: productData.name,
        category: productData.category,
        manufacturer: productData.manufacturer,
        status: productData.status,
        technical_description: productData.technicalDescription,
        commercial_description: productData.commercialDescription,
        warranty_months: productData.warrantyMonths || 0,
        current_stock: 0,
        minimum_stock: productData.minimumStock,
        cost_price: productData.costPrice,
        sale_price: productData.salePrice,
        is_assembly: productData.isAssembly || false,
        is_part: productData.isPart || false,
        assembly_cost: productData.assemblyCost || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating product:', JSON.stringify(error, null, 2));
      throw new Error(`Erro ao criar produto: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
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
      salePrice: data.sale_price,
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, productData: UpdateProductDTO) {
    const updateData: any = {};

    if (productData.code !== undefined) updateData.code = productData.code;
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.category !== undefined) updateData.category = productData.category;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.status !== undefined) updateData.status = productData.status;
    if ((productData as any).productType !== undefined) updateData.product_type = (productData as any).productType;
    if ((productData as any).version !== undefined) updateData.version = (productData as any).version;
    if ((productData as any).warehouseLocation !== undefined) updateData.warehouse_location = (productData as any).warehouseLocation;
    if ((productData as any).leadTimeDays !== undefined) updateData.lead_time_days = (productData as any).leadTimeDays;
    if ((productData as any).minimumLotQuantity !== undefined) updateData.minimum_lot_quantity = (productData as any).minimumLotQuantity;
    if ((productData as any).technicalDescription !== undefined) updateData.technical_description = (productData as any).technicalDescription;
    if ((productData as any).commercialDescription !== undefined) updateData.commercial_description = (productData as any).commercialDescription;
    if ((productData as any).manufacturer !== undefined) updateData.manufacturer = (productData as any).manufacturer;
    if ((productData as any).warrantyMonths !== undefined) updateData.warranty_months = (productData as any).warrantyMonths;
    if (productData.minimumStock !== undefined) updateData.minimum_stock = productData.minimumStock;
    if (productData.costPrice !== undefined) updateData.cost_price = productData.costPrice;
    if (productData.salePrice !== undefined) updateData.sale_price = productData.salePrice;
    if (productData.isAssembly !== undefined) updateData.is_assembly = productData.isAssembly;
    if (productData.isPart !== undefined) updateData.is_part = productData.isPart;
    if (productData.assemblyCost !== undefined) updateData.assembly_cost = productData.assemblyCost;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar produto: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      category: data.category,
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
      salePrice: data.sale_price,
      isAssembly: data.is_assembly,
      isPart: data.is_part,
      assemblyCost: data.assembly_cost,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar produto: ${error.message}`);
    }

    return { success: true };
  }

  async getCategories() {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar categorias: ${error.message}`);
    }

    // Remove duplicatas
    const categories = [...new Set(data.map(p => p.category))];
    return categories;
  }

  async getLowStock() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'ACTIVE')
      .filter('current_stock', 'lte', 'minimum_stock')
      .order('current_stock', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar produtos com estoque baixo: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
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
      salePrice: product.sale_price,
      isAssembly: product.is_assembly,
      isPart: product.is_part,
      assemblyCost: product.assembly_cost,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));
  }

  // Novos métodos para tipos de produtos
  async findByType(type: 'FINAL' | 'COMPONENT') {
    const { data, error} = await supabase
      .from('products')
      .select('*')
      .eq('product_type', type)
      .order('name');

    if (error) {
      throw new Error(`Erro ao buscar produtos por tipo: ${error.message}`);
    }

    // Converte snake_case para camelCase
    return (data || []).map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
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
      salePrice: product.sale_price,
      isAssembly: product.is_assembly,
      isPart: product.is_part,
      assemblyCost: product.assembly_cost,
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
