# Sprint 6 Execution Task List — Polish, Personalization, QA & Packaging

**Goal:** Deliver a production-ready, client-personalized Soni Fashion POS application tailored to exact shop specifications, verified against rigorous QA stress tests, and compiled into a standalone installer.

---

## 🛠️ Phase 6.1: Client Personalization & Branding Polish
- [x] **Task 6.1: Incorporate Client Branding Assets (`src/renderer/src/pages/Settings.jsx` & Header)**
  - Integrate official Soni Fashion shop logo into the navigation bar and app splash/title bar.
  - Update default store profile variables (Shop Name, Tagline, Contact Numbers, Address, WhatsApp business link).
- [x] **Task 6.2: Customize Thermal Receipt & Invoice Engine (`src/preload/index.js` & Thermal Templates)**
  - Embed custom client footer terms & conditions / return policies (e.g., "Exchange allowed within 7 days with original receipt. No cash refunds.").
  - Optimize thermal receipt print formatting tailored to client's specific printer width (80mm standard or 58mm compact).
  - Ensure dual English/Urdu text rendering readability on monochrome thermal printers.
- [ ] **Task 6.3: UI Messaging & Form Validation Polish**
  - Review all system prompts, validation modals, and toast messages for intuitive phrasing.
  - Ensure consistent number formatting across all modules (`Rs. 1,500.00` or rounded PKR integer formatting based on client preference).

---

## 🧪 Phase 6.2: Rigorous QA & Resilience Stress Testing
- [ ] **Task 6.4: ACID Transaction & Power-Loss Recovery Verification**
  - Verify SQLite rollback safeguards during simulated mid-sale process termination or abrupt power failure.
  - Confirm concurrent SKU generation protection (`SF-XXXXX`) prevents race conditions under heavy simultaneous checkout.
- [ ] **Task 6.5: Automated Backup & Restore Validation (`src/main/services/backup.service.js`)**
  - Test automatic daily SQLite database backup rotation in `AppData/backups/`.
  - Verify manual backup export and database restore workflow from settings interface.

---

## 📦 Phase 6.3: Production Packaging & Installer Generation
- [ ] **Task 6.6: Configure Electron Builder (`package.json` & `electron-builder.yml`)**
  - Set production metadata: `productName: "Soni Fashion POS"`, `appId: "com.sonifashion.pos"`, versioning, and copyright.
  - Embed official desktop icon assets (`.ico` for Windows, `.png` for Linux).
- [ ] **Task 6.7: Build & Verify Standalone Executable**
  - Run production bundle compilation (`electron-vite build`).
  - Generate standalone production installer (`electron-builder`).
  - Conduct final smoke test on compiled binary ensuring 100% functionality without developer dependencies.

---

## 🚦 Execution Control
- **Current Status:** Tasks 6.1 and 6.2 Completed. Ready for Task 6.3.
- Waiting for user command ("implementation call") to begin **Task 6.3: UI Messaging & Form Validation Polish**.
