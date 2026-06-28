# Soni Fashion POS — Sprint 3 (POS Terminal & Sales Engine) Task List

This document tracks the step-by-step implementation of **Sprint 3: POS Terminal & Sales Engine (Days 11 to 17)**.
Each task will be executed sequentially. No task will start until explicitly authorized by the user.

---

## 📋 Sprint 3 Overview
**Goal:** Complete the core billing flow end-to-end. Cashiers select an active salesperson, look up articles via barcode or SKU search, add items to an interactive POS cart with inline quantity and discount adjustments, submit atomic checkout transactions, accrue staff commissions, and trigger silent professional thermal receipts.

---

## 🛠️ Step-by-Step Task Breakdown

### Phase 3.1: Salespersons & Commission Management
- [x] **Task 3.1: Salesperson IPC Handlers (`src/main/ipc/salespersons.ipc.js`)**
  - Implement `salespersons:create`, `salespersons:update`, `salespersons:list` (with active/inactive filtering), and `salespersons:toggleActive`.
  - Remove stubs from `src/main/ipc/stubs.ipc.js` and register handlers in `src/main/index.js`.
  - Ensure all modifications record audit trails via `auditLog()`.

- [x] **Task 3.2: Salesperson Management UI (`src/renderer/src/pages/Salespersons.jsx`)**
  - Build modern glassmorphic dashboard to register store staff, manage contact numbers, and toggle active status.
  - Register route and view component in `src/renderer/src/pages/index.jsx`.

- [x] **Task 3.3: Commissions IPC Handlers (`src/main/ipc/commissions.ipc.js`)**
  - Implement `commissions:setRate` (upserts monthly percentage rates into `commission_rates` table for given salesperson and month).
  - Implement `commissions:getSummary` & `commissions:list` to fetch configured rates and calculated commission earnings.

- [x] **Task 3.4: Commission Configuration UI (`src/renderer/src/pages/Commissions.jsx`)**
  - Build interactive monthly commission rate configurator table allowing managers to assign commission percentages across staff members.

### Phase 3.2: POS Core Sales Engine & State Management
- [x] **Task 3.5: POS Cart Store (`src/renderer/src/store/cartStore.js`)**
  - Build Zustand cart store managing active sale state: selected salesperson, cart line items (SKU, name, wholesale/retail snapshot, editable qty, inline discount), subtotal, total discount, grand total, and payment method.

- [x] **Task 3.6: Sales IPC Handlers (`src/main/ipc/sales.ipc.js`)**
  - Implement atomic `sales:create` database transaction: validates stock availability, decrements article quantities, logs `OUT` stock movements, calculates salesperson commission based on monthly rate, inserts `sales` and `sale_items` records, and generates sequential invoice numbers (`INV-YYYYMMDD-XXXX`).
  - Implement `sales:list` (paginated historical sales ledger) and `sales:get` (invoice lookup).

### Phase 3.3: POS Terminal Interface & Silent Printing
- [x] **Task 3.7: POS Terminal UI (`src/renderer/src/pages/POSSale.jsx`)**
  - Build fast, responsive point-of-sale terminal: mandatory salesperson dropdown, instant debounced SKU/barcode search bar, interactive cart table with real-time totals panel, and one-click "Complete Sale" action.

- [x] **Task 3.8: Silent Thermal Receipt Printing Engine (`src/main/ipc/print.ipc.js` & `receipt.html`)**
  - Create dedicated hidden BrowserWindow for receipt rendering (`src/main/receipt/receipt.html` & preload).
  - Implement `print:receipt` and `print:getPrinters` IPC handlers allowing silent background printing (`webContents.print({ silent: true, deviceName: ... })`) without OS print dialogs.
  - Add thermal printer selection dropdown in `Settings.jsx`.

- [ ] **Task 3.9: Reprint Receipt Modal & Dashboard Integration**
  - Build invoice reprint lookup modal allowing staff to search past invoices and re-trigger thermal receipts.
  - Update `Dashboard.jsx` to display today's live sales count and today's total revenue.

### Phase 3.4: Acceptance Verification
- [ ] **Task 3.10: Sprint 3 End-to-End Verification & Acceptance Testing**
  - Test Case 1: Complete multi-item sale verifying stock depletion and commission accrual.
  - Test Case 2: Verify zero-stock validation blocks checkout.
  - Test Case 3: Verify invoice lookup and reprint flow.

---

## 🚦 Execution Control
- **Current Status:** Task 3.8 Completed. Ready for Task 3.9.
- Waiting for user command ("implementation call") to begin **Task 3.9: Reprint Receipt Modal & Dashboard Integration**.
