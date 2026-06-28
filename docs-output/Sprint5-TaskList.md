# Sprint 5 Task List: Reports, Commission & Expenses

**Goal:** All business intelligence reports are functional. Expenses can be recorded and tracked. The owner can analyze daily, weekly, and monthly summaries of sales, profit, commission, cash flow, and inventory valuation.

---

## 📋 Task Breakdown

### Phase 5.1: Backend IPC Handlers & Data Layer
- [x] **Task 5.1: Implement Expenses IPC (`expenses.ipc.js`) & Preload Bridge**
  - Create database handlers for `expenses:create`, `expenses:list` (with date range & category filtering), `expenses:update`, and `expenses:delete`.
  - Log all expense creations, modifications, and deletions to `audit_log`.
  - Register channel handlers in `src/main/index.js` and expose methods via `window.electronAPI.expenses`.

- [ ] **Task 5.2: Implement Reports & Audit Log IPC (`reports.ipc.js`)**
  - Implement aggregation query handlers:
    - `reports:salesSummary(startDate, endDate, salespersonId)`: Sales list with item counts and aggregated totals.
    - `reports:profitSummary(startDate, endDate)`: Single-row net profit calculation (`Revenue - COGS - Expenses`).
    - `reports:commissionSummary(month, salespersonId)` & `reports:markCommissionPaid(month, salespersonId)`: Commission breakdown per salesperson excluding reversed returns.
    - `reports:inventoryValuation()`: Active stock × wholesale/retail prices generating total asset valuation.
    - `reports:topArticles(startDate, endDate, limit)`: Bestselling articles sorted by quantity sold.
    - `reports:expenseSummary(startDate, endDate)`: Category-wise expense subtotals.
    - `reports:dailyCashFlow()`: Today's cash inflows (sales/exchanges) minus cash outflows (refunds).
    - `audit:list(filters)`: Paginated query fetching historical action logs.
  - Expose all reporting endpoints in `src/preload/index.js`.

### Phase 5.2: Frontend UI & Reporting Hub
- [ ] **Task 5.3: Build Expenses Management UI (`src/renderer/src/pages/Expenses.jsx`)**
  - Build intuitive expense entry form (Category dropdown, Amount, Date picker, Description/Notes).
  - Create dynamic data table displaying expenses with filtering by date range and category.
  - Add summary KPI card showing selected period's total expenditure.
  - Register navigation route and sidebar link.

- [ ] **Task 5.4: Enhance Commission Report UI (`src/renderer/src/pages/Commissions.jsx`)**
  - Upgrade commission view to display monthly aggregated earnings per salesperson.
  - Add expandable drill-down rows showing individual sale item attributions.
  - Implement interactive "Mark as Paid" action updating database status and refreshing UI.

- [ ] **Task 5.5: Build Comprehensive Reports Hub (`src/renderer/src/pages/Reports.jsx`)**
  - Construct a tabbed reporting suite covering Sales Summary, Profit & Loss, Stock Valuation, Top Articles, and Expense Breakdown.
  - Integrate global date range selectors.
  - Implement clean `@media print` styling and a prominent "Print Report" action button for physical document output.

- [ ] **Task 5.6: Upgrade Live Dashboard KPIs & Cash Flow Widget (`src/renderer/src/pages/Dashboard.jsx`)**
  - Connect real-time database queries to populate KPI cards: Today's Revenue, Today's Profit, Total Inventory Value, Outstanding Commissions, and Low Stock alerts.
  - Embed Daily Cash Flow breakdown widget showing net cash position.

- [ ] **Task 5.7: Build Audit Log Viewer (`src/renderer/src/pages/AuditLog.jsx`)**
  - Develop read-only audit inspection interface displaying timestamps, action types, entities, and change descriptions.
  - Add search and action-type dropdown filters.

### Phase 5.3: Acceptance Verification
- [ ] **Task 5.8: Sprint 5 End-to-End Verification & Acceptance Testing**
  - Verify financial math: Ensure Profit Report exactly matches `Revenue - COGS - Expenses`.
  - Verify Commission exclusions: Confirm returned/reversed items deduct from salesperson payouts.
  - Verify inventory valuation totals against stock quantities.

---

## 🚦 Execution Control
- **Current Status:** Task 5.1 Completed. Ready for Task 5.2.
- Waiting for user command ("implementation call") to begin **Task 5.2: Implement Reports & Audit Log IPC (`reports.ipc.js`)**.
