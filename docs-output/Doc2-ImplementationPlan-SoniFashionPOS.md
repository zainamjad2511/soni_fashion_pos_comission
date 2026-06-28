## **SONI FASHION** 

_Qazi Market, Machli Bazar, Daska_ 

## **Point-of-Sale System** 

Development Implementation Plan 

_Version 1.0  |  Phase 1  |  6-Sprint Plan_ 

## **CONFIDENTIAL — For Developer Use Only** 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 1 

## **1. Project Overview** 

|**Property**|**Detail**|
|---|---|
|Project|Soni Fashion POS — Phase 1|
|Business|Ladies clothing retail store, Daska, Punjab|
|Document Purpose|Sprint-by-sprint implementation plan for the assigned developer(s)|
|Estimated Duration|5 to 6 weeks (single developer, full-time)|
|Sprints|6 sprints, approximately 5 working days each|
|Target Deliverable|Windows .exe installer, fully offline, production-ready|
|Reference Document|Doc 1: System Architecture & Requirements Specification v1.0|



This document assumes the developer has read and understood the Architecture & Requirements Specification (Document 1) in full before beginning Sprint 1. All database schema decisions, SKU design, identifier formats, and IPC patterns are defined there and are not repeated in detail here. 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 2 

## **2. Development Environment Setup** 

Complete this section before Sprint 1 begins. Estimated time: 2 to 4 hours. 

## **2.1 Required Tools** 

|**Tool**|**Version**|**Purpose**|**Install Command / Source**|
|---|---|---|---|
|Node.js|20 LTS|Runtime for Electron<br>and build tools|https://nodejs.org (use LTS)|
|Git|Latest|Version control|https://git-scm.com|
|VS Code|Latest|IDE (recommended)|https://code.visualstudio.com|
|npm|Bundled with<br>Node|Package management|Included with Node.js|
|Windows 10/11<br>PC|Target OS|For testing installer and<br>print|Client machine or dev machine|



## **2.2 Project Bootstrap Commands** 

```
# 1. Create project using Electron + Vite + React template
npm create @quick-start/electron soni-fashion-pos -- --template react
cd soni-fashion-pos
# 2. Install core dependencies
npm install better-sqlite3 zustand react-hook-form zod
npm install react-router-dom date-fns lucide-react
# NOTE: react-to-print is NOT used. Silent printing is handled via Electron webContents.print()
# 3. Install dev / build dependencies
npm install -D tailwindcss postcss autoprefixer
npm install -D electron-builder @electron/rebuild
npx tailwindcss init -p
# 4. Rebuild better-sqlite3 for the correct Electron Node version
npx electron-rebuild -f -w better-sqlite3
# 5. Run dev server
npm run dev
```

**NOTE:** better-sqlite3 is a native Node.js addon (C++ compiled). It MUST be rebuilt with electron-rebuild for the exact Electron version used, or the app will crash on launch. This step is mandatory before any DB code is written. 

## **2.3 Key Configuration Files** 

## **electron-builder.yml (in project root):** 

```
appId: com.sonifashion.pos
productName: Soni Fashion POS
directories:
```

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 3 

```
  output: dist-installer
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico
files:
  - "!node_modules/**"
  - "!src/**"
  - out/**
extraResources:
  - resources/**
asarUnpack:
  - "**/*.node"      # Critical: unpacks better-sqlite3 native binary
```

## **Database file location (in main process):** 

```
const { app } = require('electron');
const path    = require('path');
const DB_PATH = path.join(app.getPath('userData'), 'sonifashion.db');
// Windows: C:\Users\<User>\AppData\Roaming\Soni Fashion POS\sonifashion.db
```

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 4 

## **3. Technical Standards & Conventions** 

All code in this project must follow these conventions. They are non-negotiable — they directly protect data integrity and maintainability. 

## **3.1 Database Rules** 

- ALL database access happens exclusively in the Electron Main Process. Zero DB calls from the Renderer. Zero exceptions. 

- ALL multi-step write operations (sale, return, stock-in) are wrapped in a db.transaction(). No multi-step writes without transactions. 

- EVERY write operation also writes a record to audit_log via the shared auditLog() helper function. 

- Soft deletes only: set is_active = 0. Never hard-delete user data records. 

- Prices are always stored as REAL (floating point). Round to 2 decimal places in the UI layer only, never in SQL. 

- All date/time values stored as UTC ISO strings (CURRENT_TIMESTAMP in SQLite = UTC). Display in local time in the UI using date-fns. 

## **3.2 IPC Rules** 

- Every IPC handler returns a consistent envelope: { success: boolean, data?: any, error?: string }. 

- IPC handlers validate all required fields before touching the DB. Return { success: false, error: "..." } for invalid input. 

- Never throw unhandled errors from IPC handlers — always catch and return error envelope. 

## **3.3 UI Rules** 

- All numeric input fields (price, quantity, discount): type="number", min="0", step appropriate to context. Validate on blur. 

- Quantity in cart cannot exceed article.quantity (in-stock). Validate in real-time. 

- All currency values displayed with 2 decimal places and "Rs." prefix. 

- Destructive actions (delete, return, void) require a confirmation dialog before execution. 

- Loading states on all async IPC calls. Disable submit buttons during in-flight calls to prevent double-submission. 

## **3.4 Error Boundary** 

Wrap every page-level component in a React Error Boundary. If a page crashes, the error is displayed without crashing the entire app. The sidebar and navigation remain functional. 

## **3.5 Report Print Styles**

> **NOTE:** This CSS applies to **report pages only** (Sales Report, Profit Report, etc.) which use `window.print()` triggered by a Print button. Receipt printing does NOT use this approach — receipts use Electron's `webContents.print()` via the silent print architecture (see Doc 1 §7.5).

```css
/* report-print.css — applied only when printing a report page */
@media print {
  body * { visibility: hidden; }
  #report-root, #report-root * { visibility: visible; }
  #report-root { position: fixed; top: 0; left: 0; width: 100%; }
  @page { margin: 0.5cm; }
}
```

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 6 

## **4. Sprint Plan** 

|**Sprint**|**Focus Area**|**Days**|**Key Deliverable**|
|---|---|---|---|
|Sprint 1|Foundation: Project setup, SQLite, IPC<br>bridge, Shell UI|1 to 5|Running Electron app with navigation,<br>empty DB with full schema|
|Sprint 2|Inventory Module: Suppliers, Articles,<br>Stock IN|6 to 10|Full inventory management;<br>add/view/edit articles|
|Sprint 3|POS Module: Salespersons, New Sale,<br>Receipt Print|11 to 17|Complete billing flow end-to-end;<br>receipt prints correctly|
|Sprint 4|Returns & Exchange Module|18 to 21|Returns against invoice; stock restored;<br>return receipt printed|
|Sprint 5|Reports, Commission, Expenses|22 to 27|All business reports functional;<br>commission calculations correct|
|Sprint 6|Polish, QA, Packaging, Deployment|28 to 30|Signed .exe installer; client acceptance;<br>production go-live|



Soni Fashion POS — Development Implementation Plan v1.0   |   Page 7 

## **Sprint 1: Foundation (Days 1 to 5)** 

Goal: A running Electron application with the complete database schema, auto-backup, audit service, and navigation shell. No business features yet — just the reliable foundation everything else sits on. 

## **Tasks** 

1. Bootstrap the Electron + Vite + React project using the commands in Section 2.2. Verify the dev server opens a window. 

2. Configure Tailwind CSS. Set up base layout: sidebar (left) + main content area (right). Choose a soft rose/maroon colour palette consistent with Soni Fashion branding. 

3. Set up main process: database.js opens SQLite at the correct AppData path. Apply all 4 PRAGMAs on open (WAL, foreign_keys, synchronous, busy_timeout). 

4. Write the complete schema migration system. migrations.js reads the schema_version from the settings table, runs pending migrations in order. V1 migration creates all 13 tables and all 12 indexes defined in Document 1, Section 6. 

5. Write seed.js: seeds the settings table with all initial key-value pairs on first run (INSERT OR IGNORE pattern). 

6. Write backup.service.js: on app launch, copy the DB file to AppData/backups/ with today's date. Prune files older than 30 days. 

7. Write audit.service.js: a shared function auditLog(db, actionType, entityType, entityId, description, oldValue, newValue) that inserts into audit_log. This function is called by every IPC handler that writes data. 

8. Write preload.js with contextBridge. Expose a skeleton electronAPI object with placeholder channels for all domains: articles, suppliers, sales, returns, reports, salespersons, commissions, expenses, settings. 

9. Write basic IPC handler registration in main.js. At this stage, each handler can return { success: true, data: [] } as a stub. 

10. Build the React Router setup: routes for Dashboard, Inventory, NewSale, Returns, Reports, Expenses, Salespersons, Settings, AuditLog. 

11. Build the sidebar navigation component. Each nav item navigates to its route. Active state highlighted. 

12. Build the Settings page: reads from settings table via IPC, allows editing shop_name, shop_address, shop_contact, receipt_footer. Saves via IPC. 

## **Acceptance Criteria** 

- App launches without errors on Windows. 

- All DB tables exist after first launch. Verified via DB browser. 

- Backup file appears in AppData/backups/ after each launch. 

- Navigating between all pages works without crashing. 

- Settings can be saved and persist after app restart. 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 8 

## **Sprint 2: Inventory Module (Days 6 to 10)** 

Goal: Full supplier and article management. A user can add wholesale suppliers, register articles with auto-generated SKUs, record incoming stock, view current inventory, and see stock movements. 

## **Tasks** 

13. Implement suppliers.ipc.js: handlers for suppliers:create, suppliers:update, suppliers:list, suppliers:deactivate. Validate that supplier code is unique before insert. Audit-log all writes. 

14. Build Suppliers page: table list of all active suppliers (name, code, contact). Add Supplier form (name, code, contact, address, notes). Deactivate button with confirmation dialog. 

15. Implement articles.ipc.js: 

   - articles:create — validate wholesale_price > 0, retail_price >= wholesale_price (warn if not). Auto-generate SKU using the settings table counter inside a transaction. Insert article. Log audit. 

   - articles:list — paginated list with filters: supplier_id, category, low_stock (quantity <= reorder_level), is_active. 

   - articles:update — allow editing name, category, colour, size, retail_price, wholesale_price, reorder_level. Snapshot old value to audit_log. 

   - articles:deactivate — set is_active = 0. Block if quantity > 0 (warn user to adjust stock first). 

   - articles:search — fast search by SKU, name, supplier_article_code for the POS screen (limit 20 results). 

16. Build Articles / Inventory page: searchable table with columns: SKU, Supplier, Article Code, Name, Category, Retail Price, In Stock. Low-stock rows highlighted. Add Article button opens a form drawer. 

17. Build Stock IN flow: user selects a supplier, then adds multiple articles with received quantities. On submit, a single transaction: increments articles.quantity for each item, inserts stock_movements (type=IN) for each item, and logs audit. Think of this as "receiving a shipment from a supplier." 

18. Build Stock Movement Log page (sub-page of Inventory): shows the full stock_movements table for a selected article. Useful for verifying inventory discrepancies. 

19. Add inventory valuation widget to the Dashboard: SUM(quantity * wholesale_price) for all active articles. 

## **Acceptance Criteria** 

- Can add a supplier "suidhaga". Can add 5 articles against it (art101 through art105). SKUs generated correctly as SF-00001 through SF-00005. 

- Stock IN: receive 10 units of SF-00001. article.quantity becomes 10. stock_movements shows one IN record. 

- Cannot add duplicate supplier codes. 

- Cannot add duplicate supplier_article_code within the same supplier. 

- Low-stock alert fires correctly when quantity <= reorder_level. 

- Audit log shows article create, price edit, and stock IN events. 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 9 

## **Sprint 3: POS / Sales Module (Days 11 to 17)** 

Goal: The core billing flow. A cashier selects a salesperson, finds articles, adds them to cart with optional discounts, submits the sale, and prints a professional receipt. This is the most complex and most used part of the system. 

## **Tasks** 

20. Implement salespersons.ipc.js: handlers for salespersons:create, salespersons:update, salespersons:list, salespersons:deactivate. 

21. Build Salespersons management page: list of active salespersons with add/edit forms. 

22. Implement commissions.ipc.js: 

   - commissions:setRate — upserts commission_rates for a given salesperson_id + month + rate_percent. 

   - commissions:getRates — returns all rates for a given month (for the commission configuration UI). 

23. Build Commission Configuration page: table of salespersons with a rate input per month. A month selector at the top switches the month being configured. Save all rates as a batch. 

24. Implement sales.ipc.js: 

   - sales:create — the full atomic transaction described in Document 1, Section 7.4. This is the most critical handler. Test thoroughly. 

   - sales:getByInvoice — retrieves a sale with all line items (for reprint). 

   - sales:list — list of sales with date/salesperson filters. 

25. Build New Sale screen (NewSale.jsx). This is the main POS interface: 

   - Salesperson dropdown at top. Required field — cannot submit without selecting one. 

   - Article search bar: debounced input (300ms delay) calls articles:search. Results shown in a dropdown. 

   - Selecting a result adds it to the cart (Zustand cartStore). Default quantity = 1. Default discount = 0. 

   - Cart table: columns = SKU, Name, Qty (editable inline), Unit Price, Discount (editable inline), Line Total. Live calculation. 

   - Totals panel (right/bottom): Subtotal, Total Discount, Grand Total. Updates on every cart change. 

   - Complete Sale button: submits to sales:create IPC. On success, shows success message + opens receipt for printing. 

   - Clear Cart button: with confirmation. 

26. Build Receipt component (Receipt.jsx): 

   - Header: Shop name, address, contact (from settings). Bold and prominent. 

   - Invoice number, date/time, salesperson name. 

   - Itemised table: SKU, Item Description, Qty, Unit Price, Disc., Line Total. 

   - Totals: Subtotal, Discount, Grand Total. 

   - Footer: configurable thank-you message, return policy line ("Returns accepted with original receipt"). 

   - Print button calls `window.electronAPI.print.receipt(receiptData)` which triggers the `print:receipt` IPC handler in the main process. The receipt renders in the hidden `receipt.html` BrowserWindow and prints silently via `webContents.print({ silent: true })` — no OS print dialog. The `Receipt.jsx` React component is NOT used for printing; receipt layout lives in `receipt.html` + `receipt-preload.js` in the main process.

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 10 

27. Build Reprint Receipt page: input for invoice number, fetches sale via `sales:getByInvoice`, pushes data to the hidden receipt window via `print:receipt` IPC for silent reprint.

27a. Build printer selection in Settings: call `webContents.getPrintersAsync()` via IPC to list installed Windows printers, display a dropdown, and save the chosen printer name to `settings.receipt_printer_name`. This is how the owner selects the thermal printer once — no code change needed when hardware changes.

28. Add today's sales count and today's revenue to the Dashboard. 

## **Acceptance Criteria** 

- Complete a sale: 2 articles, different quantities, one with a discount. Grand total calculated correctly. 

- Receipt prints cleanly on A4. Verify on 80mm thermal if client has one. 

- article.quantity is decremented correctly for each item sold. 

- stock_movements shows OUT records for each item. 

- Commission is calculated and stored correctly based on the configured rate for the current month. 

- Reprinting a past invoice works by invoice number. 

- Cannot sell more than the in-stock quantity (validation blocks it).

- Receipt prints without any dialog on a single button click. Verified on the client's actual thermal printer model.

- Kill the app process mid-sale (Task Manager → End Task). Reopen. Verify DB is in pre-sale state — no partial records.

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 11 

## **Sprint 4: Returns & Exchange Module (Days 18 to 21)** 

Goal: A customer brings a receipt. The cashier finds the original sale, selects which items to return, chooses refund or exchange, and the system restores stock and reverses commission on the returned amount. 

## **Tasks** 

29. Implement returns.ipc.js:

   - `returns:lookupSale` — takes an invoice number, returns the sale with all sale_items including article details and already-returned quantities for each item.

   - `returns:lookupBySku` — takes an article SKU or internal supplier code, returns a list of matching sales (sorted by date) for staff to select from. Uses a JOIN across sales, sale_items, and articles tables.

   - `returns:create` — atomic transaction: (1) generate return number from settings counter; (2) insert returns record (with `original_sale_id = NULL` for manual returns); (3) for each returned item, insert return_items, restore article.quantity, insert stock_movements (RETURN_IN); (4) set commission status = `"reversed"` for the proportional returned amount; (5) if return_type is `'exchange'`, create the new sale record with `exchange_return_id` set, then update the return with `exchange_new_sale_id`; (6) audit-log the return and the new sale. Returns `{ returnNumber, refundCredit, newSaleId, netAmount }`.

30. Build Returns page (Returns.jsx) with a **tabbed lookup UI**:

   - **Tab 1 — Invoice Number:** Input field for invoice number. Submit fetches the sale via `returns:lookupSale`.

   - **Tab 2 — Article SKU Search:** Search by customer-facing SKU (SF-NNNNN) or internal supplier code. Calls `returns:lookupBySku`. Displays a list of matching sales sorted by date — staff selects the correct one.

   - **Tab 3 — Manual Return (No Reference):** Staff picks the article directly from inventory search, enters quantity and refund amount manually. A **mandatory reason note field** must be filled before the Confirm button is enabled. No PIN or secondary dialog — just the note enforced by UI validation. Recorded with `original_sale_id = NULL`.

   Once a sale is selected (from Tab 1 or Tab 2), the flow continues:

   - Display original sale items: Article SKU, Name, Qty Sold, Already Returned, Available to Return, checkbox + qty input. Qty cannot exceed (qty_sold − already_returned).

   - Return type toggle: **Refund / Exchange**.

   - If Exchange: a net-settlement panel shows `Refund Credit` (from returned items) and a cart for new replacement article(s). Updates `Net Amount` live: positive = customer pays, negative = store refunds, zero = even swap.

   - Confirm button shows final settlement preview. On confirm, calls `returns:create`.

   - Print return confirmation receipt (return number, items returned, refund/net settlement amount).

31. Handle exchange type: `returns:create` handles both the return and the new sale atomically in a single transaction (see IPC task above). After completion, the renderer shows the net settlement outcome and offers to print a combined return + new sale receipt.

32. Add validation: a voided sale cannot be used for a return. A sale that has already been fully returned shows "already returned" status. 

33. Add a Returns history list: view all past returns, filterable by date. 

## **Acceptance Criteria** 

- Process a partial return (1 out of 2 items from a sale). Stock for the returned item is restored. Stock for the kept item is unchanged.

- Attempt to return the same item twice — second attempt should show it is already returned.

- Commission on the returned portion is marked "reversed".

- Return receipt prints correctly. The "Original Invoice" field shows the invoice number for normal returns.

- Exchange flow: return item, new sale created atomically. Verify stock movements are correct for both articles.

- **Manual return (Tab 3):** Process a return with no original invoice. Confirm button is disabled until reason note is filled. After submission: stock is restored, `original_sale_id = NULL` in the returns record, `sale_item_id = NULL` in return_items, audit log entry contains the mandatory note. Return receipt prints with "Manual Return — No Original Invoice" in the invoice field.

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 12 

## **Sprint 5: Reports, Commission & Expenses (Days 22 to 27)** 

Goal: All business intelligence reports are functional. Expenses can be recorded. The owner can see daily, weekly, and monthly summaries of sales, profit, commission, and inventory value. 

## **Tasks** 

34. Implement expenses.ipc.js: handlers for expenses:create, expenses:list, expenses:update, expenses:delete (hard delete is fine for expenses — they have no referential dependencies). 

35. Build Expenses page: add expense form (category dropdown, description, amount, date). Expense list with date/category filter. Monthly total shown. 

36. Implement reports.ipc.js with the following query handlers: 

   - reports:salesSummary(startDate, endDate, salespersonId) — list of all sales with invoice, date, salesperson, item count, grand total. Aggregated totals at bottom. 

   - reports:profitSummary(startDate, endDate) — revenue, COGS, gross profit, total expenses, net profit. Single-row result from the aggregate query in Document 1 Section 9.4. 

   - reports:commissionSummary(month, salespersonId) — commission per salesperson with per-sale breakdown and status (pending/paid/reversed). Mark as paid button. 

   - reports:inventoryValuation() — all active articles with current qty, wholesale price, retail price, total cost value, total retail value. Grand totals. 

   - reports:topArticles(startDate, endDate, limit) — articles sorted by qty sold descending, with revenue per article. 

   - reports:expenseSummary(startDate, endDate) — expenses grouped by category with subtotals.

   - `reports:dailyCashFlow` — separates cash flow into: (a) `cash_in_sales` = sum of grand_totals for completed normal sales and exchange-customer-pays sales; (b) `cash_out_refunds` = sum of refund_amounts for refund-type returns and exchange-store-refunds sales; (c) `net_cash` = cash_in − cash_out. Filtered by today's date. Used on the Dashboard daily summary widget.

37. Build Reports section with sub-pages for each report. Each report has date range pickers and a "Print Report" button (window.print() with @media print CSS). 

38. Build Commission Report page specifically: shows each salesperson, their total commission for a selected month, per-sale detail expandable. "Mark as Paid" button updates commission.status to "paid" for that salesperson + month. 

39. Build Dashboard with key KPIs: today's revenue, today's profit (approximate), today's sales count, current inventory value, outstanding commissions total, low-stock count. 

40. Add Audit Log viewer page: paginated table of audit_log, filterable by date range and action_type. Read-only. 

## **Acceptance Criteria** 

- Profit report: revenue minus COGS minus expenses equals net profit. Verify arithmetic manually with known test data. 

- Commission report: reflects correct rate for the month. Reversed commissions from returns are excluded from payable total. 

- Inventory valuation matches manually counted stock × prices. 

- All report pages print cleanly (headers, no sidebar, clean layout). 

- Audit log shows all actions from all previous sprints. 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 13 

## **Sprint 6: Polish, QA & Deployment (Days 28 to 30)** 

Goal: Production-ready installer on the client's PC. Complete QA pass. Client training. Sign-off. 

## **6.1 UI Polish** 

41. Apply final Soni Fashion brand colours throughout (deep rose / maroon primary, soft rose accents). Confirm with client if possible. 

42. Ensure the receipt design is approved by client before finalising. Print a test receipt on their actual printer. 

43. Add the client-provided logo to the receipt header and app title bar once supplied. 

44. Review all form validation messages. They should be in plain Urdu-friendly phrasing where possible. 

45. Confirm all number formatting: prices as "Rs. 1,500.00" (or as client prefers). 

## **6.2 QA Checklist** 

|**Test Case**|**Steps**|**Expected Result**|
|---|---|---|
|Power Failure Mid-Sale|Start a sale, add 2 items. Use Task<br>Manager to kill the process before<br>clicking Complete Sale. Reopen app.|No sale record exists. Stock<br>unchanged. DB intact.|
|Power Failure Post-Sale|Complete a sale. Kill process before<br>receipt appears. Reopen app.|Sale record exists and is complete.<br>Reprint works.|
|Concurrent SKU<br>Prevention|Manually try to insert two articles<br>simultaneously in a test script.|Second insert gets a unique<br>constraint error. No duplicate SKU.|
|Return Quantity<br>Validation|Try to return 5 items from a sale<br>where only 3 were sold.|UI blocks input at 3. Error<br>message shown.|
|Commission Reversal<br>on Return|Make a sale, check commission.<br>Process a full return.|Commission record status =<br>"reversed". Report excludes it.|
|Low Stock Alert|Sell articles until quantity hits<br>reorder_level.|Row highlighted in inventory list.<br>Dashboard shows alert count.|
|Audit Log<br>Completeness|Add supplier, add article, make sale,<br>process return, edit price.|All 5 actions appear in audit log<br>with correct old/new values.|
|Report Accuracy|Make 3 known sales totalling Rs.<br>5,000 cost. Check profit report.|Revenue = sum of grand_totals.<br>COGS = sum of wholesale<br>snapshots.|
|Backup Creation|Launch app each of 3 successive<br>days (change system clock).|3 separate backup files in<br>AppData/backups/|
|Settings Persist|Change shop_contact. Close and<br>reopen app.|New contact appears on receipt<br>and settings page.|
|Exchange — Customer Pays|Make a sale (Rs. 1,000). Process exchange: return item (credit Rs. 600), new item costs Rs. 900. Net = +Rs. 300.|Customer pays Rs. 300. `payment_method = 'exchange_customer_pays'`. Stock correct for both articles. Cash flow report shows +300.|
|Exchange — Store Refunds|Same setup but new item costs Rs. 400. Net = −Rs. 200.|Store refunds Rs. 200. `payment_method = 'exchange_store_refunds'`. Audit log shows both return and new sale linked via IDs.|
|Exchange — Even Swap|New item costs exactly Rs. 600 (= credit). Net = Rs. 0.|`payment_method = 'exchange_even'`. No money moves. Stock correctly updated for both articles. Audit log complete.|



## **6.3 Packaging & Deployment** 

46. Set correct productName, appId, and version in package.json and electron-builder.yml. 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 14 

## 47. Run production build and create installer: 

- `npm run build          # Vite production build` 

- `npm run electron:build # electron-builder creates .exe in dist-installer/` 

48. Test the installer on a clean Windows machine (or VM). Verify: install completes, app launches, DB is created, backup appears. 

49. Advise the client to add the app to Windows Defender exclusions to prevent false positives on the native .node binary. 

50. Copy the installer to a USB drive. Install on client's billing PC. Run first-launch validation. 

51. Seed initial data with the client: add all salespersons, add one test supplier and article, configure commission rates for the current month. 

## **6.4 Client Training Checklist** 

- Adding a supplier and articles (including supplier code and SKU explanation) 

- Receiving stock from a supplier (Stock IN flow) 

- Running the POS billing screen: searching articles, adding to cart, applying discounts, completing sale, printing receipt 

- Processing a return with a physical receipt 

- Configuring monthly commission rates for each salesperson 

- Adding expenses 

- Reading the profit report and commission report 

- Locating the backup files in AppData/backups (show manually) 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 15 

## **5. Risk Register** 

|**Risk**|**Likelihoo**<br>**d**|**Impact**|**Mitigation**|
|---|---|---|---|
|better-sqlite3 native<br>build fails on client PC<br>architecture|Medium|High —<br>app<br>crashes<br>on launch|Pre-build binaries for Windows x64 in electron-<br>builder config. Test on a clean Windows install<br>before delivery.|
|Receipt not printing<br>correctly on client's<br>thermal printer|Medium|Medium<br>— must fix<br>on-site|Test CSS @page rules on the exact printer<br>model before client handover. Bring a USB<br>cable.|
|Client requests feature<br>changes mid-Sprint 3 or<br>later|High|Medium<br>— delays<br>delivery|Lock Phase 1 scope formally. All new requests<br>go to Phase 2 backlog. Change order required<br>for out-of-scope additions.|
|Salesman commission<br>rate not set for current<br>month|Medium|Low —<br>commissio<br>n not<br>recorded|UI shows a prominent warning on the POS<br>screen if no rate is configured for the current<br>month and a salesperson is selected.|
|Client forgets to enter<br>stock IN, causing<br>negative stock|High|Low —<br>inventory<br>tracking<br>drifts|UI prevents selling more than in-stock quantity.<br>Adjustment movement type allows manual stock<br>correction with a note.|
|App requires internet<br>(Windows Update,<br>antivirus) and fails|Low|High —<br>billing<br>stops|App is 100% local. No outbound calls. Advise<br>client to keep billing PC on a dedicated stable<br>setup.|
|Database file deleted or<br>corrupted by user|Low|High —<br>data loss|Daily auto-backup in AppData. Advise client to<br>also keep backups on a USB periodically. Show<br>them the backup folder location.|
|Power outage during<br>backup copy on app<br>launch|Very Low|Low —<br>that day's<br>backup<br>fails|WAL protects the main DB. Backup uses<br>fs.copyFileSync which is atomic at OS level.<br>Next day's backup picks up.|



Soni Fashion POS — Development Implementation Plan v1.0   |   Page 16 

## **6. Post-Launch Checklist** 

To be completed by the developer one week after go-live. 

- Verify backup files are being created daily in AppData/backups/ 

- Confirm receipt is printing correctly on all paper/thermal formats used 

- Confirm commission rates have been set for the current month for all salespersons 

- Verify the audit log has been accumulating entries correctly 

- Confirm the client knows how to: reprint a receipt, process a return, add a new article 

- Collect feedback on any usability issues for Phase 1.1 patch list 

- Discuss Phase 2 timeline (barcode labels + scanner) if client is ready 

**NOTE:** Keep the database file path and backup folder path documented in a handover note given to the client. They should know exactly where their data lives. 

Soni Fashion POS — Development Implementation Plan v1.0   |   Page 17 

