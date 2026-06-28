# Soni Fashion POS — Sprint 2 (Inventory Module) Task List

This document tracks the step-by-step implementation of **Sprint 2: Inventory Module (Days 6 to 10)**.
Each task will be executed sequentially. No task will start until explicitly authorized by the user.

---

## 📋 Sprint 2 Overview
**Goal:** Full supplier and article inventory management. Users can register wholesale suppliers, create articles with auto-generated SKUs (`SF-00001`), record incoming stock shipments atomically, view paginated inventory ledgers, track low-stock alerts, and inspect chronological stock movement histories.

---

## 🛠️ Step-by-Step Task Breakdown

### Phase 2.1: Supplier Management
- [x] **Task 2.1: Supplier IPC Handlers (`src/main/ipc/suppliers.ipc.js`)**
  - Implement `suppliers:create` (enforcing unique supplier code validation before insert).
  - Implement `suppliers:update`, `suppliers:list` (with active/inactive filters), and `suppliers:toggleActive`.
  - Ensure every write operation records a tamper-evident entry via `auditLog()`.
  - Replace stub registrations in `src/main/index.js`.

- [x] **Task 2.2: Suppliers Management UI (`src/renderer/src/pages/Suppliers.jsx`)**
  - Create a new route `/suppliers` (or integrate into Inventory tabs/sidebar).
  - Build a responsive, rich glassmorphic data table listing active suppliers (Name, Code, Contact, Address).
  - Build slide-over drawer / modal form for registering and editing suppliers with validation.

### Phase 2.2: Article & Stock Backend (Main Process)
- [x] **Task 2.3: Article IPC Handlers (`src/main/ipc/articles.ipc.js`)**
  - Implement `articles:create`: validate `wholesale_price > 0` and `retail_price >= wholesale_price`. Auto-increment `last_sku_number` inside a SQLite transaction to generate formatted SKUs (e.g., `SF-00001`).
  - Implement `articles:list`: paginated query supporting filters (`supplier_id`, `category`, `low_stock`, `search`).
  - Implement `articles:update`: snapshot old values to `audit_log` on edits.
  - Implement `articles:toggleActive`: block deactivation if `quantity > 0` (return warning prompt).
  - Implement `articles:search`: fast lookup limit 20 for POS integration.

- [x] **Task 2.4: Stock IN & Ledger Handlers (`src/main/ipc/articles.ipc.js`)**
  - Implement `articles:adjustStock` (or `stockMovements:createShipment`): single atomic transaction receiving multiple items against a supplier.
  - Increment `articles.quantity` for each received item and insert immutable rows into `stock_movements` (type=`IN`).
  - Implement `articles:getStockMovements`: retrieve historical inventory ledger for a selected article.

### Phase 2.3: Inventory Management UI (Renderer)
- [x] **Task 2.5: Articles Inventory Catalog UI (`src/renderer/src/pages/Inventory.jsx`)**
  - Build searchable, filterable data table displaying SKU, Supplier Code, Article Code, Name, Category, Retail Price, and In Stock count.
  - Add visual badges/highlights for rows where `quantity <= reorder_level` (Low Stock Alert).
  - Add "New Article" button opening a comprehensive drawer form.

- [x] **Task 2.6: Stock IN Shipment Receiving UI (`StockInModal.jsx`)**
  - Build shipment receiving interface allowing user to select a supplier, append multiple articles to an incoming shipment manifest, specify received quantities, and submit in one atomic action.

- [x] **Task 2.7: Stock Movement Ledger Viewer (`StockMovementsModal.jsx`)**
  - Build historical inspection modal displaying chronological entries (`IN`, `OUT`, `ADJUST`, `RETURN`, timestamp, reference note) for any clicked article.

### Phase 2.4: Dashboard Integration & QA
- [x] **Task 2.8: Inventory Valuation Dashboard Widget (`src/renderer/src/pages/Dashboard.jsx`)**
  - Update Dashboard page to pull real-time inventory metrics: Total Active Articles, Low Stock Alert Count, and Total Stock Valuation (`SUM(quantity * wholesale_price)`).

- [ ] **Task 2.9: Sprint 2 End-to-End Verification & Acceptance Testing**
  - Test Case 1: Add supplier "suidhaga" (verify code uniqueness block on duplicate).
  - Test Case 2: Add 5 articles (`art101` to `art105`) verifying sequential SKU auto-generation (`SF-00001` to `SF-00005`).
  - Test Case 3: Execute Stock IN shipment receiving 10 units of `SF-00001` (verify `quantity = 10` and movement log entry).
  - Test Case 4: Verify low-stock warning banners and audit log records.

---

## 🚦 Execution Control
- **Current Status:** Task 2.8 Completed. Ready for Task 2.9.
- Waiting for user command ("implementation call") to begin **Task 2.9: Sprint 2 End-to-End Verification & Acceptance Testing**.
