// Product Part (BOM - Bill of Materials)
export interface ProductPart {
  id: string;
  productId: string; // produto principal (assembly)
  partId: string; // peça componente
  quantity: number;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Part com produto relacionado
export interface ProductPartWithProduct extends ProductPart {
  part: {
    id: string;
    code: string;
    name: string;
    costPrice: number;
    currentStock: number;
    status: string;
  };
}

// BOM Explosion (todas as peças de um produto)
export interface BOMExplosion {
  partId: string;
  partCode: string;
  partName: string;
  quantity: number;
  isOptional: boolean;
  isAssembly?: boolean; // Indica se a peça é um sub-assembly (BOM aninhado)
  unitCost: number;
  totalCost: number;
  availableStock: number;
}

// BOM Availability Check
export interface BOMAvailability {
  canAssemble: boolean;
  missingParts: {
    partId: string;
    partName: string;
    required: number;
    available: number;
    missing: number;
  }[];
}

// DTOs
export interface AddProductPartDTO {
  partId: string;
  quantity: number;
  isOptional?: boolean;
}

export interface UpdateProductPartDTO {
  quantity?: number;
  isOptional?: boolean;
}
