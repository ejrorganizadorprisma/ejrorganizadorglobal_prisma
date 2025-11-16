# Plano de Implementação - Manufatura First

**Estratégia:** Core Operacional (Estoque → P&D → Compras → Produção)
**Vendas e Financeiro:** Fase final
**Data:** November 16, 2025

---

## 🎯 Visão Geral da Estratégia

### Por que essa ordem?

1. **Estoque** - Base de tudo (produtos e componentes)
2. **P&D** - Define o que será produzido (BOM)
3. **Compras** - Adquire componentes necessários
4. **Produção** - Transforma componentes em produtos finais
5. **Vendas** - Vende os produtos (final)
6. **Financeiro** - Controla o dinheiro (final)

### Benefícios dessa abordagem:

✅ **Foco no core operacional primeiro**
✅ **Produtos prontos ANTES de vender**
✅ **Custos conhecidos ANTES de precificar**
✅ **Processo validado ANTES de escalar vendas**
✅ **Dados reais para decisões financeiras**

---

## 📊 ROADMAP DE IMPLEMENTAÇÃO

```
FASE 0: Preparação (ATUAL)
  └── MVP base existente (autenticação, usuários, dashboards básicos)

FASE 1: ESTOQUE COMPLETO [2-3 semanas]
  ├── 1A: Produtos duais (Final vs Componente)
  ├── 1B: Estoque reservado
  ├── 1C: Localização de armazém
  └── 1D: Alertas avançados

FASE 2: P&D & DESENVOLVIMENTO [3 semanas]
  ├── 2A: Produtos em desenvolvimento
  ├── 2B: BOM (Bill of Materials)
  ├── 2C: Versionamento
  └── 2D: Aprovação de lançamento

FASE 3: COMPRAS & FORNECEDORES [4 semanas]
  ├── 3A: Multi-fornecedores
  ├── 3B: Pedidos de compra
  ├── 3C: Recebimento
  └── 3D: Workflow de aprovação

FASE 4: PRODUÇÃO & MANUFATURA [4-5 semanas]
  ├── 4A: Ordens de Produção (OP)
  ├── 4B: Execução e consumo de componentes
  ├── 4C: Planejamento (MRP básico)
  └── 4D: Relatórios de produção

FASE 5: VENDAS (SIMPLIFICADO) [2 semanas]
  ├── 5A: Vendas básicas (já existe, ajustar)
  └── 5B: Integração com estoque de produtos finais

FASE 6: FINANCEIRO (FUTURO)
  └── Contas a pagar/receber, fluxo de caixa
```

**Timeline Total:** ~14-17 semanas (3.5-4 meses)

---

## FASE 1: ESTOQUE COMPLETO

### Objetivo
Transformar o sistema de estoque atual para suportar dois tipos de produtos (Final vs Componente) e recursos avançados de manufatura.

### 1A: Produtos Duais (Final vs Componente)

#### Mudanças no Banco de Dados

**Adicionar à tabela `products`:**
```sql
ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'FINAL' CHECK (product_type IN ('FINAL', 'COMPONENT'));
ALTER TABLE products ADD COLUMN version TEXT;
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('DEVELOPMENT', 'PRODUCTION', 'ACTIVE', 'DISCONTINUED'));
ALTER TABLE products ADD COLUMN warehouse_location TEXT;
ALTER TABLE products ADD COLUMN lead_time_days INTEGER;
ALTER TABLE products ADD COLUMN minimum_lot_quantity INTEGER;
ALTER TABLE products ADD COLUMN technical_description TEXT;

-- Criar índice para performance
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_status ON products(status);
```

#### Backend Changes

**1. Atualizar `apps/api/src/repositories/product.repository.ts`:**
```typescript
// Adicionar filtros por tipo
async findByType(type: 'FINAL' | 'COMPONENT') {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('product_type', type)
    .order('name');

  if (error) throw error;
  return data;
}

async findComponents() {
  return this.findByType('COMPONENT');
}

async findFinalProducts() {
  return this.findByType('FINAL');
}

// Atualizar create para incluir novos campos
async create(productData: CreateProductDto) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...productData,
      product_type: productData.product_type || 'FINAL',
      status: productData.status || 'ACTIVE',
      version: productData.version || '1.0',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**2. Criar DTOs em `apps/api/src/dtos/product.dto.ts`:**
```typescript
export interface CreateProductDto {
  name: string;
  code: string;
  category?: string;
  product_type?: 'FINAL' | 'COMPONENT';
  status?: 'DEVELOPMENT' | 'PRODUCTION' | 'ACTIVE' | 'DISCONTINUED';
  version?: string;

  // Campos específicos de componentes
  warehouse_location?: string;
  lead_time_days?: number;
  minimum_lot_quantity?: number;
  technical_description?: string;

  // Campos comuns
  cost_price?: number;
  sale_price?: number;
  description?: string;
  photo_url?: string;
  current_stock?: number;
  minimum_stock?: number;
  supplier_id?: string;
}
```

**3. Atualizar rotas em `apps/api/src/routes/product.routes.ts`:**
```typescript
// Novas rotas
router.get('/components', controller.getComponents);
router.get('/final-products', controller.getFinalProducts);
```

#### Frontend Changes

**1. Atualizar formulário de produto `apps/web/src/pages/ProductFormPage.tsx`:**
```typescript
// Adicionar campo de tipo
<div>
  <label className="block text-sm font-medium text-gray-700">
    Tipo de Produto
  </label>
  <select
    value={formData.product_type}
    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
    className="mt-1 block w-full rounded-md border-gray-300"
  >
    <option value="FINAL">Produto Final (vendido ao cliente)</option>
    <option value="COMPONENT">Componente/Peça (usado em montagem)</option>
  </select>
</div>

// Adicionar campo de status
<div>
  <label className="block text-sm font-medium text-gray-700">
    Status
  </label>
  <select
    value={formData.status}
    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
    className="mt-1 block w-full rounded-md border-gray-300"
  >
    <option value="DEVELOPMENT">Em Desenvolvimento</option>
    <option value="PRODUCTION">Em Produção (protótipo)</option>
    <option value="ACTIVE">Ativo</option>
    <option value="DISCONTINUED">Descontinuado</option>
  </select>
</div>

// Campos condicionais para COMPONENTES
{formData.product_type === 'COMPONENT' && (
  <>
    <div>
      <label>Localização no Armazém</label>
      <input
        type="text"
        placeholder="Ex: A-12-3"
        value={formData.warehouse_location}
        onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
      />
    </div>

    <div>
      <label>Lead Time (dias)</label>
      <input
        type="number"
        value={formData.lead_time_days}
        onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })}
      />
    </div>

    <div>
      <label>Lote Mínimo de Compra</label>
      <input
        type="number"
        value={formData.minimum_lot_quantity}
        onChange={(e) => setFormData({ ...formData, minimum_lot_quantity: parseInt(e.target.value) })}
      />
    </div>
  </>
)}
```

**2. Criar página de listagem separada:**
- `/products/components` - Lista só componentes
- `/products/final` - Lista só produtos finais

**Esforço:** 5-6 dias
**Prioridade:** 🔴 CRÍTICA

---

### 1B: Estoque Reservado

#### Mudanças no Banco de Dados

**Criar tabela de reservas:**
```sql
CREATE TABLE stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_for_type TEXT NOT NULL CHECK (reserved_for_type IN ('PRODUCTION_ORDER', 'SALES_ORDER')),
  reserved_for_id TEXT NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT REFERENCES users(id),
  notes TEXT
);

CREATE INDEX idx_reservations_product ON stock_reservations(product_id);
CREATE INDEX idx_reservations_active ON stock_reservations(product_id) WHERE released_at IS NULL;
```

#### Backend: Lógica de Reserva

**Criar `apps/api/src/services/stock-reservation.service.ts`:**
```typescript
export class StockReservationService {
  async reserveStock(
    productId: string,
    quantity: number,
    reservedForType: 'PRODUCTION_ORDER' | 'SALES_ORDER',
    reservedForId: string,
    userId: string
  ) {
    // 1. Verificar estoque disponível
    const available = await this.getAvailableStock(productId);
    if (available < quantity) {
      throw new Error(`Estoque insuficiente. Disponível: ${available}, Solicitado: ${quantity}`);
    }

    // 2. Criar reserva
    const { data, error } = await supabase
      .from('stock_reservations')
      .insert({
        product_id: productId,
        quantity,
        reserved_for_type: reservedForType,
        reserved_for_id: reservedForId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAvailableStock(productId: string): Promise<number> {
    // 1. Pegar estoque físico
    const product = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single();

    const physicalStock = product.data?.current_stock || 0;

    // 2. Pegar reservas ativas
    const { data: reservations } = await supabase
      .from('stock_reservations')
      .select('quantity')
      .eq('product_id', productId)
      .is('released_at', null);

    const reservedStock = reservations?.reduce((sum, r) => sum + r.quantity, 0) || 0;

    // 3. Disponível = Físico - Reservado
    return physicalStock - reservedStock;
  }

  async releaseReservation(reservationId: string) {
    const { error } = await supabase
      .from('stock_reservations')
      .update({ released_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (error) throw error;
  }
}
```

#### Frontend: Mostrar Estoque Disponível

**Atualizar `ProductsPage.tsx` para mostrar 3 colunas:**
```typescript
<table>
  <thead>
    <tr>
      <th>Produto</th>
      <th>Estoque Físico</th>
      <th>Reservado</th>
      <th>Disponível</th>
    </tr>
  </thead>
  <tbody>
    {products.map(product => {
      const reserved = getReservedQuantity(product.id);
      const available = product.current_stock - reserved;

      return (
        <tr>
          <td>{product.name}</td>
          <td>{product.current_stock}</td>
          <td className="text-orange-600">{reserved}</td>
          <td className={available < product.minimum_stock ? 'text-red-600 font-bold' : ''}>
            {available}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
```

**Esforço:** 3-4 dias
**Prioridade:** 🔴 ALTA

---

### 1C: Localização de Armazém

Já incluído em 1A (campo `warehouse_location`).

**Frontend adicional:**
- Filtro por localização na listagem de componentes
- Busca por localização
- Relatório de picking por localização

**Esforço:** 2 dias
**Prioridade:** 🟡 MÉDIA

---

### 1D: Alertas Avançados

**Criar `apps/api/src/services/stock-alerts.service.ts`:**
```typescript
export class StockAlertsService {
  async checkAllAlerts() {
    const alerts = [];

    // 1. Estoque abaixo do mínimo (já existe)
    alerts.push(...await this.checkLowStock());

    // 2. Componentes sem estoque disponível (considerando reservas)
    alerts.push(...await this.checkUnavailableComponents());

    // 3. Produtos parados (sem movimento 60+ dias)
    alerts.push(...await this.checkStagnantProducts());

    // 4. Componentes próximos da validade (se aplicável)
    // alerts.push(...await this.checkExpiringComponents());

    return alerts;
  }

  async checkUnavailableComponents() {
    const components = await supabase
      .from('products')
      .select('*')
      .eq('product_type', 'COMPONENT');

    const alerts = [];

    for (const component of components.data || []) {
      const available = await stockReservationService.getAvailableStock(component.id);

      if (available <= 0) {
        alerts.push({
          type: 'COMPONENT_UNAVAILABLE',
          severity: 'HIGH',
          product_id: component.id,
          product_name: component.name,
          message: `Componente ${component.name} sem estoque disponível (reservado para produção)`,
        });
      }
    }

    return alerts;
  }
}
```

**Esforço:** 2-3 dias
**Prioridade:** 🟡 MÉDIA

---

### Resumo Fase 1: ESTOQUE

| Sub-fase | Esforço | Prioridade | Dependências |
|----------|---------|-----------|--------------|
| 1A: Produtos Duais | 5-6 dias | 🔴 CRÍTICA | Nenhuma |
| 1B: Estoque Reservado | 3-4 dias | 🔴 ALTA | 1A |
| 1C: Localização | 2 dias | 🟡 MÉDIA | 1A |
| 1D: Alertas | 2-3 dias | 🟡 MÉDIA | 1A, 1B |
| **TOTAL** | **12-15 dias** | | |

**Entrega:** Sistema de estoque completo com suporte a componentes e produtos finais, estoque reservado, e alertas avançados.

---

## FASE 2: P&D & DESENVOLVIMENTO DE PRODUTOS

### Objetivo
Permitir que a equipe de P&D crie produtos em desenvolvimento, defina BOM, e aprove produtos para produção.

### 2A: Produtos em Desenvolvimento

**Já feito na Fase 1A** (campo `status`).

Adicionar:
- Filtro de produtos por status na UI
- Dashboard de P&D mostrando produtos em cada fase
- Workflow visual (DEVELOPMENT → PRODUCTION → ACTIVE)

**Esforço:** 2 dias
**Prioridade:** 🟡 MÉDIA

---

### 2B: BOM (Bill of Materials)

#### Banco de Dados

**Criar tabela `bom_items`:**
```sql
CREATE TABLE bom_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  final_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_required DECIMAL(10, 4) NOT NULL CHECK (quantity_required > 0),
  waste_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (waste_percentage >= 0),
  effective_quantity DECIMAL(10, 4) GENERATED ALWAYS AS (quantity_required * (1 + waste_percentage / 100)) STORED,
  unit TEXT DEFAULT 'UN',
  notes TEXT,
  is_alternative BOOLEAN DEFAULT FALSE,
  alternative_to_id TEXT REFERENCES bom_items(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantir que produto final é FINAL e componente é COMPONENT
  CONSTRAINT bom_valid_types CHECK (
    (SELECT product_type FROM products WHERE id = final_product_id) = 'FINAL' AND
    (SELECT product_type FROM products WHERE id = component_id) = 'COMPONENT'
  )
);

CREATE INDEX idx_bom_product ON bom_items(final_product_id);
CREATE INDEX idx_bom_component ON bom_items(component_id);
```

**Trigger para recalcular custo do produto:**
```sql
CREATE OR REPLACE FUNCTION recalculate_product_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular custo do produto final baseado na BOM
  UPDATE products
  SET cost_price = (
    SELECT COALESCE(SUM(
      (SELECT cost_price FROM products WHERE id = bom.component_id) * bom.effective_quantity
    ), 0)
    FROM bom_items bom
    WHERE bom.final_product_id = NEW.final_product_id
      AND bom.is_alternative = FALSE
  ),
  updated_at = NOW()
  WHERE id = NEW.final_product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_cost_on_bom_change
AFTER INSERT OR UPDATE OR DELETE ON bom_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_product_cost();
```

#### Backend

**Criar `apps/api/src/repositories/bom.repository.ts`:**
```typescript
export class BomRepository {
  async findByProduct(productId: string) {
    const { data, error } = await supabase
      .from('bom_items')
      .select(`
        *,
        component:products!component_id(id, name, code, cost_price, current_stock, warehouse_location)
      `)
      .eq('final_product_id', productId)
      .order('created_at');

    if (error) throw error;
    return data;
  }

  async create(bomData: CreateBomItemDto) {
    // Validar que produto é FINAL
    const product = await supabase
      .from('products')
      .select('product_type')
      .eq('id', bomData.final_product_id)
      .single();

    if (product.data?.product_type !== 'FINAL') {
      throw new Error('BOM só pode ser criado para Produtos Finais');
    }

    const { data, error } = await supabase
      .from('bom_items')
      .insert(bomData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async checkAvailability(productId: string, quantityToProduce: number) {
    const bom = await this.findByProduct(productId);
    const availability = [];

    for (const item of bom) {
      const requiredQty = item.effective_quantity * quantityToProduce;
      const available = await stockReservationService.getAvailableStock(item.component_id);

      availability.push({
        component: item.component,
        required: requiredQty,
        available,
        sufficient: available >= requiredQty,
      });
    }

    return availability;
  }
}
```

#### Frontend

**Criar `apps/web/src/pages/BomFormPage.tsx`:**
```typescript
export function BomFormPage() {
  const { productId } = useParams();
  const [bomItems, setBomItems] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [waste, setWaste] = useState(0);

  const handleAddComponent = () => {
    // Adicionar componente à BOM
    api.post(`/bom`, {
      final_product_id: productId,
      component_id: selectedComponent,
      quantity_required: quantity,
      waste_percentage: waste,
    });
  };

  return (
    <div>
      <h1>BOM - Lista de Materiais</h1>

      {/* Tabela de componentes existentes */}
      <table>
        <thead>
          <tr>
            <th>Componente</th>
            <th>Qtd. por Unidade</th>
            <th>Desperdício %</th>
            <th>Qtd. Efetiva</th>
            <th>Custo Unit.</th>
            <th>Custo Total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {bomItems.map(item => (
            <tr key={item.id}>
              <td>{item.component.name}</td>
              <td>{item.quantity_required}</td>
              <td>{item.waste_percentage}%</td>
              <td>{item.effective_quantity}</td>
              <td>{formatCurrency(item.component.cost_price)}</td>
              <td>{formatCurrency(item.component.cost_price * item.effective_quantity)}</td>
              <td>
                <button onClick={() => handleDelete(item.id)}>Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}><strong>CUSTO TOTAL DO PRODUTO:</strong></td>
            <td><strong>{formatCurrency(calculateTotalCost(bomItems))}</strong></td>
          </tr>
        </tfoot>
      </table>

      {/* Formulário para adicionar componente */}
      <div className="mt-6 p-4 border rounded">
        <h3>Adicionar Componente</h3>
        <ComponentSelector
          value={selectedComponent}
          onChange={setSelectedComponent}
        />
        <input
          type="number"
          placeholder="Quantidade"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value))}
        />
        <input
          type="number"
          placeholder="Desperdício %"
          value={waste}
          onChange={(e) => setWaste(parseFloat(e.target.value))}
        />
        <button onClick={handleAddComponent}>Adicionar</button>
      </div>
    </div>
  );
}
```

**Esforço:** 8-10 dias
**Prioridade:** 🔴 CRÍTICA

---

### 2C: Versionamento

**Já incluído em Fase 1A** (campo `version`).

Adicionar:
- Histórico de versões (tabela `product_versions`)
- Changelog
- Comparação entre versões

**Esforço:** 3-4 dias
**Prioridade:** 🟡 MÉDIA

---

### 2D: Aprovação de Lançamento

#### Banco de Dados

```sql
CREATE TABLE product_approvals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES products(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  requested_by TEXT REFERENCES users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by TEXT REFERENCES users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes TEXT
);
```

#### Backend

```typescript
export class ProductApprovalService {
  async requestApproval(productId: string, toStatus: string, userId: string) {
    // Criar solicitação de aprovação
    const approval = await supabase
      .from('product_approvals')
      .insert({
        product_id: productId,
        from_status: currentStatus,
        to_status: toStatus,
        requested_by: userId,
      })
      .select()
      .single();

    // Notificar Director
    await notificationService.send({
      to_role: 'DIRECTOR',
      title: 'Aprovação de Produto Necessária',
      message: `Produto ${productName} aguarda aprovação para mudança de status`,
      link: `/products/${productId}/approval/${approval.data.id}`,
    });

    return approval.data;
  }

  async approve(approvalId: string, userId: string) {
    // Verificar se usuário é Director
    // Atualizar approval
    // Atualizar status do produto
    // Notificar solicitante
  }
}
```

**Esforço:** 4-5 dias
**Prioridade:** 🟡 MÉDIA

---

### Resumo Fase 2: P&D

| Sub-fase | Esforço | Prioridade | Dependências |
|----------|---------|-----------|--------------|
| 2A: Status Workflow | 2 dias | 🟡 MÉDIA | Fase 1A |
| 2B: BOM | 8-10 dias | 🔴 CRÍTICA | Fase 1A |
| 2C: Versionamento | 3-4 dias | 🟡 MÉDIA | Fase 1A |
| 2D: Aprovação | 4-5 dias | 🟡 MÉDIA | 2A |
| **TOTAL** | **17-21 dias** | | |

---

## FASE 3: COMPRAS & FORNECEDORES

*(Continua no próximo bloco...)*

Devido ao limite de tamanho, vou parar aqui. Quer que eu continue com:
1. **Fase 3: Compras completa**
2. **Fase 4: Produção completa**
3. **Cronograma de execução prático**
4. **Checklist de implementação**

**Ou prefere que eu crie um documento executivo resumido com os próximos passos práticos imediatos?**
