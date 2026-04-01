import { z } from 'zod';

// ============================================
// ENUMS - Tipos de Máquina
// ============================================

export enum FabricationMachineType {
  PRINTER_3D = 'PRINTER_3D',     // Impressora 3D
  LASER_CUTTER = 'LASER_CUTTER', // Cortadora Laser
}

export enum FabricationJobStatus {
  DRAFT = 'DRAFT',               // Rascunho
  QUEUED = 'QUEUED',             // Na fila de produção
  IN_PROGRESS = 'IN_PROGRESS',   // Em execução
  PAUSED = 'PAUSED',             // Pausado
  COMPLETED = 'COMPLETED',       // Concluído
  FAILED = 'FAILED',             // Falhou
  CANCELLED = 'CANCELLED',       // Cancelado
}

export enum MaterialType {
  // Filamentos 3D
  PLA = 'PLA',
  ABS = 'ABS',
  PETG = 'PETG',
  TPU = 'TPU',
  NYLON = 'NYLON',
  ASA = 'ASA',
  PC = 'PC',
  PVA = 'PVA',
  HIPS = 'HIPS',
  WOOD = 'WOOD',
  CARBON_FIBER = 'CARBON_FIBER',
  OTHER_FILAMENT = 'OTHER_FILAMENT',

  // Materiais Laser
  MDF_3MM = 'MDF_3MM',
  MDF_6MM = 'MDF_6MM',
  MDF_9MM = 'MDF_9MM',
  MDF_12MM = 'MDF_12MM',
  MDF_15MM = 'MDF_15MM',
  ACRYLIC_2MM = 'ACRYLIC_2MM',
  ACRYLIC_3MM = 'ACRYLIC_3MM',
  ACRYLIC_5MM = 'ACRYLIC_5MM',
  ACRYLIC_10MM = 'ACRYLIC_10MM',
  PLYWOOD_3MM = 'PLYWOOD_3MM',
  PLYWOOD_6MM = 'PLYWOOD_6MM',
  CARDBOARD = 'CARDBOARD',
  LEATHER = 'LEATHER',
  FABRIC = 'FABRIC',
  PAPER = 'PAPER',
  EVA = 'EVA',
  CORK = 'CORK',
  OTHER_LASER = 'OTHER_LASER',
}

// Unidade de medida do material
export enum MaterialUnit {
  GRAMS = 'GRAMS',         // Gramas (para filamento)
  KILOGRAMS = 'KILOGRAMS', // Quilos
  METERS_SQ = 'METERS_SQ', // Metros quadrados (para laser)
  CM_SQ = 'CM_SQ',         // Centímetros quadrados
  METERS = 'METERS',       // Metros lineares
  UNITS = 'UNITS',         // Unidades (chapas inteiras)
}

// ============================================
// MÁQUINAS DE FABRICAÇÃO
// ============================================

export interface FabricationMachine {
  id: string;
  name: string;                     // Ex: "Ender 3 Pro", "K40 Laser"
  type: FabricationMachineType;
  model?: string;                   // Modelo da máquina
  brand?: string;                   // Marca
  buildVolumeX?: number;            // Volume de trabalho X (mm)
  buildVolumeY?: number;            // Volume de trabalho Y (mm)
  buildVolumeZ?: number;            // Volume de trabalho Z (mm) - para 3D
  isActive: boolean;                // Se está ativa/disponível
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// LOTE DE FABRICAÇÃO DIGITAL
// ============================================

export interface DigitalFabricationBatch {
  id: string;
  batchNumber: string;              // Ex: "3D-2024-0001" ou "LASER-2024-0001"
  machineType: FabricationMachineType;
  machineId?: string;               // Máquina utilizada
  machine?: FabricationMachine;
  status: FabricationJobStatus;

  // Datas
  plannedDate?: string;             // Data planejada
  startedAt?: string;               // Início da produção
  completedAt?: string;             // Fim da produção

  // Responsáveis
  createdBy: string;
  createdByUser?: {
    id: string;
    name: string;
  };
  operatorId?: string;              // Operador da máquina
  operator?: {
    id: string;
    name: string;
  };

  // Totais calculados
  totalMaterialPlanned: number;     // Total de material planejado
  totalMaterialUsed: number;        // Total usado
  totalMaterialWasted: number;      // Total desperdiçado
  materialUnit: MaterialUnit;       // Unidade (g, kg, m², cm²)

  // Itens produzidos
  totalItemsPlanned: number;        // Total de itens a produzir
  totalItemsProduced: number;       // Total produzido com sucesso
  totalItemsFailed: number;         // Total com falha

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ITEM DO LOTE (Peça sendo produzida)
// ============================================

export interface DigitalFabricationItem {
  id: string;
  batchId: string;
  batch?: DigitalFabricationBatch;

  // Produto sendo fabricado
  productId?: string;               // Produto final (se existir no cadastro)
  product?: {
    id: string;
    code: string;
    name: string;
  };
  itemName: string;                 // Nome/descrição do item
  fileName?: string;                // Nome do arquivo (STL, DXF, etc.)

  // Quantidades
  quantityPlanned: number;          // Quantidade planejada
  quantityProduced: number;         // Quantidade produzida com sucesso
  quantityFailed: number;           // Quantidade com falha

  // Material (para 3D - peso em gramas)
  materialType: MaterialType;
  materialProductId?: string;       // Produto do estoque (filamento, MDF, etc)
  materialProduct?: {
    id: string;
    code: string;
    name: string;
    currentStock: number;
  };
  materialPlanned: number;          // Material planejado por unidade
  materialUsed: number;             // Material realmente usado por unidade
  materialUnit: MaterialUnit;

  // Para Laser - dimensões de corte
  cutWidth?: number;                // Largura em mm
  cutHeight?: number;               // Altura em mm
  cutAreaPerUnit?: number;          // Área de corte por unidade (cm² ou m²)

  // Para 3D - tempo de impressão
  printTimeMinutes?: number;        // Tempo estimado de impressão
  actualPrintTimeMinutes?: number;  // Tempo real de impressão

  // Configurações (JSON para flexibilidade)
  printSettings?: {
    layerHeight?: number;           // Altura da camada (mm)
    infillPercent?: number;         // Preenchimento %
    wallCount?: number;             // Número de paredes
    supportEnabled?: boolean;       // Suporte habilitado
    bedTemp?: number;               // Temperatura da mesa
    nozzleTemp?: number;            // Temperatura do bico
    printSpeed?: number;            // Velocidade (mm/s)
    [key: string]: any;
  };

  laserSettings?: {
    power?: number;                 // Potência %
    speed?: number;                 // Velocidade (mm/s)
    passes?: number;                // Número de passadas
    focusHeight?: number;           // Altura do foco (mm)
    [key: string]: any;
  };

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CONSUMO DE MATERIAL
// ============================================

export interface FabricationMaterialConsumption {
  id: string;
  batchId: string;
  itemId?: string;                  // Item específico (opcional)

  materialProductId: string;        // Produto consumido do estoque
  materialProduct?: {
    id: string;
    code: string;
    name: string;
  };

  quantityConsumed: number;         // Quantidade consumida
  quantityWasted: number;           // Quantidade desperdiçada
  unit: MaterialUnit;

  consumedBy: string;               // Quem registrou o consumo
  consumedByUser?: {
    id: string;
    name: string;
  };
  consumedAt: string;

  notes?: string;
  createdAt: string;
}

// ============================================
// HISTÓRICO DE PRODUÇÃO DIGITAL
// ============================================

export interface DigitalFabricationHistory {
  id: string;
  batchId: string;
  itemId?: string;

  action: string;                   // Ex: "STARTED", "PAUSED", "COMPLETED", "FAILED"
  previousStatus?: string;
  newStatus?: string;

  details?: string;                 // Detalhes da ação (JSON)

  performedBy: string;
  performedByUser?: {
    id: string;
    name: string;
  };
  performedAt: string;

  createdAt: string;
}

// ============================================
// DTOs - CREATE/UPDATE
// ============================================

export const CreateFabricationMachineSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.nativeEnum(FabricationMachineType),
  model: z.string().optional(),
  brand: z.string().optional(),
  buildVolumeX: z.number().positive().optional(),
  buildVolumeY: z.number().positive().optional(),
  buildVolumeZ: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export const UpdateFabricationMachineSchema = CreateFabricationMachineSchema.partial();

export const CreateDigitalFabricationBatchSchema = z.object({
  machineType: z.nativeEnum(FabricationMachineType),
  machineId: z.string().optional(),
  plannedDate: z.string().optional(),
  operatorId: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateDigitalFabricationBatchSchema = z.object({
  machineId: z.string().optional().nullable(),
  status: z.nativeEnum(FabricationJobStatus).optional(),
  plannedDate: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const CreateDigitalFabricationItemSchema = z.object({
  batchId: z.string().min(1, 'Lote é obrigatório'),
  productId: z.string().optional(),
  itemName: z.string().min(1, 'Nome do item é obrigatório'),
  fileName: z.string().optional(),
  quantityPlanned: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),

  materialType: z.nativeEnum(MaterialType),
  materialProductId: z.string().optional(),
  materialPlanned: z.number().min(0, 'Material planejado deve ser >= 0'),
  materialUnit: z.nativeEnum(MaterialUnit),

  // Para Laser
  cutWidth: z.number().positive().optional(),
  cutHeight: z.number().positive().optional(),

  // Para 3D
  printTimeMinutes: z.number().int().min(0).optional(),
  printSettings: z.record(z.any()).optional(),
  laserSettings: z.record(z.any()).optional(),

  notes: z.string().optional(),
});

export const UpdateDigitalFabricationItemSchema = z.object({
  productId: z.string().optional().nullable(),
  itemName: z.string().min(1).optional(),
  fileName: z.string().optional().nullable(),
  quantityPlanned: z.number().int().min(1).optional(),
  quantityProduced: z.number().int().min(0).optional(),
  quantityFailed: z.number().int().min(0).optional(),

  materialType: z.nativeEnum(MaterialType).optional(),
  materialProductId: z.string().optional().nullable(),
  materialPlanned: z.number().min(0).optional(),
  materialUsed: z.number().min(0).optional(),
  materialUnit: z.nativeEnum(MaterialUnit).optional(),

  cutWidth: z.number().positive().optional().nullable(),
  cutHeight: z.number().positive().optional().nullable(),

  printTimeMinutes: z.number().int().min(0).optional().nullable(),
  actualPrintTimeMinutes: z.number().int().min(0).optional().nullable(),
  printSettings: z.record(z.any()).optional().nullable(),
  laserSettings: z.record(z.any()).optional().nullable(),

  notes: z.string().optional().nullable(),
});

export const RegisterMaterialConsumptionSchema = z.object({
  batchId: z.string().min(1, 'Lote é obrigatório'),
  itemId: z.string().optional(),
  materialProductId: z.string().min(1, 'Material é obrigatório'),
  quantityConsumed: z.number().min(0, 'Quantidade consumida deve ser >= 0'),
  quantityWasted: z.number().min(0, 'Quantidade desperdiçada deve ser >= 0').default(0),
  unit: z.nativeEnum(MaterialUnit),
  notes: z.string().optional(),
});

export const CompleteFabricationItemSchema = z.object({
  quantityProduced: z.number().int().min(0, 'Quantidade produzida deve ser >= 0'),
  quantityFailed: z.number().int().min(0, 'Quantidade com falha deve ser >= 0').default(0),
  materialUsed: z.number().min(0, 'Material usado deve ser >= 0'),
  actualPrintTimeMinutes: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type CreateFabricationMachineDTO = z.infer<typeof CreateFabricationMachineSchema>;
export type UpdateFabricationMachineDTO = z.infer<typeof UpdateFabricationMachineSchema>;
export type CreateDigitalFabricationBatchDTO = z.infer<typeof CreateDigitalFabricationBatchSchema>;
export type UpdateDigitalFabricationBatchDTO = z.infer<typeof UpdateDigitalFabricationBatchSchema>;
export type CreateDigitalFabricationItemDTO = z.infer<typeof CreateDigitalFabricationItemSchema>;
export type UpdateDigitalFabricationItemDTO = z.infer<typeof UpdateDigitalFabricationItemSchema>;
export type RegisterMaterialConsumptionDTO = z.infer<typeof RegisterMaterialConsumptionSchema>;
export type CompleteFabricationItemDTO = z.infer<typeof CompleteFabricationItemSchema>;

// ============================================
// SUMÁRIOS E DASHBOARDS
// ============================================

export interface FabricationBatchSummary {
  id: string;
  batchNumber: string;
  machineType: FabricationMachineType;
  machineName?: string;
  status: FabricationJobStatus;
  itemsCount: number;
  totalItemsPlanned: number;
  totalItemsProduced: number;
  totalItemsFailed: number;
  progressPercent: number;
  totalMaterialPlanned: number;
  totalMaterialUsed: number;
  totalMaterialWasted: number;
  materialUnit: MaterialUnit;
  operatorName?: string;
  plannedDate?: string;
  startedAt?: string;
  createdAt: string;
}

export interface FabricationDashboardStats {
  // Por tipo de máquina
  printer3d: {
    activeBatches: number;
    completedToday: number;
    itemsInQueue: number;
    totalFilamentUsedToday: number;  // em gramas
    totalFilamentWastedToday: number;
  };
  laserCutter: {
    activeBatches: number;
    completedToday: number;
    itemsInQueue: number;
    totalMaterialUsedToday: number;  // em cm²
    totalMaterialWastedToday: number;
  };
  // Geral
  pendingBatches: number;
  inProgressBatches: number;
  completedThisWeek: number;
  failureRate: number;  // Taxa de falha %
}

// ============================================
// HELPERS - Conversões
// ============================================

// Converter área de cm para m²
export function cmSqToMetersSq(cmSq: number): number {
  return cmSq / 10000;
}

// Converter área de m² para cm²
export function metersSqToCmSq(metersSq: number): number {
  return metersSq * 10000;
}

// Calcular área de corte em cm²
export function calculateCutArea(widthMm: number, heightMm: number): number {
  return (widthMm / 10) * (heightMm / 10); // Converte mm para cm e calcula área
}

// Calcular área de corte em m²
export function calculateCutAreaM2(widthMm: number, heightMm: number): number {
  return (widthMm / 1000) * (heightMm / 1000);
}

// Converter gramas para kg
export function gramsToKg(grams: number): number {
  return grams / 1000;
}

// Converter kg para gramas
export function kgToGrams(kg: number): number {
  return kg * 1000;
}

// Labels para tipos de material
export const MaterialTypeLabels: Record<MaterialType, string> = {
  // Filamentos
  [MaterialType.PLA]: 'PLA',
  [MaterialType.ABS]: 'ABS',
  [MaterialType.PETG]: 'PETG',
  [MaterialType.TPU]: 'TPU (Flexível)',
  [MaterialType.NYLON]: 'Nylon',
  [MaterialType.ASA]: 'ASA',
  [MaterialType.PC]: 'Policarbonato',
  [MaterialType.PVA]: 'PVA (Solúvel)',
  [MaterialType.HIPS]: 'HIPS',
  [MaterialType.WOOD]: 'Madeira (Wood)',
  [MaterialType.CARBON_FIBER]: 'Fibra de Carbono',
  [MaterialType.OTHER_FILAMENT]: 'Outro Filamento',

  // Laser
  [MaterialType.MDF_3MM]: 'MDF 3mm',
  [MaterialType.MDF_6MM]: 'MDF 6mm',
  [MaterialType.MDF_9MM]: 'MDF 9mm',
  [MaterialType.MDF_12MM]: 'MDF 12mm',
  [MaterialType.MDF_15MM]: 'MDF 15mm',
  [MaterialType.ACRYLIC_2MM]: 'Acrílico 2mm',
  [MaterialType.ACRYLIC_3MM]: 'Acrílico 3mm',
  [MaterialType.ACRYLIC_5MM]: 'Acrílico 5mm',
  [MaterialType.ACRYLIC_10MM]: 'Acrílico 10mm',
  [MaterialType.PLYWOOD_3MM]: 'Compensado 3mm',
  [MaterialType.PLYWOOD_6MM]: 'Compensado 6mm',
  [MaterialType.CARDBOARD]: 'Papelão',
  [MaterialType.LEATHER]: 'Couro',
  [MaterialType.FABRIC]: 'Tecido',
  [MaterialType.PAPER]: 'Papel',
  [MaterialType.EVA]: 'EVA',
  [MaterialType.CORK]: 'Cortiça',
  [MaterialType.OTHER_LASER]: 'Outro Material',
};

export const MaterialUnitLabels: Record<MaterialUnit, string> = {
  [MaterialUnit.GRAMS]: 'g',
  [MaterialUnit.KILOGRAMS]: 'kg',
  [MaterialUnit.METERS_SQ]: 'm²',
  [MaterialUnit.CM_SQ]: 'cm²',
  [MaterialUnit.METERS]: 'm',
  [MaterialUnit.UNITS]: 'un',
};

export const FabricationJobStatusLabels: Record<FabricationJobStatus, string> = {
  [FabricationJobStatus.DRAFT]: 'Rascunho',
  [FabricationJobStatus.QUEUED]: 'Na Fila',
  [FabricationJobStatus.IN_PROGRESS]: 'Em Execução',
  [FabricationJobStatus.PAUSED]: 'Pausado',
  [FabricationJobStatus.COMPLETED]: 'Concluído',
  [FabricationJobStatus.FAILED]: 'Falhou',
  [FabricationJobStatus.CANCELLED]: 'Cancelado',
};

export const FabricationMachineTypeLabels: Record<FabricationMachineType, string> = {
  [FabricationMachineType.PRINTER_3D]: 'Impressora 3D',
  [FabricationMachineType.LASER_CUTTER]: 'Cortadora Laser',
};
