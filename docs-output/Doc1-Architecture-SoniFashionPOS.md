## **SONI FASHION** 

_Qazi Market, Machli Bazar, Daska_ 

## **Point-of-Sale System** 

System Architecture & Requirements Specification _Version 1.0  |  Phase 1_ 

## **CONFIDENTIAL — For Developer Use Only** 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 1 

## **1. Executive Summary** 

This document defines the complete system architecture and functional requirements for the Soni Fashion Point-of-Sale (POS) system — a fully offline, single-terminal desktop application for a ladies' clothing retail store located in Daska, Punjab. 

The system is designed to handle the full retail lifecycle: purchasing inventory from wholesale suppliers, billing customers at retail or discounted prices, tracking salesperson commissions, recording shop expenses, generating business reports, and managing returns and exchanges. Data integrity across power failures and human errors is a primary design constraint. 

The application will be delivered as a Windows desktop executable built on Electron, React, and SQLite — a technology stack the delivering developer is already proficient in, ensuring efficient development and long-term maintainability. 

|**Property**|**Detail**|
|---|---|
|Business Name|Soni Fashion|
|Business Type|Ladies Clothing Retail (Lehnga, Sharara, Dupatta, etc.)|
|Location|Qazi Market, Machli Bazar, Daska, Punjab|
|System Type|Offline Single-Terminal POS Desktop Application|
|Target OS|Windows 10 / 11 (single PC)|
|Internet Required|No — fully air-gapped offline operation|
|Phase Covered|Phase 1: Core POS (Phase 2: Barcode/Label system — future)|



Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 2 

## **2. Project Scope** 

## **2.1 Phase 1 — Core POS (This Document)** 

- Supplier management (wholesale vendors) 

- Article / inventory management with internal-only supplier coding 

- Customer-opaque SKU system (protects supplier intelligence) 

- Point-of-Sale screen: article search, cart, per-item discount, salesperson selection 

- Receipt generation and printing 

- Returns and exchanges against original invoice 

- Commission management: configurable monthly rates per salesperson 

- Expense tracking and categorisation 

- Business reports: sales, profit, commission, inventory valuation 

- Audit log: tamper-evident, insert-only record of all actions 

- Auto-backup on every application launch 

## **2.2 Phase 2 — Barcode & Label System (Future)** 

Phase 2 is out of scope for this document but has been designed for in the architecture so no breaking changes are required to add it. 

- JsBarcode Code128 barcode generation from the existing SF-NNNNN SKU 

- Configurable price tag label component (dimensions and design provided by client) 

- USB barcode scanner support for POS article entry (no driver changes — scanner acts as keyboard) 

- Label print module with exact @page CSS sizing 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 3 

## **3. Functional Requirements** 

## **3.1 Supplier Management** 

- Add a new wholesale supplier with: name, short code (alias), contact number, address, notes 

- The supplier short code is an internal alias used to build internal article references (e.g., "suidhaga"). It is NEVER exposed on receipts or customer-facing outputs. 

- Edit supplier details. Deactivate (soft-delete) a supplier — cannot delete if articles exist against it. 

- View list of all suppliers with active article and stock counts. 

## **3.2 Article & Inventory Management** 

- Add an article specifying: supplier, supplier's own article code (e.g., "art101"), article name/description (optional), category (Lehnga / Sharara / Dupatta / Suit / Other), colour, size, wholesale price, retail price, initial stock quantity, and reorder alert level. 

- System auto-generates a customer-facing SKU (format: SF-NNNNN) — see Section 5 for full SKU design. 

- Record stock IN when goods are received from a supplier: select supplier, enter items and quantities, record wholesale price at time of receipt. 

- Every stock change (in, out, return, adjustment) is recorded in the stock_movements table for full inventory audit. 

- View current stock per article. Flag low-stock items (quantity at or below reorder level). 

- Edit article details including pricing. Price changes are audit-logged; historical sale prices are never altered (price is snapshotted at sale time). 

- Soft-delete articles. Articles with historical sales cannot be hard-deleted. 

## **3.3 Point of Sale (POS) — Billing Screen** 

- Select salesperson from dropdown at the top of every sale. 

- Search articles by: SKU (SF-NNNNN), article name, or supplier code. Results displayed instantly. 

- Add articles to cart with quantity. Quantity cannot exceed current stock. 

- Enter per-item discount amount on the fly during sale. Discount is applied per line item. 

- Cart shows: article name, SKU, unit retail price, discount, line total. 

- Summary panel shows: subtotal, total discount, grand total (payable amount). 

- On completing sale: system creates the sale record, deducts stock, records commission, prints receipt — all in a single atomic database transaction. 

- Invoice number is auto-generated (format: SNF-INV-NNNNNN) and is globally sequential and never reused. 

- Reprint any past receipt by entering or scanning the invoice number. 

## **3.4 Receipt Design** 

- Header: Soni Fashion | Qazi Market, Machli Bazar, Daska | Contact (configurable) 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 4 

- Body: Invoice number, date/time, salesperson name, itemised list (SKU, description, qty, unit price, discount, line total) 

- Footer: Grand total, payment method, thank-you message (configurable), return policy note 

- Receipt printing uses Electron's `webContents.print()` API via a hidden background BrowserWindow that stays loaded with the receipt template (`receipt.html`). When a sale completes, data is pushed to the hidden window via IPC and printing fires silently — **no print dialog appears**. The receipt printer is configured once by the owner in the Settings page (stored as `receipt_printer_name` in the settings table). Thermal 80mm roll paper is fully supported via `@page { size: 80mm auto; margin: 0; }` embedded in `receipt.html`.

- The SKU SF-NNNNN printed on receipt allows return lookup without revealing supplier information to customers. 

## **3.5 Returns & Exchange Module** 

### Sale Lookup — Four Methods

The Returns module supports four ways to find the original sale, covering all real-world scenarios:

| Method | When Used | How It Works |
|---|---|---|
| Invoice number | Customer has receipt or remembers number | Direct `SELECT * FROM sales WHERE invoice_number = ?` |
| Customer-facing SKU (`SF-00023`) | Customer knows their item's price tag | `SELECT DISTINCT s.* FROM sales s JOIN sale_items si ON si.sale_id = s.id JOIN articles a ON a.id = si.article_id WHERE a.sku = ?` — shows list of matching sales sorted by date for staff to confirm |
| Internal supplier code (`suidhaga-art101`) | Staff identifies item on the floor | Same join query, filtered on `a.supplier_article_code` — staff-only screen |
| Manual return (no reference) | No proof, owner's discretion | Staff picks article directly, enters qty and refund amount manually. A **mandatory reason note** is required before submission. Recorded as a `returns` record with `original_sale_id = NULL`. Stock is restored via a `stock_movements` row (type = `RETURN_IN`). Audit-logged. |

### Return Processing

- Select items to return: partial return (some items) or full return (all items) supported.

- Two return types: (a) **Refund** — stock is restocked, refund amount calculated and paid out; (b) **Exchange** — customer swaps for other article(s), subject to net settlement.

- Stock is automatically restored for returned items via `stock_movements` (type = `RETURN_IN`).

- Commission on the returned amount is flagged as `"reversed"` in the commissions table.

- All return actions are audit-logged. A return receipt/confirmation is printed.

### Exchange — Net Settlement (Three Financial Scenarios)

An exchange is always two linked operations:

1. A **return** of the original item(s) → generates a `refund_credit`
2. A **new sale** for the replacement item(s) → generates a `new_total`
3. **Net settlement** = `new_total − refund_credit`

```
Net > 0  →  Customer pays the difference (cash in)
Net < 0  →  Store refunds the difference (cash out)
Net = 0  →  No money moves (even swap)
```

The `payment_method` column on the new sale record captures the financial direction: `exchange_customer_pays`, `exchange_store_refunds`, or `exchange_even`. Commission is earned only on a positive net amount.

The `sales` table carries an `exchange_return_id` column linking the new-sale side back to the originating return. The `returns` table carries `exchange_new_sale_id` (linking forward to the new sale) and `refund_credit` (storing the credit value for reporting). Both links are set inside a single atomic transaction.

## **3.6 Salesperson & Commission Management** 

- Add / edit / deactivate salespersons (name, contact). 

- Configure commission rate per salesperson per calendar month (e.g., January 2026: 5%). Rates are stored independently per month so historical rates are preserved. 

- Commission is auto-calculated on every sale: grand_total × rate_percent / 100, stored in commissions table with status "pending". 

- Mark commissions as "paid" when payout is made. 

- Commission report: view earnings per salesperson filtered by month, showing per-sale breakdown and totals. 

## **3.7 Expense Tracking** 

- Record expenses with: category (Rent / Electricity / Salary / Maintenance / Marketing / Miscellaneous), description, amount, date. 

- View and filter expenses by category and date range. 

- Expense totals feed into the profit calculation in reports. 

## **3.8 Business Reports** 

|**Report**|**What It Shows**|**Filters**|
|---|---|---|
|Sales Report|All sales with invoice, date, salesperson,<br>total|Date range, salesperson|
|Profit Report|Revenue - Cost of Goods Sold - Expenses =<br>Net Profit|Date range|
|Commission Report|Commission earned per salesperson, per-|Month, salesperson|



Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 5 

|**Report**|**What It Shows**|**Filters**|
|---|---|---|
||sale detail||
|Inventory Report|Current stock per article + total inventory<br>value|Supplier, category, low-<br>stock only|
|Expense Report|Total expenses broken down by category|Date range, category|
|Top Articles|Best-selling articles by qty and revenue|Date range|
|Daily Summary|Today's sales, profit, and top salesperson|Today (default)|



All reports are printable via the browser print API (Ctrl+P). Dates are filterable by custom range, preset (today, this week, this month). 

## **3.9 Audit Trail** 

- Every data-modifying operation writes a record to audit_log: action type, entity, description, old value (JSON), new value (JSON), timestamp. 

- audit_log is INSERT-ONLY — no rows are ever updated or deleted by the application. This ensures a tamper-evident record. 

- An audit log viewer page shows the full history with search and date filter. 

- Data is retained for a minimum of 2 years. The entire database is a single file; archiving means copying the file. 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 6 

## **4. Non-Functional Requirements** 

|**Requirement**|**Target**|**How Achieved**|
|---|---|---|
|POS Screen Response|< 150 ms for any user<br>action|better-sqlite3 sync ops; local cart state (no DB<br>per keystroke)|
|Sale Submission|< 500 ms end-to-end|Single SQLite transaction with all writes batched|
|Report Generation|< 2 seconds for 1-<br>year data|Pre-defined aggregate queries with covering<br>indexes|
|Startup Time|< 3 seconds to ready<br>state|Electron app launch; SQLite opens on startup|
|Data Integrity|Zero data loss on<br>power cut|WAL journal mode; NORMAL synchronous; all<br>writes transactional|
|Offline Operation|100% — no internet<br>ever needed|All data local SQLite; no network calls in Phase<br>1|
|Data Retention|Minimum 2 years in<br>production|Single .db file; auto-backup on every launch|
|Concurrent Users|Single terminal only|No concurrency design needed; single Electron<br>instance|
|OS Support|Windows 10 and<br>Windows 11|electron-builder produces .exe installer|
|Printer Support|Any Windows printer<br>configured by name<br>in Settings|Print dialog is suppressed — single click prints silently via Electron `webContents.print()` API. Thermal 80mm fully supported. Printer name configurable in Settings via `webContents.getPrintersAsync()`.|



Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 7 

## **5. SKU & Identifier Architecture** 

## **5.1 Customer-Facing Article SKU** 

The SKU is the identifier printed on receipts and used for return lookups. Its design must satisfy two competing requirements: 

- Internally trackable: maps to a specific article, supplier, and supplier-article code 

- Customer-opaque: a customer reading the SKU cannot determine which wholesale supplier the store uses or how much was paid for the item 

## **Format:  SF-NNNNN** 

|**Component**|**Example**|**Meaning**|
|---|---|---|
|SF|SF|Soni Fashion prefix. Configurable in settings. Never changes for this<br>store.|
|-|-|Separator (visual only)|
|NNNNN|00847|Zero-padded 5-digit global sequential number. Range: 00001 to 99999<br>(supports up to 99,999 unique articles).|



## **Examples:** 

- SF-00001 = First article ever entered into the system 

- SF-00847 = The 847th article added 

- A customer sees "SF-00847" on their receipt and cannot determine it came from supplier "suidhaga", article code "art101" 

## **SKU Generation Rule (SQL — run inside a transaction):** 

```
-- Get next SKU number from settings table
UPDATE settings SET value = CAST(value AS INTEGER) + 1
  WHERE key = 'last_sku_number';
```

```
-- Read the new number
SELECT 'SF-' || printf('%05d', CAST(value AS INTEGER))
  FROM settings WHERE key = 'last_sku_number';
```

**NOTE:** The SKU prefix "SF" is stored in settings.sku_prefix. If the client later rebrands, it can be updated for new articles only; existing SKUs are immutable. 

## **5.2 Invoice Number** 

## **Format:  SNF-INV-NNNNNN** 

Example: SNF-INV-000047 (the 47th sale ever made) 

- Globally sequential, never resets, never reused — even for voided or returned sales 

- Stored and incremented in settings (key: last_invoice_number) inside the sale transaction 

- Unique constraint on sales.invoice_number enforced at DB level 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 8 

## **5.3 Return Number** 

## **Format:  SNF-RET-NNNNNN** 

Example: SNF-RET-000003 (the 3rd return ever processed) 

- Same sequential pattern as invoice numbers, separate counter (last_return_number) 

- Printed on the return confirmation receipt 

## **5.4 Supplier Article Code (Internal Only)** 

When an article is added, the user enters the supplier's own reference code (e.g., "art101"). This is stored in articles.supplier_article_code. This field is NEVER printed on any customer-facing output. It is only visible in the inventory management screens, protected by the store's own computer access. 

|**Identifier**|**Visible To**<br>**Customer?**|**Purpose**|
|---|---|---|
|SF-00847 (SKU)|YES (receipt, future<br>barcode)|Return lookup, inventory tracking|
|SNF-INV-000047 (Invoice)|YES (receipt)|Full sale lookup, return initiation|
|suidhaga / art101<br>(Supplier codes)|NO — internal only|Business intelligence, stock management|



Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 9 

## **6. Database Schema** 

The database is SQLite, opened in WAL (Write-Ahead Logging) mode. The schema is applied by a versioned migration system on first launch and upgraded on subsequent launches when the schema version is incremented. 

## **Runtime PRAGMAs (applied every time the DB is opened):** 

```
PRAGMA journal_mode  = WAL;       -- Atomic writes; crash-safe
PRAGMA foreign_keys  = ON;        -- Enforce all FK constraints
PRAGMA synchronous   = NORMAL;    -- Safe + fast (not FULL)
PRAGMA busy_timeout  = 5000;      -- Wait 5s if locked (safety net)
```

## **6.1 Table: suppliers** 

```
CREATE TABLE IF NOT EXISTS suppliers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,  -- short alias, e.g. "suidhaga"
  contact    TEXT,
  address    TEXT,
  notes      TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.2 Table: articles** 

```
CREATE TABLE IF NOT EXISTS articles (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  sku                    TEXT    NOT NULL UNIQUE,   -- SF-NNNNN (customer-facing)
  supplier_id            INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_article_code  TEXT    NOT NULL,          -- e.g. "art101" (internal only)
  name                   TEXT,                      -- optional display name
  category               TEXT,                      -- Lehnga/Sharara/Dupatta/Suit/Other
  colour                 TEXT,
  size                   TEXT,
  wholesale_price        REAL    NOT NULL CHECK (wholesale_price >= 0),
  retail_price           REAL    NOT NULL CHECK (retail_price >= 0),
  quantity               INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level          INTEGER          DEFAULT 5,
  notes                  TEXT,
  is_active              INTEGER NOT NULL DEFAULT 1,
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (supplier_id, supplier_article_code)  -- no duplicate codes per supplier
);
```

## **6.3 Table: stock_movements** 

```
CREATE TABLE IF NOT EXISTS stock_movements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 10 

```
  article_id     INTEGER NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  movement_type  TEXT    NOT NULL
                   CHECK (movement_type IN ('IN','OUT','RETURN_IN','ADJUSTMENT')),
  quantity       INTEGER NOT NULL,        -- always positive; direction = type
  reference_type TEXT,                    -- "sale", "return", "manual", "adjustment"
  reference_id   INTEGER,                 -- FK to sales.id or returns.id
  note           TEXT,
  performed_by   TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.4 Table: salespersons** 

```
CREATE TABLE IF NOT EXISTS salespersons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  contact    TEXT,
  notes      TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.5 Table: commission_rates** 

```
CREATE TABLE IF NOT EXISTS commission_rates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  salesperson_id  INTEGER NOT NULL REFERENCES salespersons(id) ON DELETE CASCADE,
  month           TEXT    NOT NULL,   -- 'YYYY-MM' format
  rate_percent    REAL    NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (salesperson_id, month)      -- one rate per person per month
);
```

## **6.6 Table: sales** 

```
CREATE TABLE IF NOT EXISTS sales (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number     TEXT    NOT NULL UNIQUE,  -- SNF-INV-NNNNNN
  salesperson_id     INTEGER REFERENCES salespersons(id) ON DELETE SET NULL,
  sale_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal           REAL    NOT NULL,    -- sum of retail × qty (pre-discount)
  total_discount     REAL    NOT NULL DEFAULT 0,
  grand_total        REAL    NOT NULL,    -- amount actually paid
  payment_method     TEXT    NOT NULL DEFAULT 'cash'
                       CHECK (payment_method IN (
                         'cash',
                         'exchange_customer_pays',
                         'exchange_store_refunds',
                         'exchange_even'
                       )),
                       -- Phase 1: cash only for normal sales. Exchange values set automatically by the exchange transaction.
  notes              TEXT,
  status             TEXT    NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('completed','voided')),
  exchange_return_id INTEGER REFERENCES returns(id),
                       -- set when this sale is the "new purchase" side of an exchange; NULL for normal sales
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 11 

## **6.7 Table: sale_items** 

```
CREATE TABLE IF NOT EXISTS sale_items (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id                   INTEGER NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  article_id                INTEGER NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  quantity                  INTEGER NOT NULL CHECK (quantity > 0),
  retail_price_snapshot     REAL    NOT NULL,  -- price AT TIME OF SALE (never changes)
  wholesale_price_snapshot  REAL    NOT NULL,  -- for profit calculations
  discount_amount           REAL    NOT NULL DEFAULT 0,  -- per-unit discount entered
  line_total                REAL    NOT NULL,  -- (retail - discount) * qty
  created_at                DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.8 Table: commissions** 

```
CREATE TABLE IF NOT EXISTS commissions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id           INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  salesperson_id    INTEGER NOT NULL REFERENCES salespersons(id) ON DELETE RESTRICT,
  sale_amount       REAL    NOT NULL,
  rate_percent      REAL    NOT NULL,         -- rate used at time of sale
  commission_amount REAL    NOT NULL,          -- sale_amount * rate_percent / 100
  month             TEXT    NOT NULL,          -- 'YYYY-MM'
  status            TEXT    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','reversed')),
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.9 Table: returns** 

```
CREATE TABLE IF NOT EXISTS returns (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  return_number        TEXT    NOT NULL UNIQUE,  -- SNF-RET-NNNNNN
  original_sale_id     INTEGER REFERENCES sales(id) ON DELETE RESTRICT,
                         -- NULL for manual no-reference returns (owner's discretion)
  return_type          TEXT    NOT NULL CHECK (return_type IN ('refund','exchange','manual')),
  return_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_by         INTEGER REFERENCES salespersons(id) ON DELETE SET NULL,
  refund_amount        REAL    NOT NULL DEFAULT 0,
  refund_credit        REAL    NOT NULL DEFAULT 0,
                         -- credit value used in exchange net-settlement calculation
  exchange_new_sale_id INTEGER REFERENCES sales(id),
                         -- links to the new sale created during an exchange; NULL for refunds
  notes                TEXT,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.10 Table: return_items** 

```
CREATE TABLE IF NOT EXISTS return_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id         INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id      INTEGER REFERENCES sale_items(id) ON DELETE RESTRICT,
                      -- NULL for manual returns (no original sale reference exists)
  article_id        INTEGER NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),
  refund_per_unit   REAL    NOT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 12 

## **6.11 Table: expenses** 

```
CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category     TEXT    NOT NULL,  -- Rent/Electricity/Salary/Maintenance/Misc
  description  TEXT,
  amount       REAL    NOT NULL CHECK (amount > 0),
  expense_date DATE    NOT NULL,
  recorded_by  TEXT,
  notes        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## **6.12 Table: audit_log** 

```
CREATE TABLE IF NOT EXISTS audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type  TEXT    NOT NULL,  -- SALE_CREATE, ARTICLE_EDIT, STOCK_IN, RETURN, etc.
  entity_type  TEXT    NOT NULL,  -- sale, article, supplier, salesperson, expense
  entity_id    INTEGER,
  description  TEXT    NOT NULL,  -- human-readable summary
  old_value    TEXT,              -- JSON snapshot before change
  new_value    TEXT,              -- JSON snapshot after change
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- NOTE: Application NEVER runs UPDATE or DELETE on this table.
```

## **6.13 Table: settings** 

```
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT NOT NULL PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Required initial seed data:
INSERT OR IGNORE INTO settings VALUES ('shop_name',           'Soni Fashion',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('shop_address',        'Qazi Market, Machli Bazar,
Daska',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('shop_contact',        '',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('sku_prefix',          'SF',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('invoice_prefix',      'SNF-INV',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('return_prefix',       'SNF-RET',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('last_sku_number',     '0',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('last_invoice_number', '0',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('last_return_number',  '0',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('receipt_footer',      'Thank you for shopping at
Soni Fashion!', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('receipt_printer_name','',                               CURRENT_TIMESTAMP);
-- '' = use Windows default printer; owner sets this via the Settings page printer dropdown
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 13 

```
INSERT OR IGNORE INTO settings VALUES ('default_commission',  '5',
CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings VALUES ('schema_version',      '1',
CURRENT_TIMESTAMP);
```

## **6.14 Indexes** 

```
CREATE INDEX IF NOT EXISTS idx_articles_supplier   ON articles(supplier_id);
CREATE INDEX IF NOT EXISTS idx_articles_sku        ON articles(sku);
CREATE INDEX IF NOT EXISTS idx_articles_category   ON articles(category);
CREATE INDEX IF NOT EXISTS idx_sales_date          ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson   ON sales(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale     ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_article  ON sale_items(article_id);
CREATE INDEX IF NOT EXISTS idx_commissions_month   ON commissions(month, salesperson_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale        ON returns(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_art ON stock_movements(article_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date      ON audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(expense_date);
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 14 

## **7. Application Architecture** 

## **7.1 Technology Stack** 

|**Layer**|**Technology**|**Version**|**Reason**|
|---|---|---|---|
|Desktop Shell|Electron|29+|Native Windows app, access to system print<br>and file system|
|UI Framework|React|18|Component model; developer already<br>proficient|
|Build Tool|Vite|5|Fast HMR in dev, optimised production<br>bundles|
|Styling|Tailwind CSS|3|Utility classes; consistent design; zero<br>runtime overhead|
|Database|SQLite (better-<br>sqlite3)|9+|Synchronous API; WAL crash safety; single<br>file; zero config|
|State Management|Zustand|4|Lightweight; minimal boilerplate; no context<br>overhead|
|Form Handling|React Hook Form +<br>Zod|latest|Performance; schema-based validation|
|Print|react-to-print|latest|Browser-native print; no printer driver code<br>needed|
|Icons|Lucide React|latest|Clean SVG icons; tree-shakeable|
|Date Utilities|date-fns|latest|Lightweight date formatting and comparison|
|Packaging|electron-builder|latest|Produces .exe NSIS installer for Windows|



**NOTE:** better-sqlite3 is a native Node.js addon. It must be compiled for the target Node.js/Electron version using electron-rebuild during development setup. electron-builder handles this automatically for the production build. 

## **7.2 Process Architecture** 

Electron runs two separate processes. All database access must happen exclusively in the Main Process — never in the Renderer Process. This is non-negotiable for security and for compatibility with better-sqlite3. 

```
MAIN PROCESS (Node.js / Electron Main)
  src/main/
    main.js             -- App entry: creates BrowserWindow, registers IPC handlers
    preload.js          -- contextBridge: exposes safe API to renderer
    db/
      database.js       -- Opens SQLite, sets WAL pragma, runs migrations
      migrations.js     -- Versioned schema migration runner
      seed.js           -- Initial settings seed on first run
    ipc/
      suppliers.ipc.js  -- CRUD for suppliers
      articles.ipc.js   -- CRUD + SKU generation for articles
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 15 

```
      sales.ipc.js      -- POS sale creation (atomic transaction)
      returns.ipc.js    -- Return and exchange processing
      reports.ipc.js    -- All report queries
      expenses.ipc.js   -- Expense CRUD
      settings.ipc.js   -- App settings read/write
      salespersons.ipc.js
      commissions.ipc.js
    services/
      backup.service.js  -- Auto-backup SQLite file on app start
      audit.service.js   -- Shared audit_log insert helper
      print.service.js   -- Silent print via webContents.print(); manages hidden receiptWin
    receipt.html         -- Static receipt template loaded in hidden BrowserWindow
    receipt-preload.js   -- contextBridge for hidden receipt window (receives 'load-receipt' IPC)
RENDERER PROCESS (React / Vite)
  src/renderer/
    pages/
      Dashboard.jsx
      pos/NewSale.jsx
      inventory/
        ArticleList.jsx  AddArticle.jsx  StockIn.jsx
      returns/Returns.jsx
      reports/
        SalesReport.jsx  ProfitReport.jsx
        CommissionReport.jsx  InventoryReport.jsx
      expenses/Expenses.jsx
      salespersons/Salespersons.jsx
      settings/Settings.jsx
      audit/AuditLog.jsx
    components/
      ReturnReceipt.jsx
      ArticleSearchBar.jsx
      CartTable.jsx
      layout/Sidebar.jsx  TopBar.jsx  Layout.jsx
      -- NOTE: Receipt.jsx removed; receipt rendering now handled by receipt.html in main process
    store/
      cartStore.js        -- Zustand: current POS cart state
      settingsStore.js    -- Zustand: loaded app settings
    lib/
      api.js              -- Thin wrapper around window.electronAPI.*
```

## **7.5 Silent Print Architecture**

Receipt printing bypasses the OS print dialog entirely using a hidden Electron `BrowserWindow` that stays resident in memory throughout the app's lifetime.

**Startup (main.js):** On app launch, `createReceiptWindow()` opens a 302 px-wide (≈ 80 mm at 96 dpi) hidden window loaded with `receipt.html`. It is never closed.

**Print flow:**
1. Renderer calls `window.electronAPI.print.receipt(receiptData)` after a sale completes.
2. `preload.js` forwards via `ipcRenderer.invoke('print:receipt', receiptData)`.
3. Main process handler (`print.service.js`) sends `'load-receipt'` to the hidden window and waits 250 ms for the DOM to render.
4. `receiptWin.webContents.print({ silent: true, deviceName: printerName, ... })` fires with no dialog.

**Printer configuration:** The Settings page calls `webContents.getPrintersAsync()` via IPC to enumerate installed Windows printers, presents a dropdown, and saves the chosen name to `settings.receipt_printer_name`. The print handler reads this value at print time and passes it as `deviceName`. An empty string (`''`) uses the Windows default printer.

**`receiptData` object shape (Phase 1 baseline):**

> **NOTE:** The exact fields and layout of the receipt are subject to client review and will change during Sprint 6 client approval. The structure below covers all mandatory data required for a complete receipt. Do not hard-code layout decisions — keep `receipt.html` easy to modify.

```javascript
// receiptData — passed from renderer to receipt.html via IPC
{
  // Shop identity (read from settings at print time by main process)
  shopName:      'Soni Fashion',
  shopAddress:   'Qazi Market, Machli Bazar, Daska',
  shopContact:   '',                    // empty until client provides number
  footerMessage: 'Thank you for shopping at Soni Fashion!',

  // Sale header
  invoiceNumber: 'SNF-INV-000047',
  saleDate:      '2026-06-28T08:30:00Z',  // UTC ISO string; format in receipt.html
  salesperson:   'Ahmed',

  // Line items
  items: [
    {
      sku:        'SF-00023',
      name:       'Blue Dupatta',
      qty:        2,
      unitPrice:  850.00,
      discount:   50.00,       // per-unit discount
      lineTotal:  1600.00,     // (unitPrice - discount) * qty
    }
  ],

  // Totals
  subtotal:      1700.00,
  totalDiscount: 100.00,
  grandTotal:    1600.00,

  // Return receipt variant (only present when printing a return confirmation)
  isReturn:         false,
  returnNumber:     null,           // e.g. 'SNF-RET-000003'
  originalInvoice:  null,           // e.g. 'SNF-INV-000047', or 'Manual Return — No Original Invoice'
  refundAmount:     null,
}
```

```javascript
// print.service.js — simplified
ipcMain.handle('print:receipt', async (_e, receiptData) => {
  const { value: printerName } = db.prepare(
    `SELECT value FROM settings WHERE key = 'receipt_printer_name'`
  ).get();

  receiptWin.webContents.send('load-receipt', receiptData);
  await new Promise(r => setTimeout(r, 250));

  return new Promise((resolve) => {
    receiptWin.webContents.print(
      {
        silent:          true,
        printBackground: true,
        deviceName:      printerName || '',
        pageSize:        { width: 80000, height: 400000 }, // microns; thermal roll cuts auto
        margins:         { marginType: 'none' },
        copies:          1,
      },
      (success, failureReason) => {
        resolve({ success, failureReason: failureReason || null });
      }
    );
  });
});
```

## **7.3 IPC Communication Pattern** 

The contextBridge in preload.js exposes a structured electronAPI object. Every database operation follows this flow: 

- Renderer calls:  const result = await window.electronAPI.sales.create(payload) 

- preload.js forwards: ipcRenderer.invoke("sales:create", payload) 

- main.js handler:  ipcMain.handle("sales:create", handler) 

- Handler validates input, runs DB transaction, returns { success, data, error } 

- Renderer checks result.success before rendering outcome 

```
// preload.js pattern (example)
contextBridge.exposeInMainWorld("electronAPI", {
  sales: {
    create:  (payload) => ipcRenderer.invoke("sales:create",  payload),
    reprint: (invoiceNo) => ipcRenderer.invoke("sales:reprint", invoiceNo),
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 16 

```
    list:    (filters) => ipcRenderer.invoke("sales:list",   filters),
  },
  articles: {
    search:  (query)   => ipcRenderer.invoke("articles:search", query),
    create:  (data)    => ipcRenderer.invoke("articles:create", data),
    // ... etc
  },
  // ... all domains
});
```

## **7.4 Sale Transaction Pattern (Critical)** 

The sale creation is the most critical operation. It must be a single SQLite transaction: if any step fails, everything rolls back. This is what protects against partial saves on power failure. 

```
// sales.ipc.js — Main Process handler
const createSale = db.transaction((payload) => {
  const { salesperson_id, items, notes } = payload;
  // Step 1: Increment and get invoice number
  db.prepare(`UPDATE settings SET value = CAST(value AS INTEGER) + 1
               WHERE key='last_invoice_number'`).run();
  const { value: num } = db.prepare(`SELECT value FROM settings WHERE
key='last_invoice_number'`).get();
  const invoiceNumber = `SNF-INV-${String(num).padStart(6, "0")}`;
  // Step 2: Calculate totals
  let subtotal = 0, totalDiscount = 0;
  items.forEach(i => {
    subtotal      += i.retail_price * i.quantity;
    totalDiscount += i.discount_amount * i.quantity;
  });
  const grandTotal = subtotal - totalDiscount;
  // Step 3: Insert sale record
  const saleResult = db.prepare(
    `INSERT INTO sales (invoice_number, salesperson_id, subtotal,
       total_discount, grand_total, notes) VALUES (?,?,?,?,?,?)`
  ).run(invoiceNumber, salesperson_id, subtotal, totalDiscount, grandTotal, notes);
  const saleId = saleResult.lastInsertRowid;
  // Step 4: Insert sale_items, deduct stock, log movements
  for (const item of items) {
    db.prepare(
      `INSERT INTO sale_items (sale_id, article_id, quantity,
         retail_price_snapshot, wholesale_price_snapshot, discount_amount, line_total)
         VALUES (?,?,?,?,?,?,?)`
    ).run(saleId, item.article_id, item.quantity, item.retail_price,
           item.wholesale_price, item.discount_amount,
           (item.retail_price - item.discount_amount) * item.quantity);
    db.prepare(`UPDATE articles SET quantity = quantity - ? WHERE id = ?`)
      .run(item.quantity, item.article_id);
    db.prepare(`INSERT INTO stock_movements (article_id, movement_type, quantity,
        reference_type, reference_id) VALUES (?, 'OUT', ?, 'sale', ?)`)
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 17 

```
      .run(item.article_id, item.quantity, saleId);
  }
  // Step 5: Calculate and store commission
  if (salesperson_id) {
    const month = new Date().toISOString().slice(0, 7);
    const rate  = db.prepare(
      `SELECT rate_percent FROM commission_rates
        WHERE salesperson_id = ? AND month = ?`
    ).get(salesperson_id, month);
    if (rate) {
      const comm = grandTotal * rate.rate_percent / 100;
      db.prepare(`INSERT INTO commissions (sale_id, salesperson_id, sale_amount,
          rate_percent, commission_amount, month) VALUES (?,?,?,?,?,?)`)
        .run(saleId, salesperson_id, grandTotal, rate.rate_percent, comm, month);
    }
  }
  // Step 6: Audit log
  auditLog('SALE_CREATE', 'sale', saleId, `Sale ${invoiceNumber} | Total: ${grandTotal}
`);
  return { saleId, invoiceNumber, grandTotal };
});
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 18 

## **8. Failure Scenarios & Mitigations** 

|**Scenario**|**Risk Without Mitigation**|**Mitigation Strategy**|**Status**|
|---|---|---|---|
|Power cut mid-sale|Partial sale record —<br>stock deducted but sale<br>not saved (or vice versa)|All 6 steps of sale creation are<br>inside a single SQLite transaction.<br>WAL mode guarantees atomicity:<br>on restart, the incomplete<br>transaction is automatically rolled<br>back. Data returns to pre-sale<br>state.|GUARANTEE<br>D BY DESIGN|
|Power cut mid-receipt<br>print|Sale saved but no<br>physical receipt|Receipt can always be reprinted by<br>invoice number. Sale data is<br>complete.|HANDLED|
|Accidental article<br>deletion|Historical sale items<br>orphaned; inventory<br>record lost|Soft delete only (is_active = 0). DB<br>constraint ON DELETE RESTRICT<br>prevents hard deletes where sales<br>reference the article.|PREVENTED|
|Wrong retail price<br>entered|Overcharge or<br>undercharge on historical<br>sales|retail_price_snapshot in sale_items<br>captures the price at the exact<br>moment of sale. Changing<br>article.retail_price later does NOT<br>affect historical records.|HANDLED|
|Wrong salesperson<br>selected on sale|Commission credited to<br>wrong person|Returns module reverses<br>commission (status = "reversed").<br>Voiding a sale also reverses<br>commission.|HANDLED|
|Duplicate invoice<br>number|Accounting confusion,<br>receipt printing error|invoice_number is UNIQUE in DB.<br>The increment-in-transaction<br>pattern prevents duplicates even<br>under theoretical concurrency.|PREVENTED<br>AT DB LEVEL|
|Database file corruption|Catastrophic data loss|WAL mode prevents corruption on<br>power loss. Auto-backup on every<br>app launch copies the .db file to<br>AppData/backups/ with datestamp.<br>Last 30 days kept.|MITIGATED|
|Wrong stock quantity<br>entered|Incorrect inventory<br>tracking|stock_movements table logs every<br>change. Manual "adjustment"<br>movement type allows correction<br>with a note and audit trail.|RECOVERAB<br>LE|
|Return processed twice|Stock inflated; double<br>refund|return_items references specific<br>sale_item_id. System checks<br>qty_returned against original qty.<br>Cannot return more than was sold.|PREVENTED|
|Human mistakenly<br>changes a price|Revenue impact unknown|audit_log captures old_value and<br>new_value JSON for every article<br>edit. Full history of price changes<br>viewable in audit log.|TRACEABLE|



Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 19 

## **8.1 Backup Strategy** 

```
// backup.service.js — runs on every app launch
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
function runBackup(dbPath) {
  const backupDir = path.join(app.getPath("userData"), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const today = new Date().toISOString().split("T")[0];  // YYYY-MM-DD
  const dest  = path.join(backupDir, `sonifashion-${today}.db`);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(dbPath, dest);
    console.log(`Backup created: ${dest}`);
  }
  // Prune backups older than 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  fs.readdirSync(backupDir).forEach(f => {
    const fPath = path.join(backupDir, f);
    if (fs.statSync(fPath).mtimeMs < cutoff) fs.unlinkSync(fPath);
  });
}
module.exports = { runBackup };
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 20 

## **9. Performance Architecture** 

Performance during rush hours is non-negotiable. The following strategies ensure < 150 ms response on any POS action even after a full year of sales data accumulates. 

## **9.1 better-sqlite3 Synchronous Access** 

Unlike the standard sqlite3 module, better-sqlite3 uses a synchronous, non-async API. This eliminates Promise/async overhead on every DB call, which is measurable at scale. All DB calls from IPC handlers are synchronous. 

## **9.2 POS Cart is Pure Local State** 

Adding items to cart, entering quantities, and applying discounts does NOT hit the database. The cart lives entirely in Zustand store in the renderer. The database is only touched on two actions: (a) article search/lookup, (b) sale submission. This means a cashier adding 15 items to a bill creates exactly 15 DB reads (article lookups) and 1 DB write (sale creation). 

## **9.3 Article Search Optimisation** 

Article search is triggered on every keystroke. It uses a single indexed query: 

```
SELECT id, sku, name, retail_price, wholesale_price, quantity, category
FROM articles
WHERE is_active = 1
  AND (sku LIKE ?1 OR name LIKE ?1 OR supplier_article_code LIKE ?1)
LIMIT 20;
```

```
-- ?1 = '%' || searchTerm || '%'
-- Covered by idx_articles_sku. For large catalogs, consider FTS5 (Phase 1.1)
```

## **9.4 Report Query Design** 

All report queries use aggregate functions directly in SQL — no row-by-row processing in JavaScript. Example profit query: 

```
SELECT
  SUM(si.line_total)                                     AS revenue,
  SUM(si.wholesale_price_snapshot * si.quantity)         AS cogs,
  SUM(si.line_total)
    - SUM(si.wholesale_price_snapshot * si.quantity)     AS gross_profit,
  COALESCE((SELECT SUM(amount) FROM expenses
            WHERE expense_date BETWEEN ?1 AND ?2), 0)    AS total_expenses
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.sale_date BETWEEN ?1 AND ?2
  AND s.status = 'completed';
```

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 21 

## **9.5 Prepared Statement Caching** 

All frequently-used queries (article search, sale insert, stock update) are prepared once on DB initialisation and cached. better-sqlite3 returns prepared statements that can be called repeatedly without re-parsing. 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 22 

## **10. Phase 2 Roadmap — Barcode & Label System** 

Phase 2 does not require any changes to the Phase 1 database schema or architecture. It is additive only. 

|**Feature**|**Implementation Approach**|**Dependencies**|
|---|---|---|
|Barcode Generation|JsBarcode library generates Code128 barcode<br>from the existing SF-NNNNN SKU as<br>SVG/canvas|npm: jsbarcode|
|Price Tag Label<br>Component|React component sized to exact client-provided<br>label dimensions (e.g., 40×25mm). Contains:<br>brand name, article name, retail price, barcode.<br>Client provides final design layout.|jsbarcode, react-to-print|
|Label Printing|@media print CSS with @page { size: 40mm<br>25mm; margin: 0; } targets the label printer<br>exactly. Any Zebra, Dymo, or thermal label<br>printer set as default Windows printer works<br>automatically.|CSS @page, react-to-print|
|Batch Label Print|Inventory screen: select multiple articles, print a<br>sheet of labels. Quantity per article<br>configurable.|Label component loop|
|USB Barcode<br>Scanner|USB scanners in HID keyboard-wedge mode<br>type the barcode followed by Enter. No driver<br>code needed. In the POS NewSale screen, a<br>focused barcode input field captures the scan<br>automatically.|No new dependencies|
|Scanner Input Field|An auto-focused input at the top of NewSale.jsx<br>captures scanner input. On Enter, it calls the<br>existing articles:search IPC handler with the<br>scanned SKU, adds the result to cart.|Existing article search IPC|



**NOTE:** Phase 2 requires the client to provide: (1) label dimensions in mm, (2) label printer model, (3) final label design layout including any logo or branding. No code changes to Phase 1 data model are needed. 

Soni Fashion POS — Architecture & Requirements Specification v1.0   |   Page 23 

