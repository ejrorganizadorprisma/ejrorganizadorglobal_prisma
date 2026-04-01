# Production Batches Repository Migration Summary

## Overview
The production-batches.repository.ts file is very large (1600+ lines) and requires comprehensive migration from Supabase to PostgreSQL using the pg library.

## Migration Patterns

### 1. Import Statement
**Before:**
```typescript
import { supabase } from '../config/supabase';
```

**After:**
```typescript
import { db } from '../config/database';
```

### 2. RPC Calls
**Pattern:** `supabase.rpc('function_name', params)`

**Migration:** `db.query('SELECT function_name($1, $2, ...)', [param1, param2, ...])`

**Example - generate_batch_number:**
```typescript
// Before
const { data: batchNumber, error } = await supabase.rpc('generate_batch_number');

// After
const result = await db.query('SELECT generate_batch_number() as batch_number');
const batchNumber = result.rows[0].batch_number;
```

**Example - release_batch_bypass_trigger:**
```typescript
// Before
const { data: rpcResult, error: rpcError } = await supabase
  .rpc('release_batch_bypass_trigger', { p_batch_id: id, p_user_id: userId });

// After
const result = await db.query(
  'SELECT release_batch_bypass_trigger($1, $2) as result',
  [id, userId]
);
const rpcResult = result.rows[0]?.result;
```

### 3. Complex SELECT with JOINs

The file has many complex queries with nested relations. These need to be converted to explicit JOINs.

**Example - findById:**
```typescript
// Before (Supabase auto-joins)
const { data, error } = await supabase
  .from('production_batches')
  .select(`
    *,
    product:products(id, code, name, is_assembly),
    assigned_user:users!production_batches_assigned_to_fkey(id, name),
    created_by_user:users!production_batches_created_by_fkey(id, name)
  `)
  .eq('id', id)
  .single();

// After (explicit JOINs)
const query = `
  SELECT
    pb.*,
    p.id as product_id_alias,
    p.code as product_code,
    p.name as product_name,
    p.is_assembly as product_is_assembly,
    au.id as assigned_user_id,
    au.name as assigned_user_name,
    cu.id as created_by_user_id,
    cu.name as created_by_user_name
  FROM production_batches pb
  LEFT JOIN products p ON pb.product_id = p.id
  LEFT JOIN users au ON pb.assigned_to = au.id
  LEFT JOIN users cu ON pb.created_by = cu.id
  WHERE pb.id = $1
`;
const result = await db.query(query, [id]);
if (result.rows.length === 0) return null;
return this.mapToBatch(result.rows[0]);
```

### 4. INSERT Queries
```typescript
// Before
const { data, error } = await supabase
  .from('production_batches')
  .insert({ ...values })
  .select()
  .single();

// After
const query = `
  INSERT INTO production_batches (col1, col2, ...)
  VALUES ($1, $2, ...)
  RETURNING *
`;
const result = await db.query(query, [val1, val2, ...]);
// Then fetch with joins if needed
return await this.findById(result.rows[0].id);
```

### 5. UPDATE Queries
```typescript
// Before
const { data, error } = await supabase
  .from('production_batches')
  .update(updateData)
  .eq('id', id)
  .select()
  .single();

// After
const updates = [];
const values = [];
let paramCounter = 1;
if (dto.field !== undefined) {
  updates.push(`field = $${paramCounter++}`);
  values.push(dto.field);
}
values.push(id);
const query = `
  UPDATE production_batches
  SET ${updates.join(', ')}
  WHERE id = $${paramCounter}
  RETURNING *
`;
await db.query(query, values);
return await this.findById(id);
```

### 6. DELETE Queries
```typescript
// Before
const { error } = await supabase
  .from('production_batches')
  .delete()
  .eq('id', id);

// After
await db.query('DELETE FROM production_batches WHERE id = $1', [id]);
```

### 7. Mapper Function Updates

The mapper functions need to be updated to handle the new column naming from JOIN queries:

```typescript
// Before (Supabase nested objects)
product: data.product ? {
  id: data.product.id,
  code: data.product.code,
  name: data.product.name,
} : undefined

// After (flattened JOIN columns)
product: data.product_code ? {
  id: data.product_id_alias,
  code: data.product_code,
  name: data.product_name,
} : undefined
```

## Methods Requiring Migration

### Production Batches (Lines 30-249)
- [x] findMany - MIGRATED
- [ ] findById
- [ ] create
- [ ] update
- [ ] delete
- [ ] releaseBypassTrigger

### Production Units (Lines 251-413)
- [ ] findUnitsByBatchId
- [ ] findUnitById
- [ ] updateUnit
- [ ] assignUnit

### Unit Components (Lines 415-509)
- [ ] findComponentsByUnitId
- [ ] updateComponent
- [ ] mountAllComponents

### Unit Tests (Lines 511-587)
- [ ] findTestsByUnitId
- [ ] createTest

### Production History (Lines 589-631)
- [ ] getHistory
- [ ] addHistory (private)

### My Production (Lines 633-762)
- [ ] findMyUnits
- [ ] getMyProductionSummary

### Batch Summary (Lines 764-819)
- [ ] getBatchSummary
- [ ] getUnitsSummary

### Manual Unit Creation (Lines 821-1030)
- [ ] syncBOMComponents
- [ ] generateSerialNumbers
- [ ] createUnitsManually

### Component Release (Lines 1032-1341)
- [ ] findComponentsForRelease
- [ ] releaseComponent
- [ ] releaseMultipleComponents
- [ ] getReleaseHistory
- [ ] getReleaseSummaryByPart

### Stock Integration (Lines 1343-1461)
- [ ] consumeStock
- [ ] addFinishedToStock

### Mappers (Lines 1463-1599)
- [ ] mapToBatch
- [ ] mapToUnit
- [ ] mapToComponent
- [ ] mapToTest
- [ ] mapToHistory

## Estimated Total Changes
- Approximately 80+ Supabase calls to migrate
- 5 mapper functions to update
- 30+ methods to convert

## Due to File Complexity
The production-batches.repository.ts file contains:
- Complex nested queries with multiple table joins
- RPC function calls
- Batch operations
- Transaction-like operations
- Stock management integration

A comprehensive manual migration would require careful attention to each method to ensure data integrity and proper error handling.
