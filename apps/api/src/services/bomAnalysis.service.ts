import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';

interface BOMExplosion {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity_needed: number;
  unit: string;
}

interface MaterialAvailability extends BOMExplosion {
  quantity_available: number;
  quantity_reserved: number;
  quantity_missing: number;
  is_available: boolean;
}

interface PurchaseSuggestion {
  material: MaterialAvailability;
  supplier_id?: string;
  supplier_name?: string;
  unit_price?: number;
  suggested_quantity: number;
}

export class BOMAnalysisService {
  /**
   * Explode o BOM de um produto, calculando todos os materiais necessários
   * @param productId - ID do produto final
   * @param quantity - Quantidade do produto final a ser produzido
   * @param versionId - ID da versão do BOM (opcional, usa versão ativa se não fornecido)
   */
  async explodeBOM(
    productId: string,
    quantity: number,
    versionId?: string
  ): Promise<BOMExplosion[]> {
    // Validar quantidade
    if (quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400, 'INVALID_QUANTITY');
    }

    // Verificar se o produto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, code, name, product_type')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Verificar se o produto é do tipo FINAL ou SEMI_FINISHED
    if (product.product_type !== 'FINAL' && product.product_type !== 'SEMI_FINISHED') {
      throw new AppError(
        'Apenas produtos finais ou semi-acabados possuem BOM',
        400,
        'INVALID_PRODUCT_TYPE'
      );
    }

    // Buscar o BOM do produto
    let bomQuery = supabase
      .from('bom_items')
      .select(`
        id,
        component_id,
        quantity,
        unit,
        scrap_percentage,
        is_optional,
        products:component_id (
          id,
          code,
          name,
          product_type
        )
      `)
      .eq('product_id', productId);

    // Se versionId foi fornecido, buscar BOM dessa versão
    if (versionId) {
      // Verificar se a versão existe
      const { data: version, error: versionError } = await supabase
        .from('bom_versions')
        .select('id, status')
        .eq('id', versionId)
        .eq('product_id', productId)
        .single();

      if (versionError || !version) {
        throw new AppError('Versão do BOM não encontrada', 404, 'BOM_VERSION_NOT_FOUND');
      }

      bomQuery = bomQuery.eq('bom_version_id', versionId);
    } else {
      // Buscar versão ativa mais recente
      const { data: activeVersion } = await supabase
        .from('bom_versions')
        .select('id')
        .eq('product_id', productId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeVersion) {
        bomQuery = bomQuery.eq('bom_version_id', activeVersion.id);
      } else {
        // Se não há versão ativa, buscar itens sem versão (BOM legado)
        bomQuery = bomQuery.is('bom_version_id', null);
      }
    }

    const { data: bomItems, error: bomError } = await bomQuery;

    if (bomError) {
      throw new AppError(
        `Erro ao buscar BOM: ${bomError.message}`,
        500,
        'BOM_FETCH_ERROR'
      );
    }

    if (!bomItems || bomItems.length === 0) {
      throw new AppError(
        'Produto não possui BOM cadastrado',
        404,
        'BOM_NOT_FOUND'
      );
    }

    // Calcular materiais necessários considerando scrap
    const materials: BOMExplosion[] = [];

    for (const item of bomItems) {
      // Pular componentes opcionais
      if (item.is_optional) {
        continue;
      }

      const component = item.products as any;

      // Calcular quantidade necessária com scrap
      // Ex: 10 unidades + 5% scrap = 10 * 1.05 = 10.5 unidades
      const scrapMultiplier = 1 + ((item.scrap_percentage || 0) / 100);
      const quantityNeeded = item.quantity * quantity * scrapMultiplier;

      materials.push({
        product_id: item.component_id,
        product_code: component.code,
        product_name: component.name,
        quantity_needed: Math.ceil(quantityNeeded), // Arredondar para cima
        unit: item.unit || 'UN',
      });

      // Se o componente é SEMI_FINISHED, explodir seu BOM recursivamente
      if (component.product_type === 'SEMI_FINISHED') {
        try {
          const subBOM = await this.explodeBOM(
            item.component_id,
            Math.ceil(quantityNeeded),
            undefined // Usar versão ativa do sub-componente
          );

          // Adicionar ou incrementar materiais do sub-BOM
          for (const subItem of subBOM) {
            const existingIndex = materials.findIndex(
              m => m.product_id === subItem.product_id
            );

            if (existingIndex >= 0) {
              materials[existingIndex].quantity_needed += subItem.quantity_needed;
            } else {
              materials.push(subItem);
            }
          }
        } catch (error) {
          // Se sub-componente não tem BOM, apenas usar ele como componente
          console.warn(`Sub-componente ${component.code} não possui BOM`);
        }
      }
    }

    // Consolidar materiais duplicados (se houver)
    const consolidatedMaterials: BOMExplosion[] = [];
    const materialMap = new Map<string, BOMExplosion>();

    for (const material of materials) {
      if (materialMap.has(material.product_id)) {
        const existing = materialMap.get(material.product_id)!;
        existing.quantity_needed += material.quantity_needed;
      } else {
        materialMap.set(material.product_id, { ...material });
      }
    }

    materialMap.forEach(material => consolidatedMaterials.push(material));

    return consolidatedMaterials;
  }

  /**
   * Verifica disponibilidade de materiais para produção
   * @param productId - ID do produto final
   * @param quantity - Quantidade do produto final a ser produzido
   * @param versionId - ID da versão do BOM (opcional)
   */
  async checkMaterialAvailability(
    productId: string,
    quantity: number,
    versionId?: string
  ): Promise<MaterialAvailability[]> {
    // Explodir BOM para obter lista de materiais
    const materials = await this.explodeBOM(productId, quantity, versionId);

    // Para cada material, verificar disponibilidade
    const availability: MaterialAvailability[] = [];

    for (const material of materials) {
      // Buscar estoque atual do produto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', material.product_id)
        .single();

      if (productError || !product) {
        throw new AppError(
          `Produto ${material.product_code} não encontrado`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      const currentStock = product.current_stock || 0;

      // Buscar reservas ativas do produto
      const { data: reservations, error: reservationsError } = await supabase
        .from('stock_reservations')
        .select('quantity')
        .eq('product_id', material.product_id)
        .eq('status', 'ACTIVE');

      if (reservationsError) {
        throw new AppError(
          `Erro ao buscar reservas: ${reservationsError.message}`,
          500,
          'RESERVATIONS_FETCH_ERROR'
        );
      }

      // Calcular total reservado
      const totalReserved = (reservations || []).reduce(
        (sum, r) => sum + r.quantity,
        0
      );

      // Calcular disponível = estoque atual - reservas
      const quantityAvailable = currentStock - totalReserved;

      // Calcular faltante (se disponível < necessário)
      const quantityMissing = Math.max(0, material.quantity_needed - quantityAvailable);

      availability.push({
        ...material,
        quantity_available: quantityAvailable,
        quantity_reserved: totalReserved,
        quantity_missing: quantityMissing,
        is_available: quantityAvailable >= material.quantity_needed,
      });
    }

    return availability;
  }

  /**
   * Sugere compras de materiais faltantes
   * @param productId - ID do produto final
   * @param quantity - Quantidade do produto final a ser produzido
   * @param versionId - ID da versão do BOM (opcional)
   */
  async suggestPurchases(
    productId: string,
    quantity: number,
    versionId?: string
  ): Promise<PurchaseSuggestion[]> {
    // Verificar disponibilidade de materiais
    const availability = await this.checkMaterialAvailability(
      productId,
      quantity,
      versionId
    );

    // Filtrar apenas materiais faltantes
    const missingMaterials = availability.filter(m => !m.is_available);

    if (missingMaterials.length === 0) {
      return [];
    }

    // Para cada material faltante, buscar fornecedores
    const suggestions: PurchaseSuggestion[] = [];

    for (const material of missingMaterials) {
      // Buscar fornecedores do produto
      const { data: suppliers, error: suppliersError } = await supabase
        .from('product_suppliers')
        .select(`
          id,
          supplier_id,
          unit_price,
          minimum_quantity,
          lead_time_days,
          is_preferred,
          suppliers (
            id,
            name,
            status
          )
        `)
        .eq('product_id', material.product_id)
        .eq('suppliers.status', 'ACTIVE')
        .order('is_preferred', { ascending: false })
        .order('unit_price', { ascending: true });

      if (suppliersError) {
        console.warn(
          `Erro ao buscar fornecedores para ${material.product_code}: ${suppliersError.message}`
        );
      }

      // Pegar fornecedor preferencial ou o mais barato
      const preferredSupplier = (suppliers || []).find(s => s.is_preferred);
      const supplier = preferredSupplier || (suppliers && suppliers[0]);

      if (supplier) {
        const supplierData = supplier.suppliers as any;

        // Calcular quantidade sugerida (considerando quantidade mínima do fornecedor)
        let suggestedQuantity = material.quantity_missing;

        if (supplier.minimum_quantity && suggestedQuantity < supplier.minimum_quantity) {
          suggestedQuantity = supplier.minimum_quantity;
        }

        suggestions.push({
          material,
          supplier_id: supplier.supplier_id,
          supplier_name: supplierData?.name,
          unit_price: supplier.unit_price,
          suggested_quantity: suggestedQuantity,
        });
      } else {
        // Sem fornecedor cadastrado
        suggestions.push({
          material,
          suggested_quantity: material.quantity_missing,
        });
      }
    }

    return suggestions;
  }

  /**
   * Verifica se há materiais suficientes para produção
   * @param productId - ID do produto final
   * @param quantity - Quantidade do produto final a ser produzido
   * @param versionId - ID da versão do BOM (opcional)
   */
  async canProduce(
    productId: string,
    quantity: number,
    versionId?: string
  ): Promise<{ canProduce: boolean; missingMaterials: MaterialAvailability[] }> {
    const availability = await this.checkMaterialAvailability(
      productId,
      quantity,
      versionId
    );

    const missingMaterials = availability.filter(m => !m.is_available);

    return {
      canProduce: missingMaterials.length === 0,
      missingMaterials,
    };
  }

  /**
   * Calcula custo total de materiais para produção
   * @param productId - ID do produto final
   * @param quantity - Quantidade do produto final a ser produzido
   * @param versionId - ID da versão do BOM (opcional)
   */
  async calculateMaterialCost(
    productId: string,
    quantity: number,
    versionId?: string
  ): Promise<{ totalCost: number; breakdown: Array<{ product_code: string; product_name: string; quantity: number; unit_cost: number; total_cost: number }> }> {
    const materials = await this.explodeBOM(productId, quantity, versionId);

    let totalCost = 0;
    const breakdown = [];

    for (const material of materials) {
      // Buscar custo do produto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('cost_price')
        .eq('id', material.product_id)
        .single();

      if (productError || !product) {
        throw new AppError(
          `Produto ${material.product_code} não encontrado`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      const unitCost = product.cost_price || 0;
      const materialTotalCost = unitCost * material.quantity_needed;
      totalCost += materialTotalCost;

      breakdown.push({
        product_code: material.product_code,
        product_name: material.product_name,
        quantity: material.quantity_needed,
        unit_cost: unitCost,
        total_cost: materialTotalCost,
      });
    }

    return {
      totalCost,
      breakdown,
    };
  }
}
