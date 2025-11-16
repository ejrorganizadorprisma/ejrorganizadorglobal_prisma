# 🏗️ ARQUITETURA FULLSTACK - EJR ORGANIZADOR

**Projeto:** EJR Organizador - Sistema de Gestão Empresarial
**Versão:** 1.0
**Data:** 15 de Novembro de 2025
**Arquiteto:** Winston (BMad Framework)
**Baseado em:** PRD v4 com 64 User Stories

---

## 📑 ÍNDICE

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Stack Tecnológico Completo](#2-stack-tecnológico-completo)
3. [Modelos de Dados](#3-modelos-de-dados)
4. [Especificação de API](#4-especificação-de-api)
5. [Arquitetura Frontend](#5-arquitetura-frontend)
6. [Arquitetura Backend](#6-arquitetura-backend)
7. [Estrutura do Monorepo](#7-estrutura-do-monorepo)
8. [Schema do Banco de Dados](#8-schema-do-banco-de-dados)
9. [Arquitetura de Segurança](#9-arquitetura-de-segurança)
10. [Automação e Jobs](#10-automação-e-jobs)
11. [Performance e Otimização](#11-performance-e-otimização)
12. [Arquitetura de Deploy](#12-arquitetura-de-deploy)
13. [Estratégia de Testes](#13-estratégia-de-testes)
14. [Padrões de Código](#14-padrões-de-código)
15. [Tratamento de Erros](#15-tratamento-de-erros)
16. [Monitoramento e Observabilidade](#16-monitoramento-e-observabilidade)

---

## 1. VISÃO GERAL DA ARQUITETURA

### 1.1 Decisão de Plataforma

**Escolha:** Aplicação Web Fullstack hospedada em VPS Linux

**Justificativa:**
- ✅ **Controle Total**: Sem limitações de serverless ou PaaS
- ✅ **Custo Previsível**: R$ 200-400/mês vs. custos variáveis de cloud
- ✅ **Customização**: Acesso SSH completo para jobs, backups e integrações
- ✅ **Performance**: Latência consistente para operações críticas
- ✅ **Adequação ao Porte**: 10 usuários simultâneos não justifica Kubernetes

### 1.2 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                         │
│  - Servir frontend estático (React build)                        │
│  - Proxy /api/* → Backend Express                                │
│  - SSL/TLS (Let's Encrypt)                                       │
│  - Rate limiting                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   FRONTEND (React SPA)  │   │  BACKEND (Express API)  │
│   - React 18 + TS       │   │  - Node.js 20 + TS      │
│   - TanStack Query      │   │  - Prisma ORM           │
│   - Tailwind CSS        │   │  - JWT Auth             │
│   - Vite build          │   │  - REST endpoints       │
│   Port: 5173 (dev)      │   │  Port: 3000             │
└─────────────────────────┘   └───────────┬─────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────┐
                            │   PostgreSQL 15+        │
                            │   - Primary datastore   │
                            │   - ACID compliance     │
                            │   - Full-text search    │
                            │   Port: 5432            │
                            └─────────────────────────┘
```

### 1.3 Padrão Arquitetural

**Backend:** Arquitetura em Camadas (Layered Architecture)

```
┌────────────────────────────────────────┐
│         Routes (HTTP Layer)            │  ← Express routers
├────────────────────────────────────────┤
│       Controllers (API Layer)          │  ← Request/Response handling
├────────────────────────────────────────┤
│      Services (Business Logic)         │  ← Core business rules
├────────────────────────────────────────┤
│    Repositories (Data Access)          │  ← Prisma queries
├────────────────────────────────────────┤
│         Database (PostgreSQL)          │  ← Persistent storage
└────────────────────────────────────────┘
```

**Frontend:** Component-Based Architecture

```
┌────────────────────────────────────────┐
│           Pages (Routed)               │  ← React Router pages
├────────────────────────────────────────┤
│        Features (Domain)               │  ← Feature-based modules
├────────────────────────────────────────┤
│      Components (Reusable)             │  ← Shared UI components
├────────────────────────────────────────┤
│         Hooks & Utils                  │  ← Logic abstraction
├────────────────────────────────────────┤
│    State Management (TanStack Query)   │  ← Server state cache
└────────────────────────────────────────┘
```

---

## 2. STACK TECNOLÓGICO COMPLETO

### 2.1 Resumo Executivo

| Camada | Tecnologia Principal | Versão | Justificativa |
|--------|---------------------|--------|---------------|
| **Frontend** | React + TypeScript | 18+ | Ecossistema maduro, type safety |
| **Build Tool** | Vite | 5+ | Build rápido, HMR eficiente |
| **Backend** | Node.js + Express | 20 LTS + 4.18 | Performance, maturidade |
| **ORM** | Prisma | 5+ | Type-safe, migrations, ótima DX |
| **Database** | PostgreSQL | 15+ | Relacional, ACID, JSON support |
| **Auth** | JWT + Bcrypt | - | Stateless, seguro |
| **Monorepo** | pnpm workspaces | 8+ | Eficiência de espaço e cache |

### 2.2 Dependências Detalhadas

#### Frontend (`apps/web/package.json`)

```json
{
  "name": "@ejr/web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.12.0",
    "@tanstack/react-table": "^8.10.0",
    "axios": "^1.6.2",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.295.0",
    "react-hook-form": "^7.48.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "recharts": "^2.10.0",
    "sonner": "^1.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0"
  }
}
```

#### Backend (`apps/api/package.json`)

```json
{
  "name": "@ejr/api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.6",
    "zod": "^3.22.4",
    "@prisma/client": "^5.7.0",
    "nodemailer": "^6.9.7",
    "puppeteer": "^21.6.0",
    "node-cron": "^3.0.3",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cookie-parser": "^1.4.6",
    "@types/node": "^20.10.5",
    "@types/nodemailer": "^6.4.14",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "prisma": "^5.7.0",
    "eslint": "^8.55.0"
  }
}
```

#### Shared Types (`packages/shared-types/package.json`)

```json
{
  "name": "@ejr/shared-types",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

---

## 3. MODELOS DE DADOS

### 3.1 Entidades Core (TypeScript Interfaces)

#### User (Usuário)

```typescript
// packages/shared-types/src/models/user.ts

import { z } from 'zod';

export enum UserRole {
  OWNER = 'OWNER',          // Dono - Dashboard executivo
  DIRECTOR = 'DIRECTOR',    // Diretor - Controle total
  MANAGER = 'MANAGER',      // Gerente - Operações
  SALESPERSON = 'SALESPERSON', // Vendedor
  STOCK = 'STOCK',          // Estoquista
  TECHNICIAN = 'TECHNICIAN' // Técnico
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  allowedHours?: {
    start: string; // "08:00"
    end: string;   // "18:00"
  };
  createdAt: Date;
  updatedAt: Date;
}

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.nativeEnum(UserRole),
  allowedHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }).optional()
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
```

#### Product (Produto)

```typescript
// packages/shared-types/src/models/product.ts

import { z } from 'zod';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
}

export interface Product {
  id: string;
  code: string;              // Código interno único
  name: string;
  category: string;
  manufacturer?: string;
  costPrice: number;         // Preço de custo (centavos)
  salePrice: number;         // Preço de venda (centavos)
  technicalDescription?: string;
  commercialDescription?: string;
  warrantyMonths: number;
  currentStock: number;
  minimumStock: number;
  status: ProductStatus;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const CreateProductSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  category: z.string().min(1),
  manufacturer: z.string().optional(),
  costPrice: z.number().int().positive(),
  salePrice: z.number().int().positive(),
  technicalDescription: z.string().optional(),
  commercialDescription: z.string().optional(),
  warrantyMonths: z.number().int().min(0).default(0),
  minimumStock: z.number().int().min(0).default(5),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE)
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;
```

#### Customer (Cliente)

```typescript
// packages/shared-types/src/models/customer.ts

import { z } from 'zod';

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',  // CPF
  BUSINESS = 'BUSINESS'       // CNPJ
}

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  document: string;          // CPF ou CNPJ
  email?: string;
  phone?: string;
  address?: Address;
  portalAccess?: {
    username: string;
    passwordHash: string;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export const CreateCustomerSchema = z.object({
  type: z.nativeEnum(CustomerType),
  name: z.string().min(2),
  document: z.string().regex(/^\d{11}$|^\d{14}$/), // CPF ou CNPJ
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    district: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/)
  }).optional(),
  enablePortalAccess: z.boolean().optional()
});

export type CreateCustomerDTO = z.infer<typeof CreateCustomerSchema>;
```

#### Quote (Orçamento)

```typescript
// packages/shared-types/src/models/quote.ts

import { z } from 'zod';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED'  // Convertido em pedido
}

export interface Quote {
  id: string;
  quoteNumber: string;       // QOT-2025-0001
  customerId: string;
  customer?: Customer;
  items: QuoteItem[];
  subtotal: number;          // centavos
  discount: number;          // centavos
  total: number;             // centavos
  status: QuoteStatus;
  validUntil: Date;
  notes?: string;
  responsibleUserId: string;
  responsibleUser?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;         // centavos (preço no momento do orçamento)
  total: number;             // quantity * unitPrice
}

export const CreateQuoteSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().positive()
  })).min(1),
  discount: z.number().int().min(0).default(0),
  validUntil: z.string().datetime(),
  notes: z.string().optional()
});

export type CreateQuoteDTO = z.infer<typeof CreateQuoteSchema>;
```

#### Order (Pedido)

```typescript
// packages/shared-types/src/models/order.ts

import { z } from 'zod';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  orderNumber: string;       // ORD-2025-0001
  customerId: string;
  customer?: Customer;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  quoteId?: string;          // Se criado a partir de orçamento
  quote?: Quote;
  responsibleUserId: string;
  responsibleUser?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().positive()
  })).min(1),
  discount: z.number().int().min(0).default(0),
  quoteId: z.string().uuid().optional()
});

export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;
```

#### InventoryMovement (Movimentação de Estoque)

```typescript
// packages/shared-types/src/models/inventory.ts

import { z } from 'zod';

export enum MovementType {
  PURCHASE = 'PURCHASE',           // Compra
  SALE = 'SALE',                   // Venda
  RETURN = 'RETURN',               // Devolução
  ADJUSTMENT = 'ADJUSTMENT',       // Ajuste manual
  TRANSFER = 'TRANSFER',           // Transferência
  LOSS = 'LOSS',                   // Perda
  MAINTENANCE_OUT = 'MAINTENANCE_OUT',  // Saída para manutenção
  MAINTENANCE_IN = 'MAINTENANCE_IN'     // Retorno de manutenção
}

export interface InventoryMovement {
  id: string;
  productId: string;
  product?: Product;
  type: MovementType;
  quantity: number;              // Positivo = entrada, Negativo = saída
  reason?: string;
  referenceId?: string;          // ID do pedido, ordem de serviço, etc.
  previousStock: number;
  newStock: number;
  userId: string;
  user?: User;
  createdAt: Date;
}

export const CreateMovementSchema = z.object({
  productId: z.string().uuid(),
  type: z.nativeEnum(MovementType),
  quantity: z.number().int(),
  reason: z.string().optional(),
  referenceId: z.string().uuid().optional()
});

export type CreateMovementDTO = z.infer<typeof CreateMovementSchema>;
```

#### Alert (Alerta)

```typescript
// packages/shared-types/src/models/alert.ts

import { z } from 'zod';

export enum AlertType {
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  REORDER_SUGGESTION = 'REORDER_SUGGESTION',
  HIGH_SALES_VELOCITY = 'HIGH_SALES_VELOCITY',
  SYSTEM = 'SYSTEM'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId?: string;
  product?: Product;
  isRead: boolean;
  readAt?: Date;
  readByUserId?: string;
  createdAt: Date;
}

export const MarkAlertReadSchema = z.object({
  alertId: z.string().uuid()
});

export type MarkAlertReadDTO = z.infer<typeof MarkAlertReadSchema>;
```

#### ServiceOrder (Ordem de Serviço / Manutenção)

```typescript
// packages/shared-types/src/models/service.ts

import { z } from 'zod';

export enum ServiceOrderStatus {
  RECEIVED = 'RECEIVED',
  DIAGNOSING = 'DIAGNOSING',
  AWAITING_PARTS = 'AWAITING_PARTS',
  IN_REPAIR = 'IN_REPAIR',
  TESTING = 'TESTING',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum WarrantyType {
  IN_WARRANTY = 'IN_WARRANTY',
  OUT_OF_WARRANTY = 'OUT_OF_WARRANTY'
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;       // SRV-2025-0001
  customerId: string;
  customer?: Customer;
  productId: string;
  product?: Product;
  warrantyType: WarrantyType;
  receivedAt: Date;
  estimatedDelivery?: Date;
  completedAt?: Date;
  deliveredAt?: Date;
  status: ServiceOrderStatus;
  diagnosis?: string;
  servicesPerformed?: string;
  partsUsed: ServicePart[];
  laborCost: number;         // centavos
  partsCost: number;         // centavos
  totalCost: number;         // centavos
  technicianUserId: string;
  technicianUser?: User;
  attachments: string[];     // URLs de fotos/documentos
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicePart {
  id: string;
  serviceOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  total: number;
}

export const CreateServiceOrderSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  warrantyType: z.nativeEnum(WarrantyType),
  estimatedDelivery: z.string().datetime().optional(),
  diagnosis: z.string().optional()
});

export type CreateServiceOrderDTO = z.infer<typeof CreateServiceOrderSchema>;
```

#### AuditLog (Log de Auditoria)

```typescript
// packages/shared-types/src/models/audit.ts

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  EXPORT = 'EXPORT'
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: User;
  action: AuditAction;
  entity: string;            // 'User', 'Product', 'Order', etc.
  entityId?: string;
  changes?: Record<string, any>;  // JSON com mudanças
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
```

#### TimeEntry (Ponto Eletrônico)

```typescript
// packages/shared-types/src/models/time-entry.ts

import { z } from 'zod';

export enum EntryType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT'
}

export interface TimeEntry {
  id: string;
  userId: string;
  user?: User;
  type: EntryType;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  isLate: boolean;
  justification?: string;
  createdAt: Date;
}

export const CreateTimeEntrySchema = z.object({
  type: z.nativeEnum(EntryType),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  justification: z.string().optional()
});

export type CreateTimeEntryDTO = z.infer<typeof CreateTimeEntrySchema>;
```

---

## 4. ESPECIFICAÇÃO DE API

### 4.1 Convenções Gerais

**Base URL:** `http://localhost:3000/api/v1` (dev) | `https://ejr.exemplo.com/api/v1` (prod)

**Headers Padrão:**
```
Content-Type: application/json
Authorization: Bearer <token> (opcional, depende do endpoint)
Cookie: token=<jwt> (autenticação via HTTP-only cookie)
```

**Formato de Resposta de Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Formato de Resposta de Erro:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email"
      }
    ]
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Sucesso em GET, PATCH, PUT
- `201 Created` - Sucesso em POST
- `204 No Content` - Sucesso em DELETE
- `400 Bad Request` - Erro de validação
- `401 Unauthorized` - Não autenticado
- `403 Forbidden` - Sem permissão
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito (ex: email duplicado)
- `429 Too Many Requests` - Rate limit excedido
- `500 Internal Server Error` - Erro do servidor

### 4.2 Endpoints por Módulo

#### 4.2.1 Autenticação (`/auth`)

**POST /api/v1/auth/login**
```typescript
Request Body:
{
  email: string;
  password: string;
}

Response (200):
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    },
    token: string; // JWT (também enviado como HTTP-only cookie)
  }
}

Errors:
- 401: Invalid credentials
- 403: User inactive or outside allowed hours
```

**POST /api/v1/auth/logout**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  message: "Logged out successfully"
}
```

**GET /api/v1/auth/me**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    allowedHours?: { start: string; end: string; }
  }
}

Errors:
- 401: Invalid or expired token
```

#### 4.2.2 Usuários (`/users`)

**GET /api/v1/users**
```typescript
Headers: Authorization: Bearer <token>
Permissions: OWNER, DIRECTOR, MANAGER

Query Params:
- page?: number (default: 1)
- limit?: number (default: 20, max: 100)
- role?: UserRole
- isActive?: boolean

Response (200):
{
  success: true,
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
}
```

**POST /api/v1/users**
```typescript
Headers: Authorization: Bearer <token>
Permissions: OWNER, DIRECTOR

Request Body:
{
  email: string;
  password: string;
  name: string;
  role: UserRole;
  allowedHours?: {
    start: string; // "08:00"
    end: string;   // "18:00"
  }
}

Response (201):
{
  success: true,
  data: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
  }
}

Errors:
- 400: Validation error
- 409: Email already exists
```

**PATCH /api/v1/users/:id**
```typescript
Headers: Authorization: Bearer <token>
Permissions: OWNER, DIRECTOR

Request Body (all fields optional):
{
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  allowedHours?: {
    start: string;
    end: string;
  }
}

Response (200):
{
  success: true,
  data: User
}
```

#### 4.2.3 Produtos (`/products`)

**GET /api/v1/products**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- search?: string (busca em name, code, category)
- category?: string
- status?: ProductStatus
- inStock?: boolean (currentStock > 0)

Response (200):
{
  success: true,
  data: {
    products: Product[];
    pagination: PaginationMeta;
  }
}
```

**GET /api/v1/products/:id**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: Product & {
    movements: InventoryMovement[]; // Últimas 10 movimentações
    alerts: Alert[]; // Alertas ativos deste produto
  }
}
```

**POST /api/v1/products**
```typescript
Headers: Authorization: Bearer <token>
Permissions: MANAGER, DIRECTOR, OWNER

Request Body:
{
  code: string;
  name: string;
  category: string;
  manufacturer?: string;
  costPrice: number; // centavos
  salePrice: number; // centavos
  technicalDescription?: string;
  commercialDescription?: string;
  warrantyMonths?: number;
  minimumStock?: number;
}

Response (201):
{
  success: true,
  data: Product
}
```

**PATCH /api/v1/products/:id**
```typescript
Headers: Authorization: Bearer <token>
Permissions: MANAGER, DIRECTOR, OWNER

Request Body (all optional):
{
  name?: string;
  costPrice?: number;
  salePrice?: number;
  minimumStock?: number;
  status?: ProductStatus;
  // ... outros campos
}

Response (200):
{
  success: true,
  data: Product
}
```

**GET /api/v1/products/low-stock**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: {
    products: Array<Product & {
      percentageOfMinimum: number; // ex: 50 se tem metade do mínimo
      suggestedReorder: number; // quantidade sugerida de reposição
    }>
  }
}
```

#### 4.2.4 Clientes (`/customers`)

**GET /api/v1/customers**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- search?: string (busca em name, email, document)
- type?: CustomerType

Response (200):
{
  success: true,
  data: {
    customers: Customer[];
    pagination: PaginationMeta;
  }
}
```

**GET /api/v1/customers/:id**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: Customer & {
    quotes: Quote[]; // Últimos orçamentos
    orders: Order[]; // Últimos pedidos
    serviceOrders: ServiceOrder[]; // Manutenções
    totalPurchases: number; // centavos
    lastPurchase?: Date;
  }
}
```

**POST /api/v1/customers**
```typescript
Headers: Authorization: Bearer <token>
Permissions: SALESPERSON, MANAGER, DIRECTOR, OWNER

Request Body:
{
  type: CustomerType;
  name: string;
  document: string; // CPF ou CNPJ
  email?: string;
  phone?: string;
  address?: Address;
  enablePortalAccess?: boolean;
}

Response (201):
{
  success: true,
  data: Customer & {
    portalCredentials?: {
      username: string;
      tempPassword: string; // Senha temporária gerada
    }
  }
}
```

**PATCH /api/v1/customers/:id**
```typescript
Headers: Authorization: Bearer <token>
Permissions: SALESPERSON, MANAGER, DIRECTOR, OWNER

Request Body (all optional):
{
  name?: string;
  email?: string;
  phone?: string;
  address?: Address;
}

Response (200):
{
  success: true,
  data: Customer
}
```

#### 4.2.5 Orçamentos (`/quotes`)

**GET /api/v1/quotes**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- status?: QuoteStatus
- customerId?: string
- dateFrom?: string (ISO date)
- dateTo?: string (ISO date)

Response (200):
{
  success: true,
  data: {
    quotes: Quote[];
    pagination: PaginationMeta;
  }
}
```

**GET /api/v1/quotes/:id**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: Quote & {
    customer: Customer;
    items: (QuoteItem & { product: Product })[];
    responsibleUser: User;
  }
}
```

**POST /api/v1/quotes**
```typescript
Headers: Authorization: Bearer <token>
Permissions: SALESPERSON, MANAGER, DIRECTOR, OWNER

Request Body:
{
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number; // centavos
  }>;
  discount?: number; // centavos
  validUntil: string; // ISO datetime
  notes?: string;
}

Response (201):
{
  success: true,
  data: Quote
}
```

**PATCH /api/v1/quotes/:id**
```typescript
Headers: Authorization: Bearer <token>
Permissions: SALESPERSON, MANAGER, DIRECTOR, OWNER

Request Body (all optional):
{
  items?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount?: number;
  validUntil?: string;
  notes?: string;
  status?: QuoteStatus;
}

Response (200):
{
  success: true,
  data: Quote
}
```

**POST /api/v1/quotes/:id/pdf**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: {
    pdfUrl: string; // URL temporária do PDF gerado
  }
}
```

**POST /api/v1/quotes/:id/send**
```typescript
Headers: Authorization: Bearer <token>

Request Body:
{
  method: 'email' | 'whatsapp';
  recipient?: string; // Email ou telefone (usa do cliente se não fornecido)
}

Response (200):
{
  success: true,
  data: {
    sentTo: string;
    sentAt: string;
    method: string;
  }
}
```

**POST /api/v1/quotes/:id/convert-to-order**
```typescript
Headers: Authorization: Bearer <token>
Permissions: SALESPERSON, MANAGER, DIRECTOR, OWNER

Response (201):
{
  success: true,
  data: {
    order: Order;
    quote: Quote; // Com status = CONVERTED
  }
}
```

#### 4.2.6 Pedidos (`/orders`)

**GET /api/v1/orders**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- status?: OrderStatus
- customerId?: string
- dateFrom?: string
- dateTo?: string

Response (200):
{
  success: true,
  data: {
    orders: Order[];
    pagination: PaginationMeta;
  }
}
```

**GET /api/v1/orders/:id**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: Order & {
    customer: Customer;
    items: (OrderItem & { product: Product })[];
    responsibleUser: User;
    quote?: Quote;
  }
}
```

**POST /api/v1/orders**
```typescript
Headers: Authorization: Bearer <token>
Permissions: SALESPERSON, MANAGER, DIRECTOR, OWNER

Request Body:
{
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount?: number;
  quoteId?: string; // Se criado a partir de orçamento
}

Response (201):
{
  success: true,
  data: Order
}
```

**PATCH /api/v1/orders/:id/status**
```typescript
Headers: Authorization: Bearer <token>
Permissions: MANAGER, DIRECTOR, OWNER

Request Body:
{
  status: OrderStatus;
}

Response (200):
{
  success: true,
  data: Order
}

Side Effects:
- Se status = CONFIRMED, cria movimentações de estoque (SALE)
- Atualiza currentStock dos produtos
- Cria alertas se estoque ficar abaixo do mínimo
```

#### 4.2.7 Estoque (`/inventory`)

**GET /api/v1/inventory/movements**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- productId?: string
- type?: MovementType
- dateFrom?: string
- dateTo?: string

Response (200):
{
  success: true,
  data: {
    movements: (InventoryMovement & {
      product: Product;
      user: User;
    })[];
    pagination: PaginationMeta;
  }
}
```

**POST /api/v1/inventory/movements**
```typescript
Headers: Authorization: Bearer <token>
Permissions: STOCK, MANAGER, DIRECTOR, OWNER

Request Body:
{
  productId: string;
  type: MovementType;
  quantity: number; // Positivo = entrada, Negativo = saída
  reason?: string;
  referenceId?: string;
}

Response (201):
{
  success: true,
  data: InventoryMovement & {
    product: Product; // Com currentStock atualizado
    alertsCreated: Alert[]; // Se gerou alertas de estoque baixo
  }
}
```

**GET /api/v1/inventory/summary**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: {
    totalValue: number; // centavos (soma de currentStock * costPrice)
    totalItems: number; // soma de currentStock
    totalSKUs: number; // produtos únicos
    lowStockCount: number;
    outOfStockCount: number;
    byCategory: Array<{
      category: string;
      totalValue: number;
      totalItems: number;
      skuCount: number;
    }>
  }
}
```

#### 4.2.8 Alertas (`/alerts`)

**GET /api/v1/alerts**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- type?: AlertType
- severity?: AlertSeverity
- isRead?: boolean
- productId?: string

Response (200):
{
  success: true,
  data: {
    alerts: (Alert & { product?: Product })[];
    pagination: PaginationMeta;
    unreadCount: number;
  }
}
```

**PATCH /api/v1/alerts/:id/read**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: Alert
}
```

**PATCH /api/v1/alerts/mark-all-read**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: {
    markedCount: number;
  }
}
```

#### 4.2.9 Ordens de Serviço (`/service-orders`)

**GET /api/v1/service-orders**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- page?: number
- limit?: number
- status?: ServiceOrderStatus
- customerId?: string
- warrantyType?: WarrantyType
- technicianUserId?: string

Response (200):
{
  success: true,
  data: {
    serviceOrders: ServiceOrder[];
    pagination: PaginationMeta;
  }
}
```

**GET /api/v1/service-orders/:id**
```typescript
Headers: Authorization: Bearer <token>

Response (200):
{
  success: true,
  data: ServiceOrder & {
    customer: Customer;
    product: Product;
    technicianUser: User;
    partsUsed: (ServicePart & { product: Product })[];
  }
}
```

**POST /api/v1/service-orders**
```typescript
Headers: Authorization: Bearer <token>
Permissions: TECHNICIAN, MANAGER, DIRECTOR, OWNER

Request Body:
{
  customerId: string;
  productId: string;
  warrantyType: WarrantyType;
  estimatedDelivery?: string; // ISO datetime
  diagnosis?: string;
}

Response (201):
{
  success: true,
  data: ServiceOrder
}

Side Effects:
- Cria movimentação MAINTENANCE_OUT se produto estiver em estoque
```

**PATCH /api/v1/service-orders/:id**
```typescript
Headers: Authorization: Bearer <token>
Permissions: TECHNICIAN, MANAGER, DIRECTOR, OWNER

Request Body (all optional):
{
  status?: ServiceOrderStatus;
  diagnosis?: string;
  servicesPerformed?: string;
  estimatedDelivery?: string;
  laborCost?: number; // centavos
  partsUsed?: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

Response (200):
{
  success: true,
  data: ServiceOrder
}

Side Effects:
- Se status = COMPLETED, cria movimentação MAINTENANCE_IN
- Se partsUsed adicionado, cria movimentações de estoque
```

#### 4.2.10 Ponto Eletrônico (`/time-entries`)

**GET /api/v1/time-entries**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- userId?: string (OWNER/DIRECTOR pode ver todos, outros só próprios)
- dateFrom?: string (ISO date)
- dateTo?: string (ISO date)
- type?: EntryType

Response (200):
{
  success: true,
  data: {
    entries: (TimeEntry & { user: User })[];
    summary: {
      totalHours: number;
      daysWorked: number;
      lateEntries: number;
    }
  }
}
```

**POST /api/v1/time-entries**
```typescript
Headers: Authorization: Bearer <token>

Request Body:
{
  type: EntryType; // CLOCK_IN ou CLOCK_OUT
  location?: {
    latitude: number;
    longitude: number;
  };
  justification?: string; // Se chegou atrasado
}

Response (201):
{
  success: true,
  data: TimeEntry & {
    isLate: boolean;
    expectedTime?: string; // Horário esperado baseado em allowedHours
  }
}

Errors:
- 400: Duplicate entry (já registrou entrada hoje)
- 403: Outside allowed hours (sem justificativa)
```

#### 4.2.11 Dashboard (`/dashboard`)

**GET /api/v1/dashboard/overview**
```typescript
Headers: Authorization: Bearer <token>

Response (200) - varia por role:
{
  success: true,
  data: {
    // OWNER:
    revenue: { today: number, week: number, month: number };
    profit: { today: number, week: number, month: number };
    salesCount: { today: number, week: number, month: number };
    topProducts: Array<{ product: Product, revenue: number }>;
    alerts: { critical: number, warning: number };

    // DIRECTOR:
    + stockValue: number;
    + lowStockProducts: number;
    + pendingOrders: number;
    + teamPerformance: Array<{ user: User, salesCount: number, revenue: number }>;

    // MANAGER:
    + inventoryTurnover: number;
    + pendingQuotes: number;
    + serviceOrdersOpen: number;

    // SALESPERSON:
    myQuotes: { pending: number, approved: number };
    myOrders: { pending: number, completed: number };
    myRevenue: { week: number, month: number };

    // STOCK:
    movementsToday: number;
    lowStockAlerts: number;
    recentMovements: InventoryMovement[];

    // TECHNICIAN:
    myServiceOrders: { open: number, inProgress: number, completed: number };
    pendingDiagnosis: number;
    avgRepairTime: number; // horas
  }
}
```

**GET /api/v1/dashboard/charts/sales**
```typescript
Headers: Authorization: Bearer <token>

Query Params:
- period: 'day' | 'week' | 'month' | 'year'
- dateFrom?: string
- dateTo?: string

Response (200):
{
  success: true,
  data: {
    chartData: Array<{
      date: string;
      revenue: number;
      orders: number;
      profit: number;
    }>
  }
}
```

#### 4.2.12 Relatórios (`/reports`)

**GET /api/v1/reports/sales**
```typescript
Headers: Authorization: Bearer <token>
Permissions: MANAGER, DIRECTOR, OWNER

Query Params:
- dateFrom: string (required)
- dateTo: string (required)
- customerId?: string
- productId?: string
- format?: 'json' | 'csv' | 'pdf' (default: json)

Response (200):
{
  success: true,
  data: {
    summary: {
      totalOrders: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      averageTicket: number;
    },
    orders: Order[];
  }
}

// Se format=csv ou pdf, retorna arquivo para download
```

**GET /api/v1/reports/inventory**
```typescript
Headers: Authorization: Bearer <token>
Permissions: MANAGER, DIRECTOR, OWNER

Query Params:
- category?: string
- format?: 'json' | 'csv' | 'pdf'

Response (200):
{
  success: true,
  data: {
    summary: {
      totalValue: number;
      totalItems: number;
      totalSKUs: number;
    },
    products: Array<Product & {
      stockValue: number; // currentStock * costPrice
    }>
  }
}
```

**GET /api/v1/reports/profit-margin**
```typescript
Headers: Authorization: Bearer <token>
Permissions: MANAGER, DIRECTOR, OWNER

Query Params:
- dateFrom: string
- dateTo: string
- groupBy?: 'product' | 'category' | 'customer'

Response (200):
{
  success: true,
  data: {
    overall: {
      revenue: number;
      cost: number;
      profit: number;
      margin: number; // porcentagem
    },
    breakdown: Array<{
      id: string;
      name: string;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>
  }
}
```

#### 4.2.13 Backup (`/backup`)

**POST /api/v1/backup/create**
```typescript
Headers: Authorization: Bearer <token>
Permissions: OWNER, DIRECTOR

Response (202 Accepted):
{
  success: true,
  data: {
    jobId: string;
    message: "Backup job started"
  }
}

// Job roda em background, notifica via email quando completo
```

**GET /api/v1/backup/list**
```typescript
Headers: Authorization: Bearer <token>
Permissions: OWNER, DIRECTOR

Response (200):
{
  success: true,
  data: {
    backups: Array<{
      id: string;
      filename: string;
      size: number; // bytes
      createdAt: string;
      downloadUrl: string; // URL temporária
    }>
  }
}
```

**POST /api/v1/backup/restore**
```typescript
Headers: Authorization: Bearer <token>
Permissions: OWNER

Request Body:
{
  backupId: string;
}

Response (202 Accepted):
{
  success: true,
  data: {
    jobId: string;
    message: "Restore job started - system will be unavailable"
  }
}

// Sistema entra em modo manutenção durante restore
```

---

## 5. ARQUITETURA FRONTEND

### 5.1 Estrutura de Diretórios

```
apps/web/
├── public/
│   ├── favicon.ico
│   └── logo.png
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root component com router
│   ├── vite-env.d.ts
│   │
│   ├── pages/                   # Páginas roteadas
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── products/
│   │   │   ├── ProductsListPage.tsx
│   │   │   ├── ProductDetailPage.tsx
│   │   │   └── ProductFormPage.tsx
│   │   ├── customers/
│   │   │   ├── CustomersListPage.tsx
│   │   │   ├── CustomerDetailPage.tsx
│   │   │   └── CustomerFormPage.tsx
│   │   ├── quotes/
│   │   │   ├── QuotesListPage.tsx
│   │   │   ├── QuoteDetailPage.tsx
│   │   │   └── QuoteFormPage.tsx
│   │   ├── orders/
│   │   │   ├── OrdersListPage.tsx
│   │   │   ├── OrderDetailPage.tsx
│   │   │   └── OrderFormPage.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── MovementsPage.tsx
│   │   │   └── AdjustmentPage.tsx
│   │   ├── service-orders/
│   │   │   ├── ServiceOrdersListPage.tsx
│   │   │   ├── ServiceOrderDetailPage.tsx
│   │   │   └── ServiceOrderFormPage.tsx
│   │   ├── reports/
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── SalesReportPage.tsx
│   │   │   └── InventoryReportPage.tsx
│   │   ├── users/
│   │   │   ├── UsersListPage.tsx
│   │   │   └── UserFormPage.tsx
│   │   ├── time-clock/
│   │   │   └── TimeClockPage.tsx
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   │
│   ├── components/              # Componentes reutilizáveis
│   │   ├── ui/                  # Componentes básicos de UI
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Alert.tsx
│   │   ├── layout/              # Componentes de layout
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── forms/               # Componentes de formulário
│   │   │   ├── FormField.tsx
│   │   │   ├── FormError.tsx
│   │   │   └── DatePicker.tsx
│   │   ├── charts/              # Componentes de gráficos
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── PieChart.tsx
│   │   └── domain/              # Componentes específicos do domínio
│   │       ├── ProductCard.tsx
│   │       ├── OrderStatusBadge.tsx
│   │       ├── AlertsList.tsx
│   │       └── QuoteItemsTable.tsx
│   │
│   ├── features/                # Módulos por feature (opcional)
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useLogin.ts
│   │   │   └── components/
│   │   │       └── LoginForm.tsx
│   │   ├── products/
│   │   │   ├── hooks/
│   │   │   │   ├── useProducts.ts
│   │   │   │   └── useProductForm.ts
│   │   │   └── components/
│   │   │       ├── ProductsTable.tsx
│   │   │       └── ProductForm.tsx
│   │   └── dashboard/
│   │       ├── hooks/
│   │       │   └── useDashboard.ts
│   │       └── components/
│   │           ├── KPICard.tsx
│   │           └── SalesChart.tsx
│   │
│   ├── lib/                     # Utilitários e configurações
│   │   ├── api.ts               # Axios client configurado
│   │   ├── queryClient.ts       # TanStack Query client
│   │   ├── router.tsx           # React Router config
│   │   ├── auth.ts              # Auth utilities
│   │   └── utils.ts             # Funções utilitárias gerais
│   │
│   ├── hooks/                   # Hooks globais
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── usePagination.ts
│   │   └── useDebounce.ts
│   │
│   ├── types/                   # Types específicos do frontend
│   │   ├── api.ts               # Tipos de resposta da API
│   │   └── components.ts        # Props de componentes
│   │
│   ├── constants/               # Constantes
│   │   ├── routes.ts
│   │   ├── permissions.ts
│   │   └── config.ts
│   │
│   └── styles/                  # Estilos globais
│       ├── index.css            # Tailwind imports + globals
│       └── themes.css           # Variáveis de tema
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

### 5.2 Gerenciamento de Estado

**Estratégia:** TanStack Query para estado do servidor + React Context para estado local

#### Server State (TanStack Query)

```typescript
// apps/web/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

#### Auth Context

```typescript
// apps/web/src/features/auth/hooks/useAuth.ts

import { createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '@ejr/shared-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
    retry: false,
    staleTime: Infinity, // Não refetch automaticamente
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.post('/auth/login', { email, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
    },
  });

  const hasRole = (roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        login: (email, password) => loginMutation.mutateAsync({ email, password }),
        logout: () => logoutMutation.mutateAsync(),
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### 5.3 Roteamento

```typescript
// apps/web/src/lib/router.tsx

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsListPage } from '@/pages/products/ProductsListPage';
// ... outros imports

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@ejr/shared-types';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'products',
        children: [
          { index: true, element: <ProductsListPage /> },
          { path: 'new', element: <ProductFormPage /> },
          { path: ':id', element: <ProductDetailPage /> },
          { path: ':id/edit', element: <ProductFormPage /> },
        ],
      },
      {
        path: 'customers',
        children: [
          { index: true, element: <CustomersListPage /> },
          { path: 'new', element: <CustomerFormPage /> },
          { path: ':id', element: <CustomerDetailPage /> },
          { path: ':id/edit', element: <CustomerFormPage /> },
        ],
      },
      {
        path: 'quotes',
        children: [
          { index: true, element: <QuotesListPage /> },
          { path: 'new', element: <QuoteFormPage /> },
          { path: ':id', element: <QuoteDetailPage /> },
          { path: ':id/edit', element: <QuoteFormPage /> },
        ],
      },
      {
        path: 'orders',
        children: [
          { index: true, element: <OrdersListPage /> },
          { path: ':id', element: <OrderDetailPage /> },
        ],
      },
      {
        path: 'inventory',
        children: [
          { index: true, element: <InventoryPage /> },
          { path: 'movements', element: <MovementsPage /> },
          { path: 'adjustment', element: <AdjustmentPage /> },
        ],
      },
      {
        path: 'service-orders',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.DIRECTOR, UserRole.OWNER]}>
            <ServiceOrdersListPage />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ServiceOrdersListPage /> },
          { path: 'new', element: <ServiceOrderFormPage /> },
          { path: ':id', element: <ServiceOrderDetailPage /> },
          { path: ':id/edit', element: <ServiceOrderFormPage /> },
        ],
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.MANAGER, UserRole.DIRECTOR, UserRole.OWNER]}>
            <ReportsPage />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ReportsPage /> },
          { path: 'sales', element: <SalesReportPage /> },
          { path: 'inventory', element: <InventoryReportPage /> },
        ],
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTOR, UserRole.OWNER]}>
            <UsersListPage />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <UsersListPage /> },
          { path: 'new', element: <UserFormPage /> },
          { path: ':id/edit', element: <UserFormPage /> },
        ],
      },
      {
        path: 'time-clock',
        element: <TimeClockPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
```

```typescript
// apps/web/src/components/auth/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserRole } from '@ejr/shared-types';
import { Spinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 5.4 API Client

```typescript
// apps/web/src/lib/api.ts

import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para HTTP-only cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Pode adicionar token do localStorage se necessário
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 'Ocorreu um erro inesperado';

    // Erros de autenticação
    if (error.response?.status === 401) {
      toast.error('Sessão expirada. Faça login novamente.');
      window.location.href = '/login';
    }

    // Erros de permissão
    if (error.response?.status === 403) {
      toast.error('Você não tem permissão para realizar esta ação.');
    }

    // Outros erros
    if (error.response?.status >= 500) {
      toast.error('Erro no servidor. Tente novamente mais tarde.');
    }

    return Promise.reject(error);
  }
);
```

### 5.5 Hooks Customizados (Exemplos)

#### useProducts

```typescript
// apps/web/src/features/products/hooks/useProducts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Product, CreateProductDTO, ProductStatus } from '@ejr/shared-types';
import { toast } from 'sonner';

interface UseProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: ProductStatus;
}

export function useProducts(params: UseProductsParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await api.get('/products', { params });
      return response.data.data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const response = await api.get(`/products/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDTO) => {
      const response = await api.post('/products', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Erro ao criar produto';
      toast.error(message);
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await api.patch(`/products/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Erro ao atualizar produto';
      toast.error(message);
    },
  });
}
```

#### useDashboard

```typescript
// apps/web/src/features/dashboard/hooks/useDashboard.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'overview', user?.role],
    queryFn: async () => {
      const response = await api.get('/dashboard/overview');
      return response.data.data;
    },
    refetchInterval: 60000, // Refetch a cada 1 minuto
    enabled: !!user,
  });
}

export function useSalesChart(period: 'day' | 'week' | 'month' | 'year') {
  return useQuery({
    queryKey: ['dashboard', 'charts', 'sales', period],
    queryFn: async () => {
      const response = await api.get('/dashboard/charts/sales', {
        params: { period },
      });
      return response.data.data;
    },
  });
}
```

---

## 6. ARQUITETURA BACKEND

### 6.1 Estrutura de Diretórios

```
apps/api/
├── prisma/
│   ├── schema.prisma           # Prisma schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Database seeding
├── src/
│   ├── server.ts               # Express app entry point
│   ├── app.ts                  # Express app configuration
│   │
│   ├── config/                 # Configurações
│   │   ├── env.ts              # Environment variables
│   │   ├── database.ts         # Database config
│   │   └── logger.ts           # Winston logger
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.ts             # JWT authentication
│   │   ├── errorHandler.ts    # Global error handler
│   │   ├── validateRequest.ts # Zod validation middleware
│   │   ├── rbac.ts             # Role-based access control
│   │   └── rateLimiter.ts      # Rate limiting
│   │
│   ├── routes/                 # Express routers
│   │   ├── index.ts            # Main router
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── products.routes.ts
│   │   ├── customers.routes.ts
│   │   ├── quotes.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── inventory.routes.ts
│   │   ├── alerts.routes.ts
│   │   ├── serviceOrders.routes.ts
│   │   ├── timeEntries.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── reports.routes.ts
│   │   └── backup.routes.ts
│   │
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── products.controller.ts
│   │   ├── customers.controller.ts
│   │   ├── quotes.controller.ts
│   │   ├── orders.controller.ts
│   │   ├── inventory.controller.ts
│   │   ├── alerts.controller.ts
│   │   ├── serviceOrders.controller.ts
│   │   ├── timeEntries.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── reports.controller.ts
│   │   └── backup.controller.ts
│   │
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── users.service.ts
│   │   ├── products.service.ts
│   │   ├── customers.service.ts
│   │   ├── quotes.service.ts
│   │   ├── orders.service.ts
│   │   ├── inventory.service.ts
│   │   ├── alerts.service.ts
│   │   ├── serviceOrders.service.ts
│   │   ├── timeEntries.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── reports.service.ts
│   │   ├── pdf.service.ts      # PDF generation
│   │   ├── email.service.ts    # Email sending
│   │   ├── whatsapp.service.ts # WhatsApp integration
│   │   └── backup.service.ts   # Backup management
│   │
│   ├── repositories/           # Data access layer
│   │   ├── users.repository.ts
│   │   ├── products.repository.ts
│   │   ├── customers.repository.ts
│   │   ├── quotes.repository.ts
│   │   ├── orders.repository.ts
│   │   ├── inventory.repository.ts
│   │   ├── alerts.repository.ts
│   │   ├── serviceOrders.repository.ts
│   │   ├── timeEntries.repository.ts
│   │   └── auditLog.repository.ts
│   │
│   ├── jobs/                   # Scheduled jobs (cron)
│   │   ├── index.ts            # Job scheduler
│   │   ├── stockAlerts.job.ts  # Verifica estoque baixo
│   │   ├── backup.job.ts       # Backup automático
│   │   ├── emailReports.job.ts # Relatórios por email
│   │   └── cleanupOldLogs.job.ts # Limpeza de logs antigos
│   │
│   ├── utils/                  # Utility functions
│   │   ├── password.ts         # Bcrypt hashing
│   │   ├── jwt.ts              # JWT generation/verification
│   │   ├── pagination.ts       # Pagination helpers
│   │   ├── errors.ts           # Custom error classes
│   │   └── validators.ts       # Validation helpers
│   │
│   └── types/                  # Backend-specific types
│       ├── express.d.ts        # Express request extensions
│       └── index.ts
│
├── .env.example
├── .env
├── tsconfig.json
└── package.json
```

### 6.2 Express App Setup

```typescript
// apps/api/src/server.ts

import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { startJobs } from './jobs';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);

  // Inicia scheduled jobs
  if (env.NODE_ENV === 'production') {
    startJobs();
    logger.info('⏰ Scheduled jobs started');
  }
});
```

```typescript
// apps/api/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import routes from './routes';

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Permite cookies
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);
```

### 6.3 Middleware

#### Authentication Middleware

```typescript
// apps/api/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Tenta pegar token do cookie ou header
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verifica JWT
    const payload = verifyToken(token);

    // Busca usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true, allowedHours: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Verifica horário permitido
    if (user.allowedHours) {
      const now = new Date();
      const currentHour = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const { start, end } = user.allowedHours as { start: string; end: string };

      if (currentHour < start || currentHour > end) {
        throw new UnauthorizedError('Access outside allowed hours');
      }
    }

    // Adiciona user ao request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
```

#### RBAC Middleware

```typescript
// apps/api/src/middleware/rbac.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ForbiddenError } from '../utils/errors';
import { UserRole } from '@ejr/shared-types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('No user in request'));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
```

#### Validation Middleware

```typescript
// apps/api/src/middleware/validateRequest.ts

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
```

#### Error Handler

```typescript
// apps/api/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Erro não tratado
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

### 6.4 Controllers (Exemplo: Products)

```typescript
// apps/api/src/controllers/products.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProductsService } from '../services/products.service';
import { CreateProductDTO, ProductStatus } from '@ejr/shared-types';

const productsService = new ProductsService();

export class ProductsController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, category, status, inStock } = req.query;

      const result = await productsService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        status: status as ProductStatus,
        inStock: inStock === 'true',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await productsService.getById(id);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data: CreateProductDTO = req.body;
      const product = await productsService.create(data, req.user!.id);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;
      const product = await productsService.update(id, data, req.user!.id);

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getLowStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const products = await productsService.getLowStock();

      res.json({
        success: true,
        data: { products },
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### 6.5 Services (Exemplo: Products)

```typescript
// apps/api/src/services/products.service.ts

import { ProductsRepository } from '../repositories/products.repository';
import { AlertsService } from './alerts.service';
import { AuditLogRepository } from '../repositories/auditLog.repository';
import { CreateProductDTO, Product, ProductStatus } from '@ejr/shared-types';
import { NotFoundError, ConflictError } from '../utils/errors';
import { calculatePagination } from '../utils/pagination';

export class ProductsService {
  private productsRepo = new ProductsRepository();
  private alertsService = new AlertsService();
  private auditLogRepo = new AuditLogRepository();

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    status?: ProductStatus;
    inStock?: boolean;
  }) {
    const products = await this.productsRepo.findMany(params);
    const total = await this.productsRepo.count(params);
    const pagination = calculatePagination(params.page, params.limit, total);

    return { products, pagination };
  }

  async getById(id: string) {
    const product = await this.productsRepo.findById(id, {
      includeMovements: true,
      includeAlerts: true,
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async create(data: CreateProductDTO, userId: string) {
    // Verifica se código já existe
    const existing = await this.productsRepo.findByCode(data.code);
    if (existing) {
      throw new ConflictError('Product code already exists');
    }

    // Cria produto
    const product = await this.productsRepo.create({
      ...data,
      currentStock: 0, // Estoque inicial = 0
    });

    // Log de auditoria
    await this.auditLogRepo.create({
      userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      changes: data,
    });

    return product;
  }

  async update(id: string, data: Partial<Product>, userId: string) {
    const existing = await this.productsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    // Se mudou código, verifica duplicata
    if (data.code && data.code !== existing.code) {
      const duplicate = await this.productsRepo.findByCode(data.code);
      if (duplicate) {
        throw new ConflictError('Product code already exists');
      }
    }

    const updated = await this.productsRepo.update(id, data);

    // Log de auditoria
    await this.auditLogRepo.create({
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async getLowStock() {
    const products = await this.productsRepo.findLowStock();

    return products.map((product) => ({
      ...product,
      percentageOfMinimum: (product.currentStock / product.minimumStock) * 100,
      suggestedReorder: Math.max(product.minimumStock * 2 - product.currentStock, 0),
    }));
  }
}
```

### 6.6 Repositories (Exemplo: Products)

```typescript
// apps/api/src/repositories/products.repository.ts

import { prisma } from '../config/database';
import { Product, ProductStatus } from '@ejr/shared-types';

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

    return prisma.product.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { code: { contains: search, mode: 'insensitive' } },
                  { category: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          category ? { category } : {},
          status ? { status } : {},
          inStock ? { currentStock: { gt: 0 } } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async count(params: {
    search?: string;
    category?: string;
    status?: ProductStatus;
    inStock?: boolean;
  }) {
    const { search, category, status, inStock } = params;

    return prisma.product.count({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { code: { contains: search, mode: 'insensitive' } },
                  { category: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          category ? { category } : {},
          status ? { status } : {},
          inStock ? { currentStock: { gt: 0 } } : {},
        ],
      },
    });
  }

  async findById(
    id: string,
    options?: {
      includeMovements?: boolean;
      includeAlerts?: boolean;
    }
  ) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        movements: options?.includeMovements
          ? { take: 10, orderBy: { createdAt: 'desc' }, include: { user: true } }
          : false,
        alerts: options?.includeAlerts
          ? { where: { isRead: false }, orderBy: { createdAt: 'desc' } }
          : false,
      },
    });
  }

  async findByCode(code: string) {
    return prisma.product.findUnique({
      where: { code },
    });
  }

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'imageUrls'> & { imageUrls?: string[] }) {
    return prisma.product.create({
      data,
    });
  }

  async update(id: string, data: Partial<Product>) {
    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async findLowStock() {
    return prisma.product.findMany({
      where: {
        currentStock: {
          lte: prisma.product.fields.minimumStock,
        },
        status: ProductStatus.ACTIVE,
      },
      orderBy: [
        { currentStock: 'asc' },
      ],
    });
  }
}
```

---

## 7. ESTRUTURA DO MONOREPO

```
/home/nmaldaner/projetos/estoque/
├── .bmad-core/                  # BMad framework files
├── doc/                         # Documentação de análise
├── docs/                        # Documentação técnica
│   ├── prd.md
│   ├── architecture.md (este arquivo)
│   ├── qa/
│   ├── stories/
│   └── architecture/
│       ├── coding-standards.md
│       ├── tech-stack.md
│       └── source-tree.md
│
├── apps/
│   ├── web/                     # Frontend React
│   │   ├── public/
│   │   ├── src/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                     # Backend Node.js
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── src/
│       ├── .env.example
│       ├── .env
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared-types/            # Types compartilhados
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── user.ts
│   │   │   │   ├── product.ts
│   │   │   │   ├── customer.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                      # Componentes UI compartilhados (opcional)
│   │   └── ...
│   │
│   └── utils/                   # Utilitários compartilhados (opcional)
│       └── ...
│
├── .gitignore
├── pnpm-workspace.yaml
├── package.json                 # Root package.json
├── tsconfig.json                # Base TypeScript config
├── .eslintrc.js                 # ESLint config
└── README.md
```

### 7.1 Configuração do Monorepo

#### Root `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### Root `package.json`

```json
{
  "name": "ejr-organizador",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter \"./apps/*\" dev",
    "dev:web": "pnpm --filter @ejr/web dev",
    "dev:api": "pnpm --filter @ejr/api dev",
    "build": "pnpm --filter \"./packages/*\" build && pnpm --filter \"./apps/*\" build",
    "build:web": "pnpm --filter @ejr/web build",
    "build:api": "pnpm --filter @ejr/api build",
    "lint": "pnpm --parallel lint",
    "typecheck": "pnpm --parallel typecheck",
    "db:migrate": "pnpm --filter @ejr/api db:migrate",
    "db:generate": "pnpm --filter @ejr/api db:generate",
    "db:studio": "pnpm --filter @ejr/api db:studio"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1",
    "typescript": "^5.3.3"
  }
}
```

---

## 8. SCHEMA DO BANCO DE DADOS

### 8.1 Prisma Schema Completo

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USUÁRIOS E AUTENTICAÇÃO
// ============================================

enum UserRole {
  OWNER
  DIRECTOR
  MANAGER
  SALESPERSON
  STOCK
  TECHNICIAN
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         UserRole
  isActive     Boolean  @default(true) @map("is_active")
  allowedHours Json?    @map("allowed_hours") // { start: "08:00", end: "18:00" }

  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relações
  quotes            Quote[]
  orders            Order[]
  inventoryMovements InventoryMovement[]
  serviceOrders     ServiceOrder[]
  timeEntries       TimeEntry[]
  auditLogs         AuditLog[]
  alertsRead        Alert[]

  @@map("users")
}

// ============================================
// PRODUTOS
// ============================================

enum ProductStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}

model Product {
  id                    String        @id @default(uuid())
  code                  String        @unique
  name                  String
  category              String
  manufacturer          String?
  costPrice             Int           @map("cost_price") // centavos
  salePrice             Int           @map("sale_price") // centavos
  technicalDescription  String?       @map("technical_description") @db.Text
  commercialDescription String?       @map("commercial_description") @db.Text
  warrantyMonths        Int           @default(0) @map("warranty_months")
  currentStock          Int           @default(0) @map("current_stock")
  minimumStock          Int           @default(5) @map("minimum_stock")
  status                ProductStatus @default(ACTIVE)
  imageUrls             String[]      @default([]) @map("image_urls")

  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  // Relações
  quoteItems         QuoteItem[]
  orderItems         OrderItem[]
  movements          InventoryMovement[]
  alerts             Alert[]
  serviceOrders      ServiceOrder[]
  serviceParts       ServicePart[]

  @@index([code])
  @@index([category])
  @@index([status])
  @@map("products")
}

// ============================================
// CLIENTES
// ============================================

enum CustomerType {
  INDIVIDUAL
  BUSINESS
}

model Customer {
  id       String       @id @default(uuid())
  type     CustomerType
  name     String
  document String       @unique // CPF ou CNPJ
  email    String?
  phone    String?
  address  Json?        // Address object

  // Portal Access
  portalAccess Json?     @map("portal_access") // { username, passwordHash, isActive }

  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relações
  quotes        Quote[]
  orders        Order[]
  serviceOrders ServiceOrder[]

  @@index([document])
  @@index([email])
  @@map("customers")
}

// ============================================
// ORÇAMENTOS
// ============================================

enum QuoteStatus {
  DRAFT
  SENT
  APPROVED
  REJECTED
  EXPIRED
  CONVERTED
}

model Quote {
  id                String      @id @default(uuid())
  quoteNumber       String      @unique @map("quote_number") // QOT-2025-0001
  customerId        String      @map("customer_id")
  customer          Customer    @relation(fields: [customerId], references: [id])
  subtotal          Int         // centavos
  discount          Int         @default(0) // centavos
  total             Int         // centavos
  status            QuoteStatus @default(DRAFT)
  validUntil        DateTime    @map("valid_until")
  notes             String?     @db.Text
  responsibleUserId String      @map("responsible_user_id")
  responsibleUser   User        @relation(fields: [responsibleUserId], references: [id])

  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  // Relações
  items  QuoteItem[]
  orders Order[]

  @@index([customerId])
  @@index([quoteNumber])
  @@index([status])
  @@map("quotes")
}

model QuoteItem {
  id        String   @id @default(uuid())
  quoteId   String   @map("quote_id")
  quote     Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  productId String   @map("product_id")
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Int      @map("unit_price") // centavos
  total     Int      // quantity * unitPrice

  @@map("quote_items")
}

// ============================================
// PEDIDOS
// ============================================

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

model Order {
  id                String      @id @default(uuid())
  orderNumber       String      @unique @map("order_number") // ORD-2025-0001
  customerId        String      @map("customer_id")
  customer          Customer    @relation(fields: [customerId], references: [id])
  subtotal          Int         // centavos
  discount          Int         @default(0) // centavos
  total             Int         // centavos
  status            OrderStatus @default(PENDING)
  quoteId           String?     @map("quote_id")
  quote             Quote?      @relation(fields: [quoteId], references: [id])
  responsibleUserId String      @map("responsible_user_id")
  responsibleUser   User        @relation(fields: [responsibleUserId], references: [id])

  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  // Relações
  items OrderItem[]

  @@index([customerId])
  @@index([orderNumber])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String  @map("order_id")
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String  @map("product_id")
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Int     @map("unit_price") // centavos
  total     Int     // quantity * unitPrice

  @@map("order_items")
}

// ============================================
// ESTOQUE
// ============================================

enum MovementType {
  PURCHASE
  SALE
  RETURN
  ADJUSTMENT
  TRANSFER
  LOSS
  MAINTENANCE_OUT
  MAINTENANCE_IN
}

model InventoryMovement {
  id            String       @id @default(uuid())
  productId     String       @map("product_id")
  product       Product      @relation(fields: [productId], references: [id])
  type          MovementType
  quantity      Int          // Positivo = entrada, Negativo = saída
  reason        String?      @db.Text
  referenceId   String?      @map("reference_id") // ID do pedido, OS, etc.
  previousStock Int          @map("previous_stock")
  newStock      Int          @map("new_stock")
  userId        String       @map("user_id")
  user          User         @relation(fields: [userId], references: [id])

  createdAt     DateTime     @default(now()) @map("created_at")

  @@index([productId])
  @@index([type])
  @@index([createdAt])
  @@map("inventory_movements")
}

// ============================================
// ALERTAS
// ============================================

enum AlertType {
  LOW_STOCK
  OUT_OF_STOCK
  REORDER_SUGGESTION
  HIGH_SALES_VELOCITY
  SYSTEM
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

model Alert {
  id           String        @id @default(uuid())
  type         AlertType
  severity     AlertSeverity
  title        String
  message      String        @db.Text
  productId    String?       @map("product_id")
  product      Product?      @relation(fields: [productId], references: [id])
  isRead       Boolean       @default(false) @map("is_read")
  readAt       DateTime?     @map("read_at")
  readByUserId String?       @map("read_by_user_id")
  readByUser   User?         @relation(fields: [readByUserId], references: [id])

  createdAt    DateTime      @default(now()) @map("created_at")

  @@index([productId])
  @@index([type])
  @@index([severity])
  @@index([isRead])
  @@map("alerts")
}

// ============================================
// ORDENS DE SERVIÇO
// ============================================

enum ServiceOrderStatus {
  RECEIVED
  DIAGNOSING
  AWAITING_PARTS
  IN_REPAIR
  TESTING
  COMPLETED
  DELIVERED
  CANCELLED
}

enum WarrantyType {
  IN_WARRANTY
  OUT_OF_WARRANTY
}

model ServiceOrder {
  id                 String             @id @default(uuid())
  orderNumber        String             @unique @map("order_number") // SRV-2025-0001
  customerId         String             @map("customer_id")
  customer           Customer           @relation(fields: [customerId], references: [id])
  productId          String             @map("product_id")
  product            Product            @relation(fields: [productId], references: [id])
  warrantyType       WarrantyType       @map("warranty_type")
  receivedAt         DateTime           @default(now()) @map("received_at")
  estimatedDelivery  DateTime?          @map("estimated_delivery")
  completedAt        DateTime?          @map("completed_at")
  deliveredAt        DateTime?          @map("delivered_at")
  status             ServiceOrderStatus @default(RECEIVED)
  diagnosis          String?            @db.Text
  servicesPerformed  String?            @map("services_performed") @db.Text
  laborCost          Int                @default(0) @map("labor_cost") // centavos
  partsCost          Int                @default(0) @map("parts_cost") // centavos
  totalCost          Int                @default(0) @map("total_cost") // centavos
  technicianUserId   String             @map("technician_user_id")
  technicianUser     User               @relation(fields: [technicianUserId], references: [id])
  attachments        String[]           @default([]) // URLs

  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  // Relações
  partsUsed ServicePart[]

  @@index([customerId])
  @@index([productId])
  @@index([status])
  @@index([orderNumber])
  @@map("service_orders")
}

model ServicePart {
  id             String       @id @default(uuid())
  serviceOrderId String       @map("service_order_id")
  serviceOrder   ServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  productId      String       @map("product_id")
  product        Product      @relation(fields: [productId], references: [id])
  quantity       Int
  unitCost       Int          @map("unit_cost") // centavos
  total          Int          // quantity * unitCost

  @@map("service_parts")
}

// ============================================
// PONTO ELETRÔNICO
// ============================================

enum EntryType {
  CLOCK_IN
  CLOCK_OUT
}

model TimeEntry {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  user          User      @relation(fields: [userId], references: [id])
  type          EntryType
  timestamp     DateTime  @default(now())
  location      Json?     // { latitude, longitude }
  isLate        Boolean   @default(false) @map("is_late")
  justification String?   @db.Text

  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([userId])
  @@index([timestamp])
  @@map("time_entries")
}

// ============================================
// AUDITORIA
// ============================================

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  ACCESS_DENIED
  EXPORT
}

model AuditLog {
  id        String      @id @default(uuid())
  userId    String?     @map("user_id")
  user      User?       @relation(fields: [userId], references: [id])
  action    AuditAction
  entity    String      // 'User', 'Product', 'Order', etc.
  entityId  String?     @map("entity_id")
  changes   Json?       // Detalhes da mudança
  ipAddress String?     @map("ip_address")
  userAgent String?     @map("user_agent") @db.Text

  createdAt DateTime    @default(now()) @map("created_at")

  @@index([userId])
  @@index([entity, entityId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 8.2 Migrations

```bash
# Criar migração inicial
pnpm db:migrate

# Gerar Prisma Client
pnpm db:generate

# Abrir Prisma Studio (GUI do banco)
pnpm db:studio
```

### 8.3 Seed (Dados Iniciais)

```typescript
// apps/api/prisma/seed.ts

import { PrismaClient, UserRole, ProductStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Criar usuário Owner
  const ownerPassword = await hashPassword('admin123');
  const owner = await prisma.user.upsert({
    where: { email: 'owner@ejr.com' },
    update: {},
    create: {
      email: 'owner@ejr.com',
      passwordHash: ownerPassword,
      name: 'Dono da Empresa',
      role: UserRole.OWNER,
      isActive: true,
    },
  });
  console.log('✅ Owner created:', owner.email);

  // Criar usuário Director
  const directorPassword = await hashPassword('director123');
  const director = await prisma.user.upsert({
    where: { email: 'director@ejr.com' },
    update: {},
    create: {
      email: 'director@ejr.com',
      passwordHash: directorPassword,
      name: 'Diretor',
      role: UserRole.DIRECTOR,
      isActive: true,
    },
  });
  console.log('✅ Director created:', director.email);

  // Criar usuário Manager
  const managerPassword = await hashPassword('manager123');
  const manager = await prisma.user.upsert({
    where: { email: 'manager@ejr.com' },
    update: {},
    create: {
      email: 'manager@ejr.com',
      passwordHash: managerPassword,
      name: 'Gerente',
      role: UserRole.MANAGER,
      isActive: true,
    },
  });
  console.log('✅ Manager created:', manager.email);

  // Criar usuário Salesperson
  const salesPassword = await hashPassword('sales123');
  const salesperson = await prisma.user.upsert({
    where: { email: 'sales@ejr.com' },
    update: {},
    create: {
      email: 'sales@ejr.com',
      passwordHash: salesPassword,
      name: 'Vendedor',
      role: UserRole.SALESPERSON,
      isActive: true,
      allowedHours: { start: '08:00', end: '18:00' },
    },
  });
  console.log('✅ Salesperson created:', salesperson.email);

  // Criar produtos de exemplo
  const products = [
    {
      code: 'PROD-001',
      name: 'Produto Exemplo 1',
      category: 'Eletrônicos',
      manufacturer: 'Fabricante A',
      costPrice: 10000, // R$ 100,00
      salePrice: 15000, // R$ 150,00
      currentStock: 50,
      minimumStock: 10,
      status: ProductStatus.ACTIVE,
    },
    {
      code: 'PROD-002',
      name: 'Produto Exemplo 2',
      category: 'Acessórios',
      costPrice: 5000,
      salePrice: 8000,
      currentStock: 5,
      minimumStock: 10,
      status: ProductStatus.ACTIVE,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product,
    });
    console.log(`✅ Product created: ${product.code}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 9. ARQUITETURA DE SEGURANÇA

### 9.1 Autenticação JWT

**Fluxo:**

1. Cliente envia credenciais (email + senha) para `/api/v1/auth/login`
2. Backend valida credenciais
3. Backend verifica se usuário está ativo e dentro do horário permitido
4. Backend gera JWT com payload: `{ userId, email, role }`
5. Backend envia token de duas formas:
   - HTTP-only cookie (seguro contra XSS)
   - Response body (para armazenar em memória no frontend)
6. Cliente usa token em requests subsequentes
7. Backend valida token em cada request protegido

**Implementação:**

```typescript
// apps/api/src/utils/jwt.ts

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
}
```

```typescript
// apps/api/src/utils/password.ts

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 9.2 RBAC (Role-Based Access Control)

**Matriz de Permissões:**

| Recurso | OWNER | DIRECTOR | MANAGER | SALESPERSON | STOCK | TECHNICIAN |
|---------|-------|----------|---------|-------------|-------|------------|
| **Dashboard** | ✅ Exec | ✅ Full | ✅ Ops | ✅ Sales | ✅ Stock | ✅ Service |
| **Usuários** | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| **Produtos** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ Read | ✅ Read | ✅ Read |
| **Clientes** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ | ✅ Read |
| **Orçamentos** | ✅ All | ✅ All | ✅ All | ✅ CRUD | ❌ | ❌ |
| **Pedidos** | ✅ All | ✅ All | ✅ CRUD | ✅ Create | ❌ | ❌ |
| **Estoque** | ✅ All | ✅ All | ✅ All | ❌ | ✅ CRUD | ❌ |
| **OS** | ✅ All | ✅ All | ✅ All | ❌ | ❌ | ✅ CRUD |
| **Relatórios** | ✅ All | ✅ All | ✅ All | ❌ | ❌ | ❌ |
| **Backup** | ✅ All | ✅ All | ❌ | ❌ | ❌ | ❌ |

### 9.3 Proteções de Segurança

#### Rate Limiting

```typescript
// apps/api/src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Too many requests from this IP, please try again later.',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas de login
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});
```

#### Helmet (Security Headers)

```typescript
// apps/api/src/app.ts

import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

#### CORS

```typescript
// apps/api/src/app.ts

import cors from 'cors';

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### Input Validation (Zod)

```typescript
// Exemplo de validação em route

import { validateRequest } from '../middleware/validateRequest';
import { CreateProductSchema } from '@ejr/shared-types';

router.post(
  '/products',
  authenticate,
  requireRole(UserRole.MANAGER, UserRole.DIRECTOR, UserRole.OWNER),
  validateRequest(z.object({ body: CreateProductSchema })),
  productsController.create
);
```

### 9.4 Proteção contra Vulnerabilidades

| Vulnerabilidade | Proteção Implementada |
|-----------------|----------------------|
| **SQL Injection** | ✅ Prisma ORM (queries parametrizadas) |
| **XSS** | ✅ HTTP-only cookies, CSP headers, React escaping |
| **CSRF** | ✅ SameSite cookies, custom headers |
| **Brute Force** | ✅ Rate limiting em /login |
| **Session Hijacking** | ✅ JWT com curta expiração, HTTPS only |
| **Path Traversal** | ✅ Validação de file paths, whitelisting |
| **DoS** | ✅ Rate limiting global, payload size limits |
| **Clickjacking** | ✅ X-Frame-Options header |
| **MITM** | ✅ HTTPS/TLS obrigatório em produção |

---

## 10. AUTOMAÇÃO E JOBS

### 10.1 Scheduled Jobs (Cron)

```typescript
// apps/api/src/jobs/index.ts

import cron from 'node-cron';
import { logger } from '../config/logger';
import { checkLowStockAlerts } from './stockAlerts.job';
import { performDailyBackup } from './backup.job';
import { sendDailyReports } from './emailReports.job';
import { cleanupOldLogs } from './cleanupOldLogs.job';

export function startJobs() {
  // Verifica estoque baixo a cada 1 hora
  cron.schedule('0 * * * *', async () => {
    logger.info('🔔 Running low stock check...');
    await checkLowStockAlerts();
  });

  // Backup diário às 02:00
  cron.schedule('0 2 * * *', async () => {
    logger.info('💾 Running daily backup...');
    await performDailyBackup();
  });

  // Relatórios diários às 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('📧 Sending daily reports...');
    await sendDailyReports();
  });

  // Limpeza de logs antigos (>90 dias) - semanal aos domingos 03:00
  cron.schedule('0 3 * * 0', async () => {
    logger.info('🧹 Cleaning old logs...');
    await cleanupOldLogs();
  });

  logger.info('✅ All scheduled jobs registered');
}
```

### 10.2 Stock Alerts Job

```typescript
// apps/api/src/jobs/stockAlerts.job.ts

import { prisma } from '../config/database';
import { AlertType, AlertSeverity } from '@ejr/shared-types';
import { logger } from '../config/logger';

export async function checkLowStockAlerts() {
  try {
    // Busca produtos com estoque baixo
    const lowStockProducts = await prisma.product.findMany({
      where: {
        currentStock: {
          lte: prisma.product.fields.minimumStock,
        },
        status: 'ACTIVE',
      },
    });

    for (const product of lowStockProducts) {
      // Verifica se já existe alerta não lido
      const existingAlert = await prisma.alert.findFirst({
        where: {
          productId: product.id,
          type: product.currentStock === 0 ? AlertType.OUT_OF_STOCK : AlertType.LOW_STOCK,
          isRead: false,
        },
      });

      if (!existingAlert) {
        // Cria novo alerta
        await prisma.alert.create({
          data: {
            type: product.currentStock === 0 ? AlertType.OUT_OF_STOCK : AlertType.LOW_STOCK,
            severity: product.currentStock === 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            title: product.currentStock === 0 ? 'Produto sem estoque' : 'Estoque baixo',
            message: `Produto "${product.name}" (${product.code}) está com ${product.currentStock} unidades (mínimo: ${product.minimumStock})`,
            productId: product.id,
          },
        });

        logger.info(`🔔 Alert created for product ${product.code}`);
      }
    }

    logger.info(`✅ Stock alerts check completed. Processed ${lowStockProducts.length} products.`);
  } catch (error) {
    logger.error('❌ Error in stock alerts job:', error);
  }
}
```

### 10.3 Email Reports Job

```typescript
// apps/api/src/jobs/emailReports.job.ts

import { prisma } from '../config/database';
import { EmailService } from '../services/email.service';
import { logger } from '../config/logger';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const emailService = new EmailService();

export async function sendDailyReports() {
  try {
    // Busca usuários que devem receber relatórios
    const recipients = await prisma.user.findMany({
      where: {
        role: {
          in: ['OWNER', 'DIRECTOR', 'MANAGER'],
        },
        isActive: true,
      },
    });

    // Calcula métricas do dia anterior
    const yesterday = subDays(new Date(), 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    const [ordersCount, totalRevenue, lowStockCount] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: 'DELIVERED',
        },
        _sum: { total: true },
      }),
      prisma.product.count({
        where: {
          currentStock: { lte: prisma.product.fields.minimumStock },
          status: 'ACTIVE',
        },
      }),
    ]);

    const revenue = totalRevenue._sum.total || 0;

    // Envia email para cada destinatário
    for (const user of recipients) {
      await emailService.sendDailyReport(user.email, {
        date: yesterday,
        ordersCount,
        revenue,
        lowStockCount,
      });

      logger.info(`📧 Daily report sent to ${user.email}`);
    }

    logger.info('✅ Daily reports sent successfully');
  } catch (error) {
    logger.error('❌ Error sending daily reports:', error);
  }
}
```

### 10.4 Backup Job

```typescript
// apps/api/src/jobs/backup.job.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { EmailService } from '../services/email.service';

const execAsync = promisify(exec);
const emailService = new EmailService();

export async function performDailyBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  const backupDir = env.BACKUP_DIR || '/var/backups/ejr';
  const filepath = path.join(backupDir, filename);

  try {
    // Garante que diretório existe
    await fs.mkdir(backupDir, { recursive: true });

    // Executa pg_dump
    const command = `pg_dump ${env.DATABASE_URL} > ${filepath}`;
    await execAsync(command);

    // Compacta backup
    await execAsync(`gzip ${filepath}`);
    const gzipPath = `${filepath}.gz`;

    // Calcula tamanho
    const stats = await fs.stat(gzipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    logger.info(`✅ Backup created: ${filename}.gz (${sizeMB} MB)`);

    // Remove backups antigos (>30 dias)
    const files = await fs.readdir(backupDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias

    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.gz')) {
        const filePath = path.join(backupDir, file);
        const fileStats = await fs.stat(filePath);
        if (now - fileStats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          logger.info(`🗑️ Deleted old backup: ${file}`);
        }
      }
    }

    // Notifica sucesso por email
    await emailService.sendBackupNotification('success', {
      filename: `${filename}.gz`,
      size: `${sizeMB} MB`,
    });
  } catch (error) {
    logger.error('❌ Backup failed:', error);

    // Notifica falha por email
    await emailService.sendBackupNotification('failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

---

## 11. PERFORMANCE E OTIMIZAÇÃO

### 11.1 Metas de Performance

| Métrica | Target | Measurement |
|---------|--------|-------------|
| **Dashboard Load** | < 2s | Time to interactive |
| **Product Search** | < 1s | Response time |
| **PDF Generation** | < 5s | Generation + delivery |
| **API Response (simple)** | < 200ms | p95 latency |
| **API Response (complex)** | < 1s | p95 latency |
| **Concurrent Users** | 10-20 | Without degradation |
| **Database Queries** | < 100ms | p95 latency |

### 11.2 Estratégias de Otimização

#### Frontend

**1. Code Splitting**

```typescript
// apps/web/src/lib/router.tsx

import { lazy } from 'react';

const ProductsListPage = lazy(() => import('@/pages/products/ProductsListPage'));
const OrdersListPage = lazy(() => import('@/pages/orders/OrdersListPage'));
// ...

// Suspense wrapper
<Suspense fallback={<PageLoader />}>
  <ProductsListPage />
</Suspense>
```

**2. TanStack Query Caching**

```typescript
// Cache automático de 5 minutos
// Reduz requests desnecessários

queryClient.setDefaultOptions({
  queries: {
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  },
});
```

**3. Virtualization (Longas Listas)**

```typescript
// apps/web/src/components/domain/ProductsTable.tsx

import { useVirtualizer } from '@tanstack/react-virtual';

// Para listas com 1000+ itens
```

**4. Debounce em Buscas**

```typescript
// apps/web/src/hooks/useDebounce.ts

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

#### Backend

**1. Database Indexes**

```prisma
// Todos os índices já definidos no schema.prisma

@@index([code])
@@index([category])
@@index([customerId])
@@index([createdAt])
```

**2. N+1 Query Prevention**

```typescript
// Sempre use include/select no Prisma para evitar N+1

const orders = await prisma.order.findMany({
  include: {
    customer: true,
    items: {
      include: {
        product: true,
      },
    },
  },
});
```

**3. Response Compression**

```typescript
// apps/api/src/app.ts

import compression from 'compression';

app.use(compression());
```

**4. Connection Pooling**

```typescript
// apps/api/src/config/database.ts

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool settings via DATABASE_URL
// postgresql://user:pass@host:5432/db?pool_timeout=30&connection_limit=10
```

### 11.3 Monitoramento de Performance

```typescript
// apps/api/src/middleware/performanceMonitor.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }

    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}
```

---

## 12. ARQUITETURA DE DEPLOY

### 12.1 Infraestrutura Target

**VPS Linux (Ubuntu 22.04 LTS)**

Especificações mínimas:
- **CPU:** 2 vCPUs
- **RAM:** 4 GB
- **Storage:** 50 GB SSD
- **Network:** 100 Mbps
- **Custo Estimado:** R$ 200-400/mês

### 12.2 Stack de Deploy

```
┌─────────────────────────────────────────────┐
│         INTERNET (HTTPS port 443)            │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  NGINX (Reverse Proxy + Static Files)       │
│  - SSL/TLS (Let's Encrypt)                   │
│  - Gzip compression                          │
│  - Rate limiting                             │
│  - Static file serving (/dist)               │
└───────┬─────────────────────┬───────────────┘
        │                     │
        │ /api/*              │ /assets/*
        ▼                     ▼
┌───────────────┐    ┌────────────────────┐
│ PM2 (Node.js) │    │ Static Files       │
│ - Express API │    │ (React build)      │
│ - Port 3000   │    └────────────────────┘
│ - Cluster mode│
│ - Auto-restart│
└───────┬───────┘
        │
        ▼
┌───────────────────────┐
│   PostgreSQL 15       │
│   - Port 5432         │
│   - Local connection  │
│   - Daily backups     │
└───────────────────────┘
```

### 12.3 Nginx Configuration

```nginx
# /etc/nginx/sites-available/ejr-organizador

upstream api {
  server 127.0.0.1:3000;
  keepalive 64;
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name ejr.exemplo.com;
  return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ejr.exemplo.com;

  # SSL certificates (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/ejr.exemplo.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ejr.exemplo.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
  gzip_min_length 1000;

  # Client body size (para uploads)
  client_max_body_size 10M;

  # Root directory (React build)
  root /var/www/ejr-organizador/web/dist;
  index index.html;

  # API proxy
  location /api/ {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Static files (React)
  location / {
    try_files $uri $uri/ /index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
  }

  # Health check endpoint
  location /health {
    proxy_pass http://api/health;
    access_log off;
  }
}
```

### 12.4 PM2 Configuration

```javascript
// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'ejr-api',
      script: 'dist/server.js',
      cwd: '/var/www/ejr-organizador/api',
      instances: 2, // Cluster mode com 2 instâncias
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/ejr-api-error.log',
      out_file: '/var/log/pm2/ejr-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
```

### 12.5 Environment Variables (.env)

```bash
# apps/api/.env.production

NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://ejr_user:STRONG_PASSWORD@localhost:5432/ejr_db?schema=public

# JWT
JWT_SECRET=SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION

# Frontend URL (para CORS)
FRONTEND_URL=https://ejr.exemplo.com

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@ejr.com
SMTP_PASS=email_app_password

# Backup
BACKUP_DIR=/var/backups/ejr

# Logs
LOG_LEVEL=info
```

### 12.6 Deploy Steps

```bash
# 1. No VPS, instalar dependências
sudo apt update
sudo apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx

# 2. Instalar pnpm
npm install -g pnpm pm2

# 3. Clonar repositório
cd /var/www
git clone <repo-url> ejr-organizador
cd ejr-organizador

# 4. Instalar dependências
pnpm install

# 5. Build do projeto
pnpm build

# 6. Setup do banco de dados
cd apps/api
cp .env.example .env
nano .env # Editar variáveis

# Executar migrations
pnpm db:migrate
pnpm db:generate
pnpm prisma db seed

# 7. Configurar PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup # Seguir instruções

# 8. Configurar Nginx
sudo cp nginx.conf /etc/nginx/sites-available/ejr-organizador
sudo ln -s /etc/nginx/sites-available/ejr-organizador /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 9. Configurar SSL (Let's Encrypt)
sudo certbot --nginx -d ejr.exemplo.com

# 10. Configurar firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 11. Setup de backup automático (cron)
sudo crontab -e
# Adicionar: 0 2 * * * /usr/bin/pg_dump ejr_db | gzip > /var/backups/ejr/backup-$(date +\%Y\%m\%d).sql.gz
```

### 12.7 CI/CD (GitHub Actions - Opcional)

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/ejr-organizador
            git pull origin main
            pnpm install
            pnpm build
            pm2 reload ecosystem.config.js
```

---

## 13. ESTRATÉGIA DE TESTES

### 13.1 Pirâmide de Testes

```
       ┌─────────┐
      ╱   E2E    ╲       10% - Cypress
     ╱─────────────╲
    ╱  Integration ╲    20% - Jest + Supertest
   ╱─────────────────╲
  ╱      Unit         ╲  70% - Jest + Testing Library
 ╱─────────────────────╲
```

### 13.2 Testes Unitários (Backend)

```typescript
// apps/api/src/services/__tests__/products.service.test.ts

import { ProductsService } from '../products.service';
import { ProductsRepository } from '../../repositories/products.repository';
import { NotFoundError, ConflictError } from '../../utils/errors';

jest.mock('../../repositories/products.repository');

describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepo: jest.Mocked<ProductsRepository>;

  beforeEach(() => {
    mockRepo = new ProductsRepository() as jest.Mocked<ProductsRepository>;
    service = new ProductsService();
    (service as any).productsRepo = mockRepo;
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const productData = {
        code: 'PROD-001',
        name: 'Test Product',
        category: 'Electronics',
        costPrice: 10000,
        salePrice: 15000,
        minimumStock: 10,
      };

      mockRepo.findByCode.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: '1', ...productData } as any);

      const result = await service.create(productData, 'user-id');

      expect(mockRepo.findByCode).toHaveBeenCalledWith('PROD-001');
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining(productData));
      expect(result).toHaveProperty('id');
    });

    it('should throw ConflictError if code already exists', async () => {
      const productData = {
        code: 'PROD-001',
        name: 'Test Product',
        category: 'Electronics',
        costPrice: 10000,
        salePrice: 15000,
      };

      mockRepo.findByCode.mockResolvedValue({ id: '1', code: 'PROD-001' } as any);

      await expect(service.create(productData, 'user-id')).rejects.toThrow(ConflictError);
    });
  });

  describe('getById', () => {
    it('should return product if found', async () => {
      const product = { id: '1', code: 'PROD-001', name: 'Test' };
      mockRepo.findById.mockResolvedValue(product as any);

      const result = await service.getById('1');

      expect(result).toEqual(product);
    });

    it('should throw NotFoundError if product not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getById('999')).rejects.toThrow(NotFoundError);
    });
  });
});
```

### 13.3 Testes de Integração (API)

```typescript
// apps/api/src/__tests__/integration/products.test.ts

import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database';
import { generateToken } from '../../utils/jwt';

describe('Products API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup: criar usuário de teste
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        passwordHash: 'hash',
        name: 'Test User',
        role: 'MANAGER',
      },
    });

    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email, role: user.role });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/v1/products', () => {
    it('should create a new product', async () => {
      const productData = {
        code: 'TEST-001',
        name: 'Test Product',
        category: 'Test',
        costPrice: 10000,
        salePrice: 15000,
        minimumStock: 10,
      };

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.code).toBe('TEST-001');
    });

    it('should return 409 if code already exists', async () => {
      const productData = {
        code: 'TEST-001',
        name: 'Duplicate',
        category: 'Test',
        costPrice: 10000,
        salePrice: 15000,
      };

      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(409);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/products')
        .send({ code: 'TEST-002', name: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should list products with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/v1/products?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.products.length).toBeGreaterThan(0);
    });
  });
});
```

### 13.4 Testes Frontend (React Testing Library)

```typescript
// apps/web/src/components/domain/__tests__/ProductCard.test.tsx

import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { Product, ProductStatus } from '@ejr/shared-types';

describe('ProductCard', () => {
  const mockProduct: Product = {
    id: '1',
    code: 'PROD-001',
    name: 'Test Product',
    category: 'Electronics',
    costPrice: 10000,
    salePrice: 15000,
    currentStock: 50,
    minimumStock: 10,
    status: ProductStatus.ACTIVE,
    imageUrls: [],
    warrantyMonths: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should render product information', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('PROD-001')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });

  it('should show low stock badge when stock is below minimum', () => {
    const lowStockProduct = { ...mockProduct, currentStock: 5 };
    render(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText(/estoque baixo/i)).toBeInTheDocument();
  });

  it('should show out of stock badge when stock is zero', () => {
    const outOfStockProduct = { ...mockProduct, currentStock: 0 };
    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText(/sem estoque/i)).toBeInTheDocument();
  });
});
```

### 13.5 Testes E2E (Cypress - Opcional)

```typescript
// cypress/e2e/quote-flow.cy.ts

describe('Quote Creation Flow', () => {
  beforeEach(() => {
    // Login
    cy.visit('/login');
    cy.get('input[name="email"]').type('sales@ejr.com');
    cy.get('input[name="password"]').type('sales123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should create a quote successfully', () => {
    // Navegar para criar orçamento
    cy.visit('/quotes/new');

    // Selecionar cliente
    cy.get('[data-testid="customer-select"]').click();
    cy.contains('Cliente Teste').click();

    // Adicionar produto
    cy.get('[data-testid="add-product-button"]').click();
    cy.get('[data-testid="product-select"]').click();
    cy.contains('Produto Teste').click();
    cy.get('[data-testid="quantity-input"]').type('2');
    cy.get('[data-testid="add-item-button"]').click();

    // Definir validade
    cy.get('[data-testid="valid-until-input"]').type('2025-12-31');

    // Salvar
    cy.get('[data-testid="save-quote-button"]').click();

    // Verificar sucesso
    cy.contains('Orçamento criado com sucesso').should('be.visible');
    cy.url().should('match', /\/quotes\/[a-z0-9-]+$/);
  });
});
```

---

## 14. PADRÕES DE CÓDIGO

### 14.1 Convenções de Nomenclatura

**TypeScript:**
- **Classes:** PascalCase (`ProductsService`, `User`, `QuoteItem`)
- **Interfaces/Types:** PascalCase (`CreateProductDTO`, `AuthRequest`)
- **Functions:** camelCase (`createProduct`, `calculateTotal`)
- **Variables:** camelCase (`userId`, `productList`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_BASE_URL`)
- **Files:** kebab-case (`products.service.ts`, `use-products.ts`)

**React:**
- **Components:** PascalCase (`ProductCard.tsx`, `LoginPage.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useAuth.ts`, `useProducts.ts`)
- **Props:** PascalCase para interfaces (`ButtonProps`, `ProductCardProps`)

### 14.2 Estrutura de Arquivos

**Backend Service Pattern:**

```typescript
// apps/api/src/services/products.service.ts

import { ProductsRepository } from '../repositories/products.repository';
import { CreateProductDTO, Product } from '@ejr/shared-types';

export class ProductsService {
  private repo: ProductsRepository;

  constructor() {
    this.repo = new ProductsRepository();
  }

  async create(data: CreateProductDTO, userId: string): Promise<Product> {
    // Business logic here
  }

  async getById(id: string): Promise<Product> {
    // Business logic here
  }

  // ... other methods
}
```

**Frontend Hook Pattern:**

```typescript
// apps/web/src/features/products/hooks/useProducts.ts

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProducts(params = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await api.get('/products', { params });
      return response.data.data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/products', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### 14.3 ESLint Configuration

```javascript
// .eslintrc.js

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### 14.4 Prettier Configuration

```json
// .prettierrc

{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

## 15. TRATAMENTO DE ERROS

### 15.1 Custom Error Classes

```typescript
// apps/api/src/utils/errors.ts

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

### 15.2 Error Handler Middleware

```typescript
// apps/api/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // App errors (custom)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists',
        },
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
    }
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

### 15.3 Frontend Error Handling

```typescript
// apps/web/src/lib/api.ts

import axios from 'axios';
import { toast } from 'sonner';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 'Erro inesperado';

    if (error.response?.status === 401) {
      toast.error('Sessão expirada');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('Sem permissão');
    } else if (error.response?.status >= 500) {
      toast.error('Erro no servidor');
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);
```

---

## 16. MONITORAMENTO E OBSERVABILIDADE

### 16.1 Logging (Winston)

```typescript
// apps/api/src/config/logger.ts

import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || '/var/log/ejr';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File: errors only
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // File: all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});
```

### 16.2 Health Checks

```typescript
// apps/api/src/routes/health.routes.ts

import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
```

### 16.3 Metrics Collection (Optional - Prometheus)

```typescript
// apps/api/src/middleware/metrics.ts

import promClient from 'prom-client';

const register = new promClient.Registry();

// HTTP request duration histogram
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request counter
export const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

export { register };
```

---

## 17. CONCLUSÃO

Este documento apresenta a **arquitetura fullstack completa** do **EJR Organizador**, um sistema de gestão empresarial moderno, escalável e focado em automação.

### 17.1 Destaques da Arquitetura

✅ **TypeScript Full-Stack** - Type safety do banco de dados ao frontend
✅ **Monorepo com pnpm** - Código compartilhado e builds otimizados
✅ **Prisma ORM** - Queries type-safe e migrations automáticas
✅ **React 18 + TanStack Query** - UI moderna com server state management
✅ **JWT + RBAC** - Segurança robusta com 6 níveis de acesso
✅ **Automated Jobs** - Alertas, backups e relatórios automatizados
✅ **VPS Deployment** - Infraestrutura simples e custo-efetiva
✅ **Comprehensive Testing** - Unit, integration e E2E coverage

### 17.2 Próximos Passos

1. **Desenvolvimento Fase 1 (MVP)** - Implementar stories 1.1 a 5.6 do PRD
2. **Setup de Ambiente** - Configurar repositório, CI/CD e ambientes
3. **Database Migration** - Executar Prisma migrations no ambiente de dev
4. **Implementação Incremental** - Seguir ordem dos epics do PRD
5. **Testes Contínuos** - Escrever testes em paralelo ao desenvolvimento
6. **Deploy Gradual** - Staging → Production com monitoramento

---

**Documento gerado por:** Winston (BMad Architect Agent)
**Framework:** BMad Method
**Projeto:** EJR Organizador - Sistema de Gestão Empresarial
**Data:** 15 de Novembro de 2025
**Versão:** 1.0

---

*Para implementação, consulte:*
- **PRD:** `/docs/prd.md`
- **User Stories:** `/docs/stories/`
- **Coding Standards:** `/docs/architecture/coding-standards.md`
- **Tech Stack:** `/docs/architecture/tech-stack.md`

Documento salvo! Continuarei criando as seções restantes em uma próxima mensagem devido ao tamanho. Posso prosseguir?