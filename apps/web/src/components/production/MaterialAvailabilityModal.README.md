# MaterialAvailabilityModal

Modal de verificação de disponibilidade de materiais para Ordens de Produção no sistema ERP de manufatura.

## Descrição

Componente React que exibe uma análise detalhada da disponibilidade de materiais necessários para produzir um determinado produto em uma quantidade específica. O componente faz uma explosão da BOM (Bill of Materials) e verifica o estoque disponível para cada material.

## Funcionalidades

- Exibição de explosão de BOM com todos os materiais necessários
- Verificação automática de disponibilidade em estoque
- Indicador visual geral (Pode Produzir / Materiais Insuficientes)
- Tabela detalhada com:
  - Código do material
  - Nome do material
  - Quantidade necessária
  - Quantidade disponível
  - Quantidade faltante
  - Status visual (✓ Disponível / ⚠️ Insuficiente)
- Botão "Sugerir Compras" quando há materiais faltantes
- Loading state durante carregamento dos dados
- Design responsivo

## Props

```typescript
interface MaterialAvailabilityModalProps {
  /** Controla se o modal está aberto ou fechado */
  isOpen: boolean;

  /** Callback executado ao fechar o modal */
  onClose: () => void;

  /** ID do produto a verificar */
  productId: string;

  /** Nome do produto (exibido no cabeçalho) */
  productName: string;

  /** Quantidade planejada a produzir */
  quantity: number;

  /** Callback opcional para sugerir compras de materiais faltantes */
  onSuggestPurchases?: () => void;
}
```

## API Endpoint

O componente consome o seguinte endpoint:

```
GET /api/bom-analysis/check-availability/${productId}?quantity=${quantity}
```

### Resposta esperada

```typescript
interface AvailabilityResponse {
  canProduce: boolean;
  materials: MaterialItem[];
  totalItems: number;
  availableItems: number;
  missingItems: number;
}

interface MaterialItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantityRequired: number;
  quantityAvailable: number;
  quantityMissing: number;
  isAvailable: boolean;
}
```

## Uso Básico

```tsx
import { useState } from 'react';
import { MaterialAvailabilityModal } from '@/components/production';

function ProductionOrderPage() {
  const [showModal, setShowModal] = useState(false);

  const order = {
    productId: 'prod-123',
    productName: 'Produto Acabado XYZ',
    quantity: 10,
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Verificar Materiais
      </button>

      <MaterialAvailabilityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        productId={order.productId}
        productName={order.productName}
        quantity={order.quantity}
      />
    </>
  );
}
```

## Uso com Sugestão de Compras

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialAvailabilityModal } from '@/components/production';

function ProductionOrderPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleSuggestPurchases = () => {
    // Navegar para página de pedidos de compra com materiais faltantes
    navigate('/purchases/suggest', {
      state: {
        productId: 'prod-123',
        quantity: 10,
      }
    });
  };

  return (
    <MaterialAvailabilityModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      productId="prod-123"
      productName="Produto Acabado XYZ"
      quantity={10}
      onSuggestPurchases={handleSuggestPurchases}
    />
  );
}
```

## Estados Visuais

### Todos os Materiais Disponíveis
- Banner verde com ícone de check
- Mensagem positiva
- Tabela com todos os materiais marcados como disponíveis
- Botão "Sugerir Compras" não é exibido

### Materiais Insuficientes
- Banner amarelo com ícone de alerta
- Mensagem indicando quantidade de materiais faltantes
- Linhas da tabela com materiais faltantes destacadas em amarelo
- Botão "Sugerir Compras" é exibido (se callback fornecido)

### Carregando
- Spinner de loading centralizado
- Mensagem "Verificando disponibilidade de materiais..."

## Estilo e Design

### Cores
- **Verde** (#10B981): Materiais disponíveis
- **Amarelo** (#F59E0B): Materiais insuficientes
- **Cinza**: Texto e bordas neutras
- **Azul** (#2563EB): Ações e botões primários

### Ícones (lucide-react)
- `CheckCircle`: Status disponível
- `AlertCircle`: Status insuficiente
- `X`: Fechar modal
- `ShoppingCart`: Sugerir compras
- `Loader2`: Loading state

### Layout
- Modal centralizado com largura máxima de 4xl (896px)
- Altura máxima de 90vh com scroll interno
- Tabela responsiva com overflow horizontal
- Padding e spacing consistentes (Tailwind CSS)

## Integração com React Query

O componente utiliza React Query para buscar e cachear os dados:

```typescript
const { data: availability, isLoading } = useQuery({
  queryKey: ['bom-analysis', 'availability', productId, quantity],
  queryFn: async () => {
    const { data } = await api.get<{ data: AvailabilityResponse }>(
      `/bom-analysis/check-availability/${productId}`,
      { params: { quantity } }
    );
    return data.data;
  },
  enabled: isOpen && !!productId,
});
```

## Acessibilidade

- Modal com backdrop clicável para fechar
- Botão de fechar (X) visível e acessível
- Cores com contraste adequado
- Texto descritivo para screen readers
- Foco gerenciado apropriadamente

## Dependências

- `@tanstack/react-query`: ^5.12.0
- `lucide-react`: ^0.553.0
- `tailwindcss`: ^3.3.6

## Arquivos Relacionados

- `MaterialAvailabilityModal.tsx`: Componente principal
- `MaterialAvailabilityModal.example.tsx`: Exemplos de uso
- `MaterialAvailabilityChecker.tsx`: Componente inline de verificação
- `/hooks/useProductionOrders.ts`: Hooks relacionados

## Notas de Desenvolvimento

1. O modal só faz a requisição quando está aberto (`enabled: isOpen`)
2. Os dados são cacheados por `productId` e `quantity`
3. O componente é totalmente controlado (controlled component)
4. Suporta funcionalidade opcional de sugestão de compras
5. Design responsivo para mobile e desktop

## TODO / Melhorias Futuras

- [ ] Adicionar exportação para PDF/Excel
- [ ] Filtros para materiais (disponíveis/faltantes)
- [ ] Ordenação da tabela por coluna
- [ ] Gráfico visual de disponibilidade
- [ ] Histórico de verificações anteriores
- [ ] Integração direta com criação de pedidos de compra
