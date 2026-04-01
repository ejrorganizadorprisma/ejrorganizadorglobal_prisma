import { db } from '../config/database';
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
    const productQuery = `
      SELECT id, code, name, product_type
      FROM products
      WHERE id = $1
    `;
    const productResult = await db.query(productQuery, [productId]);

    if (productResult.rows.length === 0) {
      throw new AppError('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    const product = productResult.rows[0];

    // Verificar se o produto é do tipo FINAL ou SEMI_FINISHED
    if (product.product_type !== 'FINAL' && product.product_type !== 'SEMI_FINISHED') {
      throw new AppError(
        'Apenas produtos finais ou semi-acabados possuem BOM',
        400,
        'INVALID_PRODUCT_TYPE'
      );
    }

    // Buscar o BOM do produto
    let bomVersionIdToUse: string | null = null;

    // Se versionId foi fornecido, buscar BOM dessa versão
    if (versionId) {
      // Verificar se a versão existe
      const versionQuery = `
        SELECT id, status
        FROM bom_versions
        WHERE id = $1 AND product_id = $2
      `;
      const versionResult = await db.query(versionQuery, [versionId, productId]);

      if (versionResult.rows.length === 0) {
        throw new AppError('Versão do BOM não encontrada', 404, 'BOM_VERSION_NOT_FOUND');
      }

      bomVersionIdToUse = versionId;
    } else {
      // Buscar versão ativa mais recente
      const activeVersionQuery = `
        SELECT id
        FROM bom_versions
        WHERE product_id = $1 AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const activeVersionResult = await db.query(activeVersionQuery, [productId]);

      if (activeVersionResult.rows.length > 0) {
        bomVersionIdToUse = activeVersionResult.rows[0].id;
      }
      // Se não há versão ativa, bomVersionIdToUse fica null (BOM legado)
    }

    // Buscar itens do BOM
    let bomQuery: string;
    let bomParams: any[];

    if (bomVersionIdToUse) {
      bomQuery = `
        SELECT
          bi.id,
          bi.component_id,
          bi.quantity,
          bi.unit,
          bi.scrap_percentage,
          bi.is_optional,
          p.id as product_id,
          p.code as product_code,
          p.name as product_name,
          p.product_type as product_type
        FROM bom_items bi
        LEFT JOIN products p ON bi.component_id = p.id
        WHERE bi.product_id = $1 AND bi.bom_version_id = $2
      `;
      bomParams = [productId, bomVersionIdToUse];
    } else {
      bomQuery = `
        SELECT
          bi.id,
          bi.component_id,
          bi.quantity,
          bi.unit,
          bi.scrap_percentage,
          bi.is_optional,
          p.id as product_id,
          p.code as product_code,
          p.name as product_name,
          p.product_type as product_type
        FROM bom_items bi
        LEFT JOIN products p ON bi.component_id = p.id
        WHERE bi.product_id = $1 AND bi.bom_version_id IS NULL
      `;
      bomParams = [productId];
    }

    const bomResult = await db.query(bomQuery, bomParams);

    if (bomResult.rows.length === 0) {
      throw new AppError(
        'Produto não possui BOM cadastrado',
        404,
        'BOM_NOT_FOUND'
      );
    }

    const bomItems = bomResult.rows;

    // Calcular materiais necessários considerando scrap
    const materials: BOMExplosion[] = [];

    for (const item of bomItems) {
      // Pular componentes opcionais
      if (item.is_optional) {
        continue;
      }

      // Calcular quantidade necessária com scrap
      // Ex: 10 unidades + 5% scrap = 10 * 1.05 = 10.5 unidades
      const scrapMultiplier = 1 + ((item.scrap_percentage || 0) / 100);
      const quantityNeeded = item.quantity * quantity * scrapMultiplier;

      materials.push({
        product_id: item.component_id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity_needed: Math.ceil(quantityNeeded), // Arredondar para cima
        unit: item.unit || 'UN',
      });

      // Se o componente é SEMI_FINISHED, explodir seu BOM recursivamente
      if (item.product_type === 'SEMI_FINISHED') {
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
          console.warn(`Sub-componente ${item.product_code} não possui BOM`);
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
      const productQuery = `SELECT current_stock FROM products WHERE id = $1`;
      const productResult = await db.query(productQuery, [material.product_id]);

      if (productResult.rows.length === 0) {
        throw new AppError(
          `Produto ${material.product_code} não encontrado`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      const currentStock = productResult.rows[0].current_stock || 0;

      // Buscar reservas ativas do produto
      const reservationsQuery = `
        SELECT quantity FROM stock_reservations
        WHERE product_id = $1 AND status = 'ACTIVE'
      `;
      const reservationsResult = await db.query(reservationsQuery, [material.product_id]);

      // Calcular total reservado
      const totalReserved = reservationsResult.rows.reduce(
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
      const suppliersQuery = `
        SELECT
          ps.id,
          ps.supplier_id,
          ps.unit_price,
          ps.minimum_quantity,
          ps.lead_time_days,
          ps.is_preferred,
          s.id as supplier_id_data,
          s.name as supplier_name,
          s.status as supplier_status
        FROM product_suppliers ps
        LEFT JOIN suppliers s ON ps.supplier_id = s.id
        WHERE ps.product_id = $1 AND s.status = 'ACTIVE'
        ORDER BY ps.is_preferred DESC, ps.unit_price ASC
      `;
      const suppliersResult = await db.query(suppliersQuery, [material.product_id]);
      const suppliers = suppliersResult.rows;

      // Pegar fornecedor preferencial ou o mais barato
      const preferredSupplier = suppliers.find(s => s.is_preferred);
      const supplier = preferredSupplier || suppliers[0];

      if (supplier) {
        // Calcular quantidade sugerida (considerando quantidade mínima do fornecedor)
        let suggestedQuantity = material.quantity_missing;

        if (supplier.minimum_quantity && suggestedQuantity < supplier.minimum_quantity) {
          suggestedQuantity = supplier.minimum_quantity;
        }

        suggestions.push({
          material,
          supplier_id: supplier.supplier_id,
          supplier_name: supplier.supplier_name,
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
   * Alias para checkMaterialAvailability (compatibilidade com controller)
   */
  async checkAvailability(
    productId: string,
    quantity: number,
    versionId?: string
  ): Promise<MaterialAvailability[]> {
    return this.checkMaterialAvailability(productId, quantity, versionId);
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
      const productQuery = `SELECT cost_price FROM products WHERE id = $1`;
      const productResult = await db.query(productQuery, [material.product_id]);

      if (productResult.rows.length === 0) {
        throw new AppError(
          `Produto ${material.product_code} não encontrado`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      const unitCost = productResult.rows[0].cost_price || 0;
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
