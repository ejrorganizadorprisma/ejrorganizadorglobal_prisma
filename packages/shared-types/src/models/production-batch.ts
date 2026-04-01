import { z } from 'zod';

// ============================================
// STATUS ENUMS
// ============================================

export enum ProductionBatchStatus {
  DRAFT = 'DRAFT',           // Rascunho - sendo configurado
  PLANNED = 'PLANNED',       // Planejado - aguardando liberação
  RELEASED = 'RELEASED',     // Liberado - aguardando início
  IN_PROGRESS = 'IN_PROGRESS', // Em produção
  PAUSED = 'PAUSED',         // Pausado
  TESTING = 'TESTING',       // Em fase de testes
  COMPLETED = 'COMPLETED',   // Produção concluída
  CANCELLED = 'CANCELLED',   // Cancelado
}

export enum ProductionUnitStatus {
  PENDING = 'PENDING',           // Aguardando produção
  IN_PRODUCTION = 'IN_PRODUCTION', // Sendo montada
  AWAITING_TEST = 'AWAITING_TEST', // Aguardando teste
  IN_TESTING = 'IN_TESTING',     // Em teste
  TEST_PASSED = 'TEST_PASSED',   // Teste aprovado
  TEST_FAILED = 'TEST_FAILED',   // Teste reprovado (refugo ou retrabalho)
  REWORK = 'REWORK',             // Em retrabalho
  COMPLETED = 'COMPLETED',       // Finalizada com sucesso
  SCRAPPED = 'SCRAPPED',         // Refugo (descarte)
}

export enum UnitComponentStatus {
  PENDING = 'PENDING',       // Componente não montado
  MOUNTED = 'MOUNTED',       // Componente montado
  DEFECTIVE = 'DEFECTIVE',   // Componente com defeito
  REPLACED = 'REPLACED',     // Componente substituído
}

export enum TestType {
  ASSEMBLY = 'ASSEMBLY',     // Teste pós-montagem (primeiro nível)
  FINAL = 'FINAL',           // Teste final (segundo nível)
}

export enum TestResult {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONAL = 'CONDITIONAL', // Aprovado com ressalvas
}

// ============================================
// PRODUCTION BATCH (Lote de Produção)
// ============================================

export interface ProductionBatch {
  id: string;
  batchNumber: string;           // Ex: "LOTE-2024-0001"
  productId: string;             // Produto a ser produzido
  product?: {
    id: string;
    code: string;
    name: string;
    isAssembly: boolean;
  };
  productionOrderId?: string;    // Relacionamento opcional com OP existente
  quantityPlanned: number;       // Quantidade planejada
  quantityProduced: number;      // Quantidade produzida (aprovada)
  quantityScrapped: number;      // Quantidade refugada
  quantityInProgress: number;    // Quantidade em produção
  status: ProductionBatchStatus;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedTo?: string;           // Responsável pelo lote
  createdBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PRODUCTION UNIT (Unidade de Produção)
// ============================================

export interface ProductionUnit {
  id: string;
  batchId: string;               // Lote ao qual pertence
  batch?: ProductionBatch;
  unitNumber: number;            // Número sequencial dentro do lote (1, 2, 3...)
  serialNumber?: string;         // Número de série (opcional, pode ser gerado)
  status: ProductionUnitStatus;
  assignedTo?: string;           // Funcionário responsável pela montagem
  assignedUser?: {
    id: string;
    name: string;
  };
  startedAt?: string;            // Início da montagem
  completedAt?: string;          // Fim da montagem
  testedAt?: string;             // Data do teste
  testedBy?: string;             // Quem testou
  finalTestedAt?: string;        // Data do teste final
  finalTestedBy?: string;        // Quem fez o teste final
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UNIT COMPONENT (Componente da Unidade)
// ============================================

export interface UnitComponent {
  id: string;
  unitId: string;                // Unidade de produção
  productPartId: string;         // Referência ao BOM (product_parts)
  productPart?: {
    id: string;
    partId: string;
    quantity: number;
    part: {
      id: string;
      code: string;
      name: string;
    };
  };
  partId: string;                // Componente/peça
  part?: {
    id: string;
    code: string;
    name: string;
    currentStock?: number;       // Estoque atual do componente
  };
  quantityRequired: number;      // Quantidade necessária (do BOM)
  quantityUsed: number;          // Quantidade efetivamente usada
  status: UnitComponentStatus;
  // Campos de liberação do estoque
  isReleased: boolean;           // Se foi liberado do estoque
  releasedQuantity: number;      // Quantidade liberada
  releasedAt?: string;           // Data da liberação
  releasedBy?: string;           // Quem liberou
  releasedByUser?: {
    id: string;
    name: string;
  };
  mountedAt?: string;            // Data da montagem
  mountedBy?: string;            // Quem montou
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMPONENT RELEASE (Liberação de Componentes)
// ============================================

export interface ComponentRelease {
  id: string;
  unitComponentId: string;
  batchId: string;
  unitId: string;
  partId: string;
  part?: {
    id: string;
    code: string;
    name: string;
  };
  quantityReleased: number;
  releasedBy: string;
  releasedByUser?: {
    id: string;
    name: string;
  };
  releasedAt: string;
  notes?: string;
  createdAt: string;
}

// DTO para liberar componente
export const ReleaseComponentSchema = z.object({
  componentId: z.string().min(1, 'Componente é obrigatório'),
  quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  notes: z.string().optional(),
});

export type ReleaseComponentDTO = z.infer<typeof ReleaseComponentSchema>;

// DTO para liberar múltiplos componentes de uma vez
export const BulkReleaseComponentsSchema = z.object({
  releases: z.array(z.object({
    componentId: z.string().min(1),
    quantity: z.number().int().min(1),
  })).min(1, 'Selecione pelo menos um componente'),
  notes: z.string().optional(),
});

export type BulkReleaseComponentsDTO = z.infer<typeof BulkReleaseComponentsSchema>;

// ============================================
// UNIT TEST (Teste da Unidade)
// ============================================

export interface UnitTest {
  id: string;
  unitId: string;                // Unidade testada
  testType: TestType;            // ASSEMBLY ou FINAL
  result: TestResult;
  testedBy: string;              // Quem realizou o teste
  testedByUser?: {
    id: string;
    name: string;
  };
  testedAt: string;              // Data/hora do teste
  observations?: string;         // Observações do teste
  defectsFound?: string;         // Defeitos encontrados (se falhou)
  createdAt: string;
}

// ============================================
// PRODUCTION HISTORY (Histórico de Produção)
// ============================================

export interface ProductionHistory {
  id: string;
  entityType: 'BATCH' | 'UNIT' | 'COMPONENT';
  entityId: string;              // ID do lote, unidade ou componente
  action: string;                // Ex: "STATUS_CHANGED", "ASSIGNED", "TESTED"
  previousValue?: string;        // Valor anterior (JSON ou string)
  newValue?: string;             // Novo valor
  performedBy: string;           // Quem executou a ação
  performedByUser?: {
    id: string;
    name: string;
  };
  performedAt: string;
  notes?: string;
  createdAt: string;
}

// ============================================
// DTOs - CREATE
// ============================================

export const CreateProductionBatchSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  productionOrderId: z.string().optional(),
  quantityPlanned: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateProductionBatchSchema = z.object({
  quantityPlanned: z.number().int().min(1).optional(),
  status: z.nativeEnum(ProductionBatchStatus).optional(),
  plannedStartDate: z.string().optional().nullable(),
  plannedEndDate: z.string().optional().nullable(),
  actualStartDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateProductionUnitSchema = z.object({
  status: z.nativeEnum(ProductionUnitStatus).optional(),
  assignedTo: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateUnitComponentSchema = z.object({
  status: z.nativeEnum(UnitComponentStatus).optional(),
  quantityUsed: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export const CreateUnitTestSchema = z.object({
  unitId: z.string().min(1, 'Unidade é obrigatória'),
  testType: z.nativeEnum(TestType),
  result: z.nativeEnum(TestResult),
  observations: z.string().optional(),
  defectsFound: z.string().optional(),
});

// ============================================
// DTOs - Tipos inferidos
// ============================================

export type CreateProductionBatchDTO = z.infer<typeof CreateProductionBatchSchema>;
export type UpdateProductionBatchDTO = z.infer<typeof UpdateProductionBatchSchema>;
export type UpdateProductionUnitDTO = z.infer<typeof UpdateProductionUnitSchema>;
export type UpdateUnitComponentDTO = z.infer<typeof UpdateUnitComponentSchema>;
export type CreateUnitTestDTO = z.infer<typeof CreateUnitTestSchema>;

// ============================================
// SUMMARY TYPES (para dashboards e listas)
// ============================================

export interface BatchSummary {
  id: string;
  batchNumber: string;
  productName: string;
  productCode: string;
  status: ProductionBatchStatus;
  quantityPlanned: number;
  quantityProduced: number;
  quantityScrapped: number;
  quantityInProgress: number;
  progressPercentage: number;
  assignedToName?: string;
  plannedStartDate?: string;
  actualStartDate?: string;
}

export interface UnitSummary {
  id: string;
  unitNumber: number;
  serialNumber?: string;
  status: ProductionUnitStatus;
  assignedToName?: string;
  componentsTotal: number;
  componentsMounted: number;
  mountingProgress: number;
  assemblyTestResult?: TestResult;
  finalTestResult?: TestResult;
}

// ============================================
// MY PRODUCTION (Minha Produção - funcionário)
// ============================================

export interface MyProductionUnit extends ProductionUnit {
  batch: ProductionBatch & {
    product: {
      id: string;
      code: string;
      name: string;
    };
  };
  components: UnitComponent[];
  tests: UnitTest[];
}

export interface MyProductionSummary {
  assignedUnits: number;        // Unidades atribuídas
  inProgress: number;           // Em produção
  awaitingTest: number;         // Aguardando teste
  completedToday: number;       // Completadas hoje
  completedThisWeek: number;    // Completadas esta semana
}
