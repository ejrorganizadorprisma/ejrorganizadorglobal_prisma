# EJR Organizador - Extended Manufacturing & Production Features

**Document Type:** PRD Extension - Manufacturing Module
**Version:** 1.0
**Date:** November 16, 2025
**Status:** Future Enhancement - Post-MVP

---

## Overview

This document extends the base PRD with comprehensive manufacturing, production, and procurement capabilities identified in `prd-produto.txt`. These features transform the system from inventory management to a full Manufacturing ERP.

**Note:** These features are **NOT part of the MVP scope** defined in the main PRD. They represent the next evolution of the system to support manufacturing operations.

---

## 1. Enhanced Product Structure

### 1.1 Product Type Differentiation

**Requirement:** System shall support two distinct product types with different behaviors and workflows.

#### Final Products (Produtos Finais)
Products sold to customers that are assembled from components.

**Fields:**
- All existing product fields from base PRD
- **product_type:** ENUM ('FINAL', 'COMPONENT')
- **version:** String (e.g., "v1.0", "v1.1", "v2.0")
- **status:** ENUM ('DEVELOPMENT', 'PRODUCTION', 'ACTIVE', 'DISCONTINUED')
- **primary_supplier_id:** Foreign key to suppliers (single supplier)
- **bom_id:** Reference to Bill of Materials
- **cost_price:** Auto-calculated from BOM (read-only)

**Rules:**
- Final products cannot be marked as components of other products
- Cost price calculated automatically from BOM components sum
- Stock increases via Production Orders, not direct purchases
- Changing BOM automatically recalculates cost
- Sold to customers in sales workflow

#### Components/Parts (Componentes/Peças)
Raw materials, parts, or semi-finished goods used to assemble final products.

**Fields:**
- name, code, category, description
- **product_type:** 'COMPONENT'
- current_stock, minimum_stock
- **technical_description:** Text
- **warehouse_location:** String (e.g., "A-12-3", "Shelf B2")
- **lead_time_days:** Integer (supplier delivery time)
- **minimum_lot_quantity:** Integer (minimum purchase quantity)
- **alternative_component_ids:** Array of component IDs (substitutes)
- **cost_price:** Updated from latest purchase

**Rules:**
- Components can have multiple suppliers (many-to-many relationship)
- Stock increases via purchases, decreases via production consumption
- Supplier selected at purchase time, not predetermined
- Can be marked as alternatives to each other

---

## 2. BOM (Bill of Materials) System

### 2.1 BOM Structure

**Requirement:** System shall maintain BOM that links final products to required components with quantities and waste calculations.

**Data Model - bom_items table:**
```
- id: TEXT PRIMARY KEY
- final_product_id: TEXT (FK to products where type = FINAL)
- component_id: TEXT (FK to products where type = COMPONENT)
- quantity_required: DECIMAL (quantity per unit of final product)
- waste_percentage: DECIMAL (expected loss/waste, e.g., 5.0 for 5%)
- effective_quantity: DECIMAL (calculated: quantity_required * (1 + waste_percentage/100))
- notes: TEXT (assembly notes)
- created_at, updated_at
```

### 2.2 BOM Functionality

**FR-BOM-1:** System shall allow creating BOM by selecting components and specifying quantities per unit of final product

**FR-BOM-2:** System shall calculate effective quantity including waste percentage
- Example: 10 units needed + 5% waste = 10.5 effective units

**FR-BOM-3:** System shall automatically calculate final product cost price as sum of (component_cost_price × effective_quantity) for all BOM items

**FR-BOM-4:** When component cost price updates, system shall automatically recalculate all affected final product costs

**FR-BOM-5:** System shall support alternative components in BOM (e.g., "Component A OR Component B")

**FR-BOM-6:** System shall validate BOM before production:
- All components available in stock
- Sufficient quantities for production order
- Alert if using alternative components

**FR-BOM-7:** BOM changes shall require approval:
- Manager can create/edit BOM
- Director approval required before BOM becomes active
- Version history maintained

---

## 3. Production & Assembly Module

### 3.1 Production Orders (OP - Ordem de Produção)

**Requirement:** System shall manage production workflow that consumes components and produces final products.

**Data Model - production_orders table:**
```
- id: TEXT PRIMARY KEY
- order_number: TEXT UNIQUE (e.g., "OP-2025-001")
- final_product_id: TEXT (FK to products)
- quantity_to_produce: INTEGER
- status: ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
- created_by_user_id: TEXT
- approved_by_user_id: TEXT
- started_at: TIMESTAMP
- completed_at: TIMESTAMP
- notes: TEXT
```

**Data Model - production_order_components table:**
```
- id: TEXT PRIMARY KEY
- production_order_id: TEXT (FK)
- component_id: TEXT (FK to products)
- quantity_required: DECIMAL (from BOM)
- quantity_used: DECIMAL (actual consumed)
- quantity_wasted: DECIMAL (losses)
- is_alternative: BOOLEAN (if using alternative component)
```

### 3.2 Production Workflow

**FR-PROD-1:** Production user shall create Production Order by:
1. Selecting final product
2. Specifying quantity to produce
3. System auto-populates required components from BOM
4. System validates component availability
5. System reserves components in stock

**FR-PROD-2:** System shall require Director/Manager approval for production orders

**FR-PROD-3:** When OP is started:
- Status changes to IN_PROGRESS
- Components are reserved (not yet consumed)
- Other users see reduced available stock

**FR-PROD-4:** When OP is completed:
- System consumes components from stock (reduces inventory)
- System increases final product stock by quantity produced
- System records actual waste vs expected waste
- Status changes to COMPLETED

**FR-PROD-5:** System shall allow recording losses/waste:
- Quantity wasted per component
- Reason for waste
- Comparison to expected BOM waste percentage
- Alert if waste exceeds BOM expectation by >10%

**FR-PROD-6:** System shall support partial completion:
- Produce fewer units than planned
- Adjust component consumption proportionally

**FR-PROD-7:** System shall alert if:
- Component stock insufficient for OP
- Waste percentage significantly higher than BOM
- Production taking longer than expected (future enhancement)

### 3.3 Production Reports

**FR-PROD-8:** System shall generate production reports:
- Production efficiency (planned vs actual)
- Component consumption by product
- Waste analysis (by component, by product, by time period)
- Production history

---

## 4. Purchase Management Module

### 4.1 Purchase Request & Order Workflow

**Requirement:** System shall manage procurement from request to receipt with multi-supplier comparison and approval workflow.

**Data Model - purchase_requests table:**
```
- id: TEXT PRIMARY KEY
- request_number: TEXT UNIQUE
- component_id: TEXT (FK to products where type = COMPONENT)
- quantity_requested: INTEGER
- reason: TEXT
- requested_by_user_id: TEXT
- status: ENUM ('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED')
- created_at: TIMESTAMP
```

**Data Model - purchase_orders table:**
```
- id: TEXT PRIMARY KEY
- order_number: TEXT UNIQUE (e.g., "PC-2025-001")
- supplier_id: TEXT (FK to suppliers)
- status: ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')
- total_amount: INTEGER (centavos)
- expected_delivery_date: DATE
- created_by_user_id: TEXT
- approved_by_user_id: TEXT
- created_at, updated_at
```

**Data Model - purchase_order_items table:**
```
- id: TEXT PRIMARY KEY
- purchase_order_id: TEXT (FK)
- component_id: TEXT (FK to products)
- quantity_ordered: INTEGER
- unit_price: INTEGER (centavos)
- subtotal: INTEGER (calculated)
- quantity_received: INTEGER (updated on receipt)
```

**Data Model - component_suppliers table (many-to-many):**
```
- id: TEXT PRIMARY KEY
- component_id: TEXT (FK to products)
- supplier_id: TEXT (FK to suppliers)
- last_price: INTEGER (centavos)
- last_purchase_date: DATE
- lead_time_days: INTEGER
- minimum_lot: INTEGER
- is_preferred: BOOLEAN
```

### 4.2 Purchase Workflow

**FR-PURCH-1:** System shall auto-generate purchase suggestions:
- When component stock reaches minimum threshold
- Based on production planning (future)
- Considering lead time and minimum lot sizes

**FR-PURCH-2:** Buyer shall create Purchase Request specifying:
- Component and quantity
- Reason/justification
- Urgency

**FR-PURCH-3:** System shall display supplier comparison for each component:
- All suppliers for that component
- Last price from each supplier
- Historical price trend
- Lead time
- Rating/notes
- Buyer selects preferred supplier

**FR-PURCH-4:** Buyer shall create Purchase Order (PC):
- Add multiple components
- Select supplier for each component (if multiple suppliers)
- Enter negotiated unit prices
- System calculates totals
- Add expected delivery date

**FR-PURCH-5:** Purchase Order approval workflow:
- Orders < R$ 5,000: Manager approval required
- Orders ≥ R$ 5,000: Director approval required
- Buyer receives approval notification

**FR-PURCH-6:** Upon receipt of goods:
- Stock user marks items as received (full or partial)
- System updates component stock
- System updates component cost price (weighted average or last price)
- System recalculates affected final product costs
- Receipt date recorded

**FR-PURCH-7:** System shall track purchase order status:
- DRAFT - Being created
- SENT - Sent to supplier
- CONFIRMED - Supplier confirmed
- PARTIALLY_RECEIVED - Some items received
- RECEIVED - All items received
- CANCELLED - Order cancelled

### 4.3 Purchase Reports

**FR-PURCH-8:** System shall generate purchase reports:
- Supplier comparison (price, delivery time, reliability)
- Price history by component (chart showing price trends)
- Purchase volume by supplier
- Open purchase orders
- Overdue deliveries
- Spend by category/component

---

## 5. Enhanced Supplier Management

### 5.1 Extended Supplier Fields

**Requirement:** Enhance suppliers table with procurement-specific data.

**Additional Fields:**
- **payment_terms:** TEXT (e.g., "30 days", "Net 15", "COD")
- **default_lead_time_days:** INTEGER
- **rating:** DECIMAL (1-5 stars, calculated from delivery performance)
- **is_active:** BOOLEAN
- **minimum_order_value:** INTEGER (centavos)

**FR-SUPP-1:** System shall track supplier performance metrics:
- On-time delivery rate (%)
- Average delivery delay (days)
- Price competitiveness index
- Quality rating (manual input from receipts)

**FR-SUPP-2:** System shall alert when:
- Supplier consistently late (>20% late deliveries)
- Supplier prices increasing significantly (>15% vs market)

---

## 6. R&D Module (Product Development)

### 6.1 Product Development Workflow

**Requirement:** System shall support product development lifecycle from concept to production-ready.

**Product Status Extension:**
- **DEVELOPMENT:** Product being developed, not for sale
- **PRODUCTION:** Prototype phase, limited production
- **ACTIVE:** Fully approved, available for sales
- **DISCONTINUED:** No longer produced/sold

**FR-RD-1:** R&D users shall create products with status DEVELOPMENT:
- All product fields
- Attach technical documentation files
- Create initial BOM
- Track versions (v1.0, v1.1, etc.)

**FR-RD-2:** R&D shall NOT see:
- Cost prices
- Supplier prices
- Margins

**FR-RD-3:** R&D shall track prototypes:
- Prototype number (e.g., P1, P2, P3)
- Production date
- Test results
- Notes/feedback

**FR-RD-4:** Product launch approval workflow:
1. R&D marks product as "Ready for Review"
2. Director reviews:
   - BOM completeness
   - Technical documentation
   - Prototype test results
   - Market viability
3. Director approves → Status changes to ACTIVE
4. Product becomes available for sales

**FR-RD-5:** System shall maintain version history:
- Changes to BOM
- Changes to specifications
- Approval dates
- Notes on changes

**FR-RD-6:** System shall allow attaching files to products:
- Technical specifications (PDF)
- CAD drawings
- Test reports
- Certifications

---

## 7. Enhanced Inventory Management

### 7.1 Reserved Stock

**FR-INV-1:** System shall track reserved stock separately:
- **Physical Stock:** Total in warehouse
- **Available Stock:** Physical - Reserved
- **Reserved Stock:** Allocated to production orders

**FR-INV-2:** When Production Order created:
- System reserves required components
- Available stock decreases, reserved increases
- Physical stock unchanged

**FR-INV-3:** When Production Order completed:
- Reserved stock consumed
- Physical stock decreases
- Final product physical stock increases

**FR-INV-4:** Users shall see:
- Physical stock quantity
- Reserved quantity
- Available quantity (colored warning if low)

### 7.2 Location Tracking

**FR-INV-5:** System shall track component warehouse locations:
- Location code (e.g., "A-12-3", "B-05-1")
- Stock movements update location
- Search by location
- Location-based picking lists for production

---

## 8. Enhanced Role Permissions

### 8.1 New Roles

**COMPRADOR (Buyer):**
- Create purchase requests
- Create purchase orders
- View supplier pricing
- Compare suppliers
- Record receipts
- **Cannot:** Approve own purchases, see final margins, create production orders

**PRODUÇÃO (Production):**
- Create production orders
- Start/complete production
- Record component consumption
- Record waste
- View BOM
- **Cannot:** See costs/prices, approve orders, modify BOM

**P&D (R&D):**
- Create/edit products in DEVELOPMENT status
- Create/edit BOM for development products
- Upload technical files
- Track prototypes
- Submit for approval
- **Cannot:** See costs, approve final launch, create production orders

**ESTOQUISTA (Stock Keeper):**
- Record stock movements (in/out)
- Adjust inventory
- Conduct physical counts
- Update locations
- Receive purchase orders
- **Cannot:** See costs, approve orders, delete movements

### 8.2 Enhanced Existing Roles

**DIRECTOR:**
- Approve purchase orders ≥ R$ 5,000
- Approve BOM changes
- Approve product launches (R&D → ACTIVE)
- Approve production orders
- View all costs and margins
- Access all reports

**MANAGER:**
- Approve purchase orders < R$ 5,000
- Create/edit BOM
- View production costs
- Manage day-to-day operations
- **Cannot:** Approve product launches (Director only)

---

## 9. Enhanced Reporting

### 9.1 New Report Types

**FR-REP-1: Supplier Comparison Report**
- Filters: Component, date range
- Shows: All suppliers, prices, lead times, on-time rates
- Visual: Table with sortable columns
- Export: PDF, Excel

**FR-REP-2: Price History Report**
- Filters: Component, supplier, date range
- Shows: Price changes over time
- Visual: Line chart + table
- Export: PDF, Excel

**FR-REP-3: Component Consumption Report**
- Filters: Component, final product, date range
- Shows: Quantity consumed, waste %, trend
- Visual: Bar chart + table
- Export: PDF, Excel

**FR-REP-4: Production Loss Report**
- Filters: Final product, component, date range
- Shows: Expected vs actual waste by component
- Highlights: Items with >10% excess waste
- Visual: Table with color coding
- Export: PDF, Excel

**FR-REP-5: Purchase Needs Report**
- Auto-generated based on: Stock levels, production planning, lead times
- Shows: Component, current stock, reserved, needed, suggested order qty
- Export: PDF, Excel (can be sent to supplier)

**FR-REP-6: Stock Valuation Report**
- Shows: Component/product, quantity, cost price, total value
- Totals: By category, by type (component vs final)
- Visual: Table with totals
- Export: PDF, Excel

---

## 10. Data Model Summary

### New Tables Required

1. **bom_items** - Bill of materials line items
2. **production_orders** - Production order headers
3. **production_order_components** - Components used in each OP
4. **purchase_requests** - Purchase requisitions
5. **purchase_orders** - Purchase order headers
6. **purchase_order_items** - Line items in purchase orders
7. **component_suppliers** - Many-to-many component-supplier pricing
8. **product_files** - File attachments for products
9. **product_versions** - Version history for products
10. **prototypes** - R&D prototype tracking

### Modified Tables

**products table additions:**
- product_type ENUM ('FINAL', 'COMPONENT')
- version TEXT
- status ENUM ('DEVELOPMENT', 'PRODUCTION', 'ACTIVE', 'DISCONTINUED')
- warehouse_location TEXT (for components)
- lead_time_days INTEGER (for components)
- minimum_lot_quantity INTEGER (for components)
- technical_description TEXT (for components)

**inventory_movements table additions:**
- production_order_id TEXT (FK, optional)
- purchase_order_id TEXT (FK, optional)
- reserved_quantity INTEGER (for tracking reservations)

**suppliers table additions:**
- payment_terms TEXT
- default_lead_time_days INTEGER
- rating DECIMAL
- minimum_order_value INTEGER

---

## 11. Implementation Priority

If implementing post-MVP, recommended order:

### Phase 1: Product Structure & BOM
1. Dual product types (Final vs Component)
2. BOM creation and management
3. Automatic cost calculation
4. Multi-supplier support for components

### Phase 2: Production
5. Production Orders
6. Component reservation
7. Production execution and completion
8. Waste tracking

### Phase 3: Procurement
9. Purchase requests
10. Purchase orders
11. Supplier comparison
12. Receipt workflow

### Phase 4: R&D
13. Product development workflow
14. Versioning
15. File attachments
16. Approval workflow

### Phase 5: Advanced Features
17. Reserved stock visualization
18. Location tracking
19. Advanced reporting
20. Supplier performance metrics

---

## 12. Estimated Effort

**Assumptions:**
- Base MVP complete and stable
- Database migrations planned carefully
- Existing codebase refactorable

**Effort Estimates:**

| Phase | Features | Backend (days) | Frontend (days) | Testing (days) | Total (days) |
|-------|----------|----------------|-----------------|----------------|--------------|
| Phase 1 | Product & BOM | 8 | 10 | 4 | 22 |
| Phase 2 | Production | 10 | 12 | 5 | 27 |
| Phase 3 | Procurement | 12 | 14 | 6 | 32 |
| Phase 4 | R&D | 6 | 8 | 3 | 17 |
| Phase 5 | Advanced | 8 | 10 | 4 | 22 |
| **Total** | | **44** | **54** | **22** | **120 days** |

**Timeline:** ~6 months with 1 full-stack developer
**Timeline:** ~3 months with 2 developers (1 backend + 1 frontend)

---

## 13. Business Impact

**Benefits of Manufacturing Module:**

1. **Complete Production Control:**
   - Know exact costs through BOM
   - Track component consumption
   - Identify waste reduction opportunities
   - Plan production based on component availability

2. **Intelligent Procurement:**
   - Multi-supplier price comparison
   - Automated purchase suggestions
   - Lead time management
   - Cost optimization

3. **Product Innovation:**
   - Structured R&D process
   - Version control
   - Controlled product launches
   - Technical documentation centralized

4. **Cost Accuracy:**
   - Automatic cost calculation from components
   - Real-time cost updates when supplier prices change
   - True margin visibility

5. **Operational Efficiency:**
   - Reserved stock prevents overselling
   - Production orders streamline assembly
   - Approval workflows enforce control
   - Location tracking reduces picking time

**Challenges:**

1. **Complexity:** Significantly more complex than MVP
2. **Data Entry:** Requires diligent BOM creation and maintenance
3. **Training:** Users need training on production/procurement workflows
4. **Migration:** Existing product data needs classification (Final vs Component)

---

## 14. Compatibility with MVP

This extension is designed to be **backward compatible** with the MVP:

- Existing products become "Final Products" by default
- MVP inventory still works (production is optional workflow)
- MVP sales workflow unchanged
- New roles added without breaking existing permissions
- Reports enhanced, not replaced

**Migration Path:**
1. Add new tables
2. Add product_type column (default 'FINAL')
3. Classify existing products as Final or Component
4. Gradually adopt BOM for new products
5. Phase in production orders
6. Enable procurement module

---

## Conclusion

The manufacturing extension transforms EJR Organizador from an inventory/sales system into a comprehensive Manufacturing ERP. While significantly more complex than the MVP, it follows the "think big, start small" philosophy by building on the solid MVP foundation.

**Recommendation:** Complete MVP first, validate with users, then incrementally add manufacturing features based on business priority.
