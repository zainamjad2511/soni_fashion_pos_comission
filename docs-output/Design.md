# Design System: Soni Fashion POS

## 1. Core Identity & Vibe
The POS interface should feel less like a traditional cash register and more like a high-end editorial catalog. It needs to reflect the premium, consultative experience of purchasing wedding attire (Lehngas, Maxis, Saaris). 
* **Keywords:** Elegant, Traditional, Editorial, Spacious, High-Contrast.
* **Avoid:** Heavy drop shadows, overly rounded corners, bright neon accents, cluttered data tables.

## 2. Color Palette
Extracted and expanded from the brand logo (`image_cdf617.png`). The interface relies heavily on the background color to establish the boutique feel, completely avoiding stark `#FFFFFF` white.

* **Base/Background (The Canvas):** 
  * `Cream Ivory`: `#F7F5F0` (Use for the main application background).
  * `Soft Alabaster`: `#EFEBE3` (Use for secondary panels or slightly highlighting an active order area).
* **Primary Text & Accents (The Ink):**
  * `Deep Espresso`: `#332822` (Primary brand color for logos, headers, primary buttons, and main text).
  * `Muted Taupe`: `#7A6F69` (For secondary text, placeholders, and inactive states).
* **Utility Colors (Subtle & Restrained):**
  * `Success/Payment`: `#4A5D4E` (A muted, earthy sage green—avoid bright neon green).
  * `Error/Delete`: `#8C3A3A` (A brick red, keeping in line with bridal colors rather than harsh alert reds).

## 3. Typography
The logo features a beautiful high-contrast serif. We need to pair a similar display font with a highly legible sans-serif for the actual POS data (prices, SKUs, inventory counts).

* **Primary Display Font (Headers, Brand, Large Totals):** `Playfair Display` or `Cinzel`.
  * *Usage:* Page titles (e.g., "New Order"), Section headers, Grand Total numbers.
  * *Styling:* Standard case for sentences, but use `UPPERCASE` with wide letter-spacing (`tracking-widest` in Tailwind) for navigation items.
* **Secondary UI Font (Product Names, SKUs, Buttons, Inputs):** `Optima` or `Lato`.
  * *Usage:* Everything else. `Optima` retains a touch of elegance while being readable on a screen.
  * *Styling:* Keep font weights light (300) to regular (400). Only use bold (600) for line-item prices.

## 4. UI Components & Spacing

### Layout & Spacing
* Use **generous padding**. Do not cram products together. 
* Margins between main sections (e.g., Product Grid vs. Cart Sidebar) should be wide. 
* Use thin, solid lines (`1px solid #7A6F69`) as dividers instead of drop shadows or colored blocks.

### Buttons
No pill shapes. Buttons should be structural and elegant.
* **Primary Action (e.g., "Charge Rs. 150,000"):** 
  * Background: `Deep Espresso` (`#332822`)
  * Text: `Cream Ivory` (`#F7F5F0`), Uppercase, Wide tracking.
  * Border Radius: `0px` (Completely square) or max `2px`.
* **Secondary Action (e.g., "Save Draft", "Hold Order"):**
  * Background: Transparent.
  * Border: `1px solid #332822`.
  * Text: `Deep Espresso`.

### Inputs & Search Bars
* Remove heavy borders. Use bottom-border only (`border-b`) for text inputs, giving it a classic ledger feel.
* *Example Focus State:* When searching for a "Bridal Lehnga", the bottom border simply thickens slightly, without glowing outlines.

### Product Cards (Grid)
* **Image:** High-quality, uncropped vertical images (fashion aspect ratio 3:4).
* **Container:** No background card color. Just the image, with the title and price written underneath centered, in `Deep Espresso`. 
* **Hover State:** A very subtle opacity shift on the image, no lifting or floating animations.

## 5. Layout Structure (Consultative POS)
Since selling wedding dresses involves high-ticket, customized items rather than rapid barcode scanning:
* **Left Panel (60%):** Large, visual product grid categorized gracefully (Lehngas, Saaris, Maxis, Alterations). 
* **Right Panel (40%):** The "Ledger" (Cart). Minimalist list. Capable of handling custom notes for every item (e.g., "Custom fitting required for sleeves").

## 6. Desktop Layout Architecture (Horizontal Flow)

The desktop layout should take advantage of horizontal space by utilizing a persistent, multi-pane structure. Avoid modal popups for standard operations; instead, use sliding side-panels or dedicated on-screen sections to keep the user anchored.

*   **Global Layout:** A strict `flex-row` setup spanning `100vh` without vertical page scrolling. All scrolling should be contained within specific panes (e.g., the product grid or the cart ledger).
*   **The Three-Pane Structure:**
    1.  **Sidebar (Left - 15%):** Persistent navigation. 
        *   *Items:* Point of Sale, Custom Orders, Client Directory, Alterations, Settings.
        *   *Styling:* `Soft Alabaster` (`#EFEBE3`) background, a vertical hairline border separating it from the main content. The Soni Fashion "SF" monogram sits at the top center.
    2.  **Main Catalog (Center - 55%):** The visual inventory.
        *   *Structure:* A responsive CSS Grid (`grid-cols-3` or `grid-cols-4`).
        *   *Scrolling:* Hidden scrollbars (`scrollbar-hide`), but fully scrollable via mouse wheel. Sticky category headers (e.g., "Bridal Lehngas") that lock to the top as the user scrolls.
    3.  **The Ledger / Cart (Right - 30%):** The active transaction.
        *   *Styling:* `Cream Ivory` (`#F7F5F0`) background with a solid `Deep Espresso` (`#332822`) border on the left.
        *   *Content:* Line items, subtotal, tax, and a prominent, full-width primary action button pinned to the bottom (e.g., "PROCEED TO PAYMENT").

## 7. Desktop Interactions & Workflow

With a mouse and keyboard, the POS should prioritize speed and precision, balancing the high-end boutique aesthetic with raw efficiency.

*   **Hover States:**
    *   Since touch is not the primary input, implement elegant, deliberate hover states. 
    *   *Products:* When hovering over a garment in the grid, reveal a quick "Add to Cart" text overlay and a secondary "View Details" text link in `Deep Espresso`. No jarring zoom effects; use a gentle `.5s ease-in-out` opacity transition.
    *   *Action Items:* Hovering over the primary checkout button should invert the colors (Background becomes `Cream Ivory`, Text becomes `Deep Espresso` with a `1px solid #332822` border).
*   **Keyboard Shortcuts (Power User Features):**
    *   Implement global event listeners for rapid navigation without the mouse.
    *   `Ctrl + K` or `Cmd + K`: Focuses the global search bar to instantly find items by SKU (e.g., "SF-LHN-001").
    *   `F2`: Jumps directly to the "Customer Name/Phone" input field in the Ledger.
    *   `Enter`: Submits the payment when the checkout modal is open.

## 8. Handling Complex Data (Bridal & Tailoring)

> [!IMPORTANT]
> **Scope & Feature Disclaimer:** This section illustrates conceptual layout patterns for high-density UI design. It does **not** introduce or authorize new functional features (such as garment alteration trackers, measurement input databases, or installment payment schedulers). Any speculative features described below are explicitly **disapproved** for implementation unless formally authorized by the client. The POS engine adheres strictly to direct retail inventory sales, cash/online checkout, and item exchanges.

Wedding attire requires extensive customization (measurements, alteration notes, advance deposits). Desktop screens provide the width needed to handle this without cluttering the screen.

*   **The "Alteration" Split-Pane:** 
    *   When an item in the Ledger requires customization, clicking it shouldn't open a tiny tooltip. Instead, the main catalog (Center Pane) smoothly slides out, replaced by a "Garment Specifications" view.
    *   *Form Design:* Group inputs logically. 
        *   **Measurements:** Chest, Waist, Length (use simple, bottom-border text inputs).
        *   **Notes:** A large, unstyled `<textarea>` for specific requests ("Add extra lace to the dupatta").
*   **Deposit & Split Payments:** 
    *   Bridal wear is often paid in installments. The payment section at the bottom of the Ledger must clearly separate "Total Amount", "Advance Received", and "Balance Due" using tabular layouts (`display: table` or grid) for perfect decimal alignment. Ensure all monetary values are right-aligned.

---

## 9. Finalized Personalization, UX & Implementation Plan

This section serves as the authoritative specification for custom client workflows, stock management, exchange rules, and UI personalization.

### 9.1 Stock Addition & SKU Generation Flow
The inventory pipeline follows a strict, two-tier hierarchical structure:
1. **Vendor Registration:** Every wholesale vendor is registered first with a unique short code representing their business initials (e.g., `SUI-AR` for Sui Dhaga / Ahmed Raza). This short code serves as the prefix indicator for all batch supplies from this vendor.
2. **Article & SKU Registration:** Articles are added strictly under an existing registered vendor. For each garment, two codes coexist:
   - **Supplier Article Number:** Incorporates the vendor short code (`SUI-AR-XXXX`).
   - **Public Customer-Facing SKU:** Automatically generated or assigned using our brand initials (e.g., `SF-101` or `SF-LHN-001`). This `SF-` SKU is printed on price tags and receipts for fast customer returns without exposing vendor identity.

### 9.2 Item Exchange Workflow & Rules
1. **Lookup Hierarchy:**
   - **Primary Lookup:** Search by exact **Invoice Number** (e.g., `INV-20260629-0001`).
   - **Fallback Lookup:** Search by either the **Public-Facing SKU** (`SF-101`) or the **Supplier-Article Number** (`SUI-AR-001`).
2. **Stock & Financial Reconciliation:**
   - **Returned Item:** Quantities returned by the customer are immediately restocked into active inventory.
   - **New Replacement Item:** Deducted from active inventory.
   - **Settlement Formula:** $\text{Net Payable / Refundable} = \text{New Item Amount} - \text{Previous Item Amount}$.
3. **Exchange Receipt:**
   - The finalized thermal printout must explicitly header and label the voucher as an **Exchange Sale Receipt** listing both the returned merchandise credits and new replacement charges.

### 9.3 Prioritized Execution Roadmap

#### Priority 1: Critical Bug Fixes & UI Clipping (Immediate Execution)
1. **Returns & Exchanges Data Unwrapping Fix:**
   - *Issue:* Searching an invoice or SKU shows `"VERIFIED COMPLETED SALE"` but displays `Invalid Date`, `Original Staff: N/A`, and `0 items`.
   - *Root Cause:* Backend IPC bridge wraps responses in `{ success: true, data: saleObject }`. Frontend assumed raw object return.
   - *Fix:* Update `handleInvoiceLookup` and `handleSkuSearch` in `Returns.jsx` to unwrap `res.data`.
2. **Global Dialog & Modal Clipping Fix:**
   - *Issue:* Modals (such as Supplier Registration) get clipped inside child containers instead of rendering fullscreen.
   - *Fix:* Ensure all dialogs render via top-level portals (`fixed inset-0 z-[100]`) covering the entire browser window.
3. **Cart Search Dropdown Z-Index Polish:**
   - *Issue:* Article search dropdown results appear behind active cart items in POS.
   - *Fix:* Elevate search overlay z-index (`z-50`) with a solid backdrop in `POSSale.jsx`.

#### Priority 2: Business Policy & Currency Standardizations
1. **Strict Exchange-Only Policy:**
   - Remove "Standard Refund" option from `Returns.jsx`. Enforce item exchanges only (no standalone cash refunds).
2. **Simplified POS Payment Methods:**
   - Restrict POS checkout options strictly to **Cash** and **Online** transfers. Remove card, cheque, and split selectors.
3. **PKR Currency Standardization:**
   - Enforce integer PKR formatting (`Rs. 18,500`) across all modules. Purge all `$` icons or currency symbols.

#### Priority 3: Dashboard & Metrics Personalization
1. **Remove Valuations & Stock Alerts:** Strip out Wholesale Valuation, Retail Valuation, and Critical Stock Warning cards from `Dashboard.jsx`.
2. **Remove Pending Payout Metrics:** Remove outstanding staff payout figures from the dashboard.
3. **Remove Revenue Potential:** Eliminate retail revenue potential projections from inventory and reporting screens.