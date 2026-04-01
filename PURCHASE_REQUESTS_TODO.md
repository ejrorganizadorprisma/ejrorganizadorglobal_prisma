# Lista de Necessidades (Purchase Requests) - Tarefas Pendentes

## ✅ Completo
1. Estrutura do banco de dados (SQL pronto para executar)
2. Repository, Service, Controller (backend completo)
3. Rotas da API registradas
4. Tipos compartilhados (shared-types)

## ⏳ Pendente

### 1. Executar SQL no Supabase
Execute o arquivo `create-purchase-requests.sql` no SQL Editor do Supabase:
https://supabase.com/dashboard/project/iwmksgdjblluotkwqjlp/sql/new

### 2. Adicionar tipo às permissões

Arquivo: `packages/shared-types/src/models/permissions.ts`

Adicionar 'purchase_requests' à lista de AppPage:
```typescript
export type AppPage =
  | 'dashboard'
  | 'products'
  | 'customers'
  | 'quotes'
  | 'sales'
  | 'service_orders'
  | 'suppliers'
  | 'purchase_orders'
  | 'purchase_requests'  // ADICIONAR AQUI
  | 'goods_receipts'
  | ...
```

### 3. Criar hooks React

Arquivo: `apps/web/src/hooks/usePurchaseRequests.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  PurchaseRequest,
  CreatePurchaseRequestDTO,
  UpdatePurchaseRequestDTO,
  ReviewPurchaseRequestDTO,
  PurchaseRequestFilters,
} from '@ejr/shared-types';

export function usePurchaseRequests(filters?: PurchaseRequestFilters) {
  return useQuery({
    queryKey: ['purchase-requests', filters],
    queryFn: async () => {
      const { data } = await api.get('/purchase-requests', { params: filters });
      return data;
    },
  });
}

export function usePurchaseRequest(id?: string) {
  return useQuery({
    queryKey: ['purchase-requests', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-requests/${id}`);
      return data.data as PurchaseRequest;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseRequestDTO) => {
      const response = await api.post('/purchase-requests', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useUpdatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseRequestDTO }) => {
      const response = await api.put(`/purchase-requests/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useReviewPurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReviewPurchaseRequestDTO }) => {
      const response = await api.post(`/purchase-requests/${id}/review`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}

export function useConvertToPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/purchase-requests/${id}/convert`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useDeletePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/purchase-requests/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}
```

### 4. Adicionar ao Menu Sidebar

Arquivo: `apps/web/src/components/Sidebar.tsx`

Adicionar após a seção de Compras:
```typescript
{
  name: 'Lista de Necessidades',
  icon: <ClipboardList className="w-5 h-5" />,
  page: 'purchase_requests' as AppPage,
  submenu: [
    {
      name: 'Minhas Requisições',
      path: '/purchase-requests',
      icon: <ClipboardList className="w-4 h-4" />,
      page: 'purchase_requests' as AppPage
    },
    {
      name: 'Nova Requisição',
      path: '/purchase-requests/new',
      icon: <Plus className="w-4 h-4" />,
      page: 'purchase_requests' as AppPage
    },
  ],
},
```

Adicionar import: `import { ClipboardList, Plus } from 'lucide-react';`

### 5. Adicionar Rotas no App.tsx

Arquivo: `apps/web/src/App.tsx`

Adicionar após as rotas de purchase-orders:
```typescript
<Route
  path="/purchase-requests"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseRequestsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/purchase-requests/new"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseRequestFormPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/purchase-requests/:id"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseRequestDetailPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/purchase-requests/:id/edit"
  element={
    <ProtectedRoute>
      <MainLayout>
        <PurchaseRequestFormPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

Adicionar imports:
```typescript
import { PurchaseRequestsPage } from './pages/PurchaseRequestsPage';
import { PurchaseRequestFormPage } from './pages/PurchaseRequestFormPage';
import { PurchaseRequestDetailPage } from './pages/PurchaseRequestDetailPage';
```

### 6. Criar Páginas

As páginas devem seguir o padrão das páginas existentes (PurchaseOrdersPage, etc).

Estrutura básica:
- **PurchaseRequestsPage**: Lista com filtros (status, prioridade)
- **PurchaseRequestFormPage**: Formulário para criar/editar
- **PurchaseRequestDetailPage**: Visualização detalhada com botões de ação (aprovar/rejeitar/converter)

## Funcionalidades Principais

1. **Funcionários podem**:
   - Criar requisições de materiais
   - Ver suas próprias requisições
   - Editar requisições pendentes

2. **Admin pode**:
   - Ver todas as requisições
   - Aprovar ou rejeitar requisições
   - Converter requisições aprovadas em Ordens de Compra automaticamente
   - A conversão cria uma OC com todos os itens da requisição

3. **Status**:
   - PENDING: Aguardando aprovação
   - APPROVED: Aprovada (pode converter)
   - REJECTED: Rejeitada
   - CONVERTED: Convertida em OC
   - CANCELLED: Cancelada

## Observações Importantes

- Não deletar ou modificar código existente
- Seguir o padrão das páginas existentes
- Usar os componentes já existentes (botões, inputs, tabelas)
- Adicionar validações nos formulários
- Mostrar mensagens de sucesso/erro com toast
