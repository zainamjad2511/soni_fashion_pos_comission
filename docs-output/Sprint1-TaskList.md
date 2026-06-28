# Soni Fashion POS — Sprint 1 (Foundation) Task List

This document tracks the step-by-step implementation of **Sprint 1: Foundation (Days 1 to 5)**.
Each task will be executed sequentially. No task will start until explicitly authorized by the user.

---

## 📋 Sprint 1 Overview
**Goal:** Establish a running Electron + Vite + React application with the complete SQLite database schema, auto-backup, audit logging service, IPC bridge, and core navigation shell.

---

## 🛠️ Step-by-Step Task Breakdown

### Phase 1.1: Project Setup & Shell Architecture
- [x] **Task 1.1: Bootstrap Project**
  - Run `@quick-start/electron` template (`react`).
  - Install core dependencies (`better-sqlite3`, `zustand`, `react-hook-form`, `zod`, `react-router-dom`, `date-fns`, `lucide-react`).
  - Install dev dependencies (`tailwindcss`, `postcss`, `autoprefixer`, `electron-builder`, `@electron/rebuild`).
  - Rebuild `better-sqlite3` native addon against Electron.
  - Verify app launches cleanly.

- [x] **Task 1.2: Configure Tailwind CSS & Brand Theme**
  - Initialize Tailwind CSS configuration.
  - Define custom palette (deep rose / maroon primary, soft rose accents, sleek modern dark/light mode tokens).
  - Create global index.css with styling best practices and custom scrollbars.

### Phase 1.2: Database Foundation & Services (Main Process)
- [x] **Task 1.3: SQLite Database Initialization (`db/database.js`)**
  - Set up SQLite connection at `app.getPath('userData')/sonifashion.db`.
  - Enforce required runtime PRAGMAs (`WAL`, `foreign_keys = ON`, `synchronous = NORMAL`, `busy_timeout = 5000`).

- [x] **Task 1.4: Schema Migrations Engine (`db/migrations.js`)**
  - Implement versioned migration runner checking `settings.schema_version`.
  - Write **V1 Migration** creating all 13 tables (`suppliers`, `articles`, `stock_movements`, `salespersons`, `commission_rates`, `sales`, `sale_items`, `commissions`, `returns`, `return_items`, `expenses`, `audit_log`, `settings`) and all 12 indexes.

- [x] **Task 1.5: Initial Settings Seeder (`db/seed.js`)**
  - Seed initial configuration values (`shop_name`, `shop_address`, `sku_prefix`, counters, default commission, etc.) using `INSERT OR IGNORE`.

- [x] **Task 1.6: Auto-Backup Service (`services/backup.service.js`)**
  - Implement daily backup logic on app startup copying `.db` file to `AppData/backups/`.
  - Add pruning logic for backups older than 30 days.

- [x] **Task 1.7: Audit Log Service (`services/audit.service.js`)**
  - Create shared `auditLog(db, actionType, entityType, entityId, description, oldValue, newValue)` function.
  - Ensure tamper-evident insert-only logging.

### Phase 1.3: IPC Bridge & Handlers
- [x] **Task 1.8: Context Bridge & Preload (`preload.js`)**
  - Expose safe, typed `window.electronAPI` channels for all domains (`articles`, `suppliers`, `sales`, `returns`, `reports`, `salespersons`, `commissions`, `expenses`, `settings`, `print`).

- [ ] **Task 1.9: IPC Handler Stubs & Settings Handlers (`main.js` & `ipc/*.ipc.js`)**
  - Register IPC envelope structure `{ success: boolean, data?: any, error?: string }`.
  - Implement functional `settings.ipc.js` (get/update settings).
  - Register stubs for remaining domain channels.

### Phase 1.4: UI Navigation & Foundation Pages (Renderer)
- [ ] **Task 1.10: Router & Layout (`App.jsx`, `Layout.jsx`, `Sidebar.jsx`, `TopBar.jsx`)**
  - Set up `react-router-dom` with routes for Dashboard, Inventory, New Sale, Returns, Reports, Expenses, Salespersons, Settings, and Audit Log.
  - Build responsive sidebar navigation with active highlights and Soni Fashion branding.
  - Wrap page routes in React Error Boundaries (`ErrorBoundary.jsx`).

- [ ] **Task 1.11: Settings Page Implementation (`Settings.jsx`)**
  - Build UI to load, display, and update store details (`shop_name`, `shop_address`, `shop_contact`, `receipt_footer`).
  - Connect to `settings` IPC channels and confirm persistence.

---

## 🚦 Execution Control
- **Current Status:** Task 1.8 Completed. Ready for Task 1.9.
- Waiting for user command ("implementation call") to begin **Task 1.9: IPC Handler Stubs & Settings Handlers (`main.js` & `ipc/*.ipc.js`)**.
