# Sprint 4 Task List: Returns & Exchange Module

**Sprint Goal:** Deliver a robust, atomic returns and exchange engine. Cashiers can lookup sales by invoice number or article SKU, select items for partial or full refund, process item exchanges with real-time net settlement, or execute manual returns with mandatory audit justification. Stock levels and commission status automatically synchronize.

---

## 📋 Task Breakdown & Progress

### Phase 4.1: Returns IPC & Database Transactions
- [x] **Task 4.1: Implement Returns Lookup IPC Handlers (`returns:lookupSale`, `returns:lookupBySku`)**
  - Implement `returns:lookupSale` taking an invoice number, returning the sale header and all `sale_items` joined with article details and already-returned quantities.
  - Implement `returns:lookupBySku` taking an article SKU or supplier code, returning a list of matching completed sales sorted by date.

- [x] **Task 4.2: Implement Returns Creation IPC Handler (`returns:create`)**
  - Build atomic SQLite transaction supporting normal refunds, item exchanges, and manual returns (`original_sale_id = NULL`).
  - Generate sequential return numbers (`RET-YYYYMMDD-XXXX`).
  - Restore stock (`UPDATE articles SET quantity = quantity + ?`) and log movements (`RETURN_IN`).
  - Reverse proportional sales commission (`status = 'reversed'`).
  - For exchanges, atomically create replacement sale record (`exchange_return_id` set) and link (`exchange_new_sale_id`).
  - Return result `{ returnNumber, refundCredit, newSaleId, netAmount }`.

- [x] **Task 4.3: Implement Returns Listing IPC Handler (`returns:list`) & Remove Stubs**
  - Implement `returns:list` supporting date range and search filtering.
  - Replace stub handlers in `src/main/ipc/stubs.ipc.js` and register active domain handlers in `src/main/index.js`.

### Phase 4.2: Tabbed Returns & Exchanges UI
- [x] **Task 4.4: Build Tabbed Lookup Interface (`Returns.jsx` Tabs 1 & 2)**
  - Implement Tab 1 (Invoice Lookup) with instant validation and status checking (`completed` vs `voided`).
  - Implement Tab 2 (SKU Search) allowing cashiers to trace historical invoices by article barcode or supplier code.

- [x] **Task 4.5: Implement Item Selection & Exchange Net Settlement Panel**
  - Render selectable return items bounded by `(qty_sold - already_returned)`.
  - Add return type toggle: **Refund** vs **Exchange**.
  - Build interactive Exchange Cart calculating real-time net settlement (`Refund Credit` minus replacement items = net customer payment or store refund).

- [x] **Task 4.6: Implement Manual Returns Interface (`Returns.jsx` Tab 3)**
  - Build direct inventory selection UI for customer returns without original receipt.
  - Enforce mandatory validation requiring a **Reason Note** before confirmation button is enabled.

- [x] **Task 4.7: Build Returns History View & Thermal Receipt Integration**
  - Implement historical returns log with status filtering.
  - Integrate thermal printing (`print:receipt`) for return and exchange vouchers displaying returned items, net settlement, and audit notes.

### Phase 4.3: Acceptance Verification
- [x] **Task 4.8: Sprint 4 End-to-End Verification & Acceptance Testing**
  - Test Case 1: Partial refund against invoice verifying stock restoration and commission reversal.
  - Test Case 2: Double return prevention (verify fully returned items block duplicate processing).
  - Test Case 3: Atomic exchange flow verifying stock movements for both returned and new articles.
  - Test Case 4: Manual return verifying mandatory reason note enforcement and null invoice linkage.

---

## 🚦 Execution Control
- **Current Status:** Sprint 4 (Returns & Exchange Module) 100% Completed & Verified.
- All tasks passed acceptance verification. Ready for next sprint or production handoff.
