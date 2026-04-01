# Production Repositories Migration Guide

## Migration Status

### production-orders.repository.ts ✅ COMPLETED
- **File:** `/home/eloir/Projetos/EJR_Organizador_11_12_2025_17_44/EJR Organizador/EJROrganizador/apps/api/src/repositories/production-orders.repository.ts`
- **Status:** Fully migrated from Supabase to PostgreSQL
- **Remaining Supabase references:** 0
- **Total lines:** 640

**Migrated Methods:**
1. ✅ findMany() - Pagination with filters
2. ✅ findById() - Single record fetch
3. ✅ create() - Insert with sequential order number generation
4. ✅ update() - Dynamic UPDATE with status-based date handling
5. ✅ delete() - Simple DELETE
6. ✅ getMaterialConsumption() - Fetch with JOIN
7. ✅ createMaterialConsumption() - INSERT with nested fetch
8. ✅ updateMaterialConsumption() - Dynamic UPDATE
9. ✅ getOperations() - Simple SELECT with ORDER
10. ✅ getReportings() - Simple SELECT with ORDER
11. ✅ createReporting() - INSERT with defaults
12. ✅ generateOrderNumber() - Private helper for sequential numbers
13. ✅ mapToProductionOrder() - Updated mapper for flattened JOIN results
14. ✅ mapToMaterialConsumption() - Mapper (unchanged)
15. ✅ mapToOperation() - Mapper (unchanged)
16. ✅ mapToReporting() - Mapper (unchanged)

**Key Changes Made:**
- Replaced `import { supabase }` with `import { db }`
- Converted all `.from().select()` to `db.query()`
- Used parameterized queries ($1, $2, etc.) throughout
- Converted Supabase auto-joins to explicit LEFT JOINs
- Updated mappers to handle flattened column names (e.g., `product_code`, `product_name`)
- Proper error handling with try-catch where needed
- All async operations return proper types

---

### production-batches.repository.ts ⚠️ PARTIALLY MIGRATED
- **File:** `/home/eloir/Projetos/EJR_Organizador_11_12_2025_17_44/EJR Organizador/EJROrganizador/apps/api/src/repositories/production-batches.repository.ts`
- **Status:** Partially migrated - foundational methods completed
- **Remaining Supabase references:** 54 (out of ~80)
- **Total lines:** 1622
- **Backup:** `production-batches.repository.ts.backup`

**Migrated Methods:**
1. ✅ Import statement - Changed to `import { db }`
2. ✅ findMany() - Pagination with multiple filters and JOINs
3. ✅ findById() - Complex query with 3 LEFT JOINs
4. ✅ create() - INSERT with RPC call for batch number generation

**Methods Requiring Migration:**
The remaining methods follow similar patterns. Here's a categorized breakdown:

#### Production Batches (Lines 167-271)
- [ ] update() - Currently at line 167 - Partially started
- [ ] delete() - Simple DELETE
- [ ] releaseBypassTrigger() - RPC call fallback pattern

#### Production Units (Lines 272-432)
- [ ] findUnitsByBatchId() - SELECT with JOINs
- [ ] findUnitById() - SELECT with nested JOINs
- [ ] updateUnit() - Dynamic UPDATE
- [ ] assignUnit() - Complex UPDATE with history

#### Unit Components (Lines 433-527)
- [ ] findComponentsByUnitId() - SELECT with multiple JOINs
- [ ] updateComponent() - UPDATE with conditional logic
- [ ] mountAllComponents() - Batch UPDATE with RPC fallback

#### Unit Tests (Lines 528-605)
- [ ] findTestsByUnitId() - SELECT with JOIN
- [ ] createTest() - INSERT with conditional UPDATE on unit

#### Production History (Lines 606-649)
- [ ] getHistory() - SELECT with JOIN
- [ ] addHistory() - Private INSERT helper

#### My Production (Lines 650-779)
- [ ] findMyUnits() - Complex with batch fetching to avoid N+1
- [ ] getMyProductionSummary() - Aggregation query

#### Batch Summary (Lines 780-836)
- [ ] getBatchSummary() - Aggregate data
- [ ] getUnitsSummary() - Multiple fetches with aggregation

#### Manual Unit Creation (Lines 837-1047)
- [ ] syncBOMComponents() - Multiple queries with batch INSERT
- [ ] generateSerialNumbers() - Complex SELECT with MAX
- [ ] createUnitsManually() - Batch INSERT with BOM sync

#### Component Release (Lines 1048-1358)
- [ ] findComponentsForRelease() - SELECT with grouping
- [ ] releaseComponent() - Transaction-like: UPDATE stock + UPDATE component + INSERT history
- [ ] releaseMultipleComponents() - Loop with error collection
- [ ] getReleaseHistory() - SELECT with JOINs
- [ ] getReleaseSummaryByPart() - Complex aggregation

#### Stock Integration (Lines 1359-1478)
- [ ] consumeStock() - Loop with UPDATE per component
- [ ] addFinishedToStock() - UPDATE with INSERT into movements

#### Mappers (Lines 1479-1616)
- [ ] mapToBatch() - Needs column name updates
- [ ] mapToUnit() - Needs column name updates
- [ ] mapToComponent() - Needs column name updates
- [ ] mapToTest() - Needs column name updates
- [ ] mapToHistory() - Needs column name updates

---

## Migration Patterns Applied

### 1. Basic SELECT
```typescript
// Before
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', value);

// After
const result = await db.query(
  'SELECT * FROM table_name WHERE field = $1',
  [value]
);
const data = result.rows;
```

### 2. SELECT with JOIN
```typescript
// Before
const { data } = await supabase
  .from('production_batches')
  .select('*, products(code, name)')
  .eq('id', id)
  .single();

// After
const query = `
  SELECT
    pb.*,
    p.code as product_code,
    p.name as product_name
  FROM production_batches pb
  LEFT JOIN products p ON pb.product_id = p.id
  WHERE pb.id = $1
`;
const result = await db.query(query, [id]);
const data = result.rows[0] || null;
```

### 3. INSERT with RETURNING
```typescript
// Before
const { data } = await supabase
  .from('table_name')
  .insert({ field1: val1, field2: val2 })
  .select()
  .single();

// After
const query = `
  INSERT INTO table_name (field1, field2)
  VALUES ($1, $2)
  RETURNING *
`;
const result = await db.query(query, [val1, val2]);
const data = result.rows[0];
```

### 4. UPDATE with Dynamic Fields
```typescript
// Before
const updateData = {};
if (dto.field1) updateData.field1 = dto.field1;
if (dto.field2) updateData.field2 = dto.field2;
const { data } = await supabase
  .from('table_name')
  .update(updateData)
  .eq('id', id)
  .select()
  .single();

// After
const updates = [];
const values = [];
let paramCounter = 1;

if (dto.field1 !== undefined) {
  updates.push(`field1 = $${paramCounter++}`);
  values.push(dto.field1);
}
if (dto.field2 !== undefined) {
  updates.push(`field2 = $${paramCounter++}`);
  values.push(dto.field2);
}

if (updates.length === 0) {
  return await this.findById(id);
}

values.push(id);
const query = `
  UPDATE table_name
  SET ${updates.join(', ')}
  WHERE id = $${paramCounter}
  RETURNING *
`;
const result = await db.query(query, values);
const data = result.rows[0];
```

### 5. DELETE
```typescript
// Before
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);

// After
await db.query('DELETE FROM table_name WHERE id = $1', [id]);
```

### 6. RPC Function Calls
```typescript
// Before
const { data, error } = await supabase
  .rpc('function_name', { param1: val1, param2: val2 });

// After
const result = await db.query(
  'SELECT function_name($1, $2) as result',
  [val1, val2]
);
const data = result.rows[0]?.result;
```

### 7. Pagination
```typescript
// Before
const { data, count } = await supabase
  .from('table_name')
  .select('*', { count: 'exact' })
  .range((page - 1) * limit, page * limit - 1);

// After
// Count query
const countResult = await db.query('SELECT COUNT(*) FROM table_name');
const total = parseInt(countResult.rows[0].count, 10);

// Data query
const offset = (page - 1) * limit;
const dataResult = await db.query(
  'SELECT * FROM table_name LIMIT $1 OFFSET $2',
  [limit, offset]
);
const data = dataResult.rows;
```

### 8. Nested Queries (N+1 Problem Solution)
```typescript
// Before (Supabase auto-fetches relations)
const { data: units } = await supabase
  .from('units')
  .select('*, components(*)')
  .eq('batch_id', batchId);

// After (Manual batch fetch)
// Fetch units
const unitsResult = await db.query(
  'SELECT * FROM units WHERE batch_id = $1',
  [batchId]
);
const units = unitsResult.rows;

// Fetch all components in one query
const unitIds = units.map(u => u.id);
const componentsResult = await db.query(
  'SELECT * FROM components WHERE unit_id = ANY($1)',
  [unitIds]
);

// Group by unit_id
const componentsByUnit = new Map();
for (const comp of componentsResult.rows) {
  const comps = componentsByUnit.get(comp.unit_id) || [];
  comps.push(comp);
  componentsByUnit.set(comp.unit_id, comps);
}

// Merge
const unitsWithComponents = units.map(unit => ({
  ...unit,
  components: componentsByUnit.get(unit.id) || [],
}));
```

---

## Next Steps for Completing production-batches.repository.ts

### Option 1: Manual Migration (Recommended for Production)
Continue the pattern established in the partially migrated file:

1. Update the `update()` method (line 167)
2. Update `delete()` and `releaseBypassTrigger()` methods
3. Migrate all Production Units methods
4. Migrate Unit Components methods
5. Migrate Unit Tests methods
6. Update all mapper functions to handle flattened column names
7. Test each section thoroughly

### Option 2: Automated Script (Faster but requires testing)
A sed/awk script could handle many of the simple patterns, but complex queries with multiple JOINs require manual attention.

### Critical Sections Requiring Special Attention

#### 1. releaseBypassTrigger() (Line 233)
This method tries an RPC function and falls back to manual updates. Migration:
```typescript
const result = await db.query(
  'SELECT release_batch_bypass_trigger($1, $2) as success',
  [id, userId]
).catch(() => null);

if (result?.rows[0]?.success) {
  return await this.findById(id);
}

// Fallback: manual update
const previousResult = await db.query(
  'SELECT status FROM production_batches WHERE id = $1',
  [id]
);
const previousStatus = previousResult.rows[0]?.status;

await db.query(
  'UPDATE production_batches SET actual_start_date = $1 WHERE id = $2',
  [new Date().toISOString(), id]
);

await db.query(
  'UPDATE production_batches SET status = $1 WHERE id = $2',
  ['RELEASED', id]
);

await this.addHistory('BATCH', id, 'STATUS_CHANGED', previousStatus, 'RELEASED', userId);
return await this.findById(id);
```

#### 2. findMyUnits() (Line 650)
Uses batch fetching to avoid N+1. Current Supabase code already optimizes this well. Migration needs to preserve the batch fetch pattern.

#### 3. releaseComponent() (Line 1095)
Transaction-like operation that:
- Checks stock
- Updates stock (-quantity)
- Updates component
- Inserts release history
- Inserts inventory movement

Consider wrapping in a transaction:
```typescript
const client = await db.connect();
try {
  await client.query('BEGIN');

  // Check stock
  const stockResult = await client.query(
    'SELECT current_stock FROM products WHERE id = $1',
    [partId]
  );

  // Update stock
  await client.query(
    'UPDATE products SET current_stock = current_stock - $1 WHERE id = $2',
    [quantity, partId]
  );

  // Update component
  await client.query(
    'UPDATE unit_components SET is_released = true, released_quantity = $1 WHERE id = $2',
    [quantity, componentId]
  );

  // Insert history
  await client.query(
    'INSERT INTO component_releases (...) VALUES (...)',
    [...]
  );

  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

---

## Mapper Function Updates

All mapper functions need to be updated to handle the new flattened column naming from JOIN queries:

### mapToBatch() Example
```typescript
// Before
product: data.product ? {
  id: data.product.id,
  code: data.product.code,
  name: data.product.name,
  isAssembly: data.product.is_assembly,
} : undefined,

// After
product: data.product_code ? {
  id: data.product_id_alias,
  code: data.product_code,
  name: data.product_name,
  isAssembly: data.product_is_assembly,
} : undefined,
```

### mapToUnit() Example
```typescript
// Before
assignedUser: data.assigned_user ? {
  id: data.assigned_user.id,
  name: data.assigned_user.name,
} : undefined,

// After
assignedUser: data.assigned_user_id ? {
  id: data.assigned_user_id,
  name: data.assigned_user_name,
} : undefined,
```

---

## Testing Checklist

After migration, test each endpoint:

### Production Orders
- [ ] GET /api/production-orders (pagination, filters)
- [ ] GET /api/production-orders/:id
- [ ] POST /api/production-orders
- [ ] PUT /api/production-orders/:id
- [ ] DELETE /api/production-orders/:id
- [ ] GET /api/production-orders/:id/materials
- [ ] POST /api/production-orders/:id/materials
- [ ] PUT /api/production-orders/materials/:id
- [ ] GET /api/production-orders/:id/operations
- [ ] GET /api/production-orders/:id/reportings
- [ ] POST /api/production-orders/:id/reportings

### Production Batches (After Full Migration)
- [ ] GET /api/production-batches
- [ ] GET /api/production-batches/:id
- [ ] POST /api/production-batches
- [ ] PUT /api/production-batches/:id
- [ ] DELETE /api/production-batches/:id
- [ ] POST /api/production-batches/:id/release
- [ ] GET /api/production-batches/:id/units
- [ ] PUT /api/production-units/:id
- [ ] POST /api/production-units/:id/assign
- [ ] GET /api/production-units/:id/components
- [ ] PUT /api/unit-components/:id
- [ ] POST /api/production-units/:id/mount-all
- [ ] GET /api/production-units/:id/tests
- [ ] POST /api/production-units/:id/tests
- [ ] GET /api/my-production
- [ ] POST /api/production-batches/:id/release-components
- [ ] POST /api/production-batches/:id/consume-stock

---

## Summary

✅ **production-orders.repository.ts** is fully migrated and ready for use.

⚠️ **production-batches.repository.ts** requires completion:
- 3 methods migrated (findMany, findById, create)
- 54 Supabase references remaining
- Follow the patterns established in production-orders.repository.ts
- Pay special attention to transaction-like operations
- Update all mapper functions
- Test thoroughly after each section

The migration patterns are consistent and well-documented. The remaining work is methodical but requires attention to detail, especially for complex queries and transaction-like operations.
