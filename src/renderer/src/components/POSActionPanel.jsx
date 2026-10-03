import React from 'react'
import {
  SearchIcon,
  RefreshIcon,
  BarcodeIcon,
} from './icons/TechnicalIcons.jsx'
import {
  NewDocumentIcon,
  POSCheckoutIcon,
  POSPrintIcon,
  POSDeleteIcon,
  SalesmanIcon,
  DiscountAmountIcon,
  CreditSaleIcon,
  OfferTicketIcon,
  ParkBillIcon,
  ListParkedIcon,
} from './icons/POSActionIcons.jsx'

export function POSActionPanel({
  searchInputRef,
  searchTerm,
  onSearchChange,
  onSearchKeyDown,
  searching,
  searchResults,
  onClearSearch,
  onAddToCart,
  processing,
  itemsLength,
  onCompleteSale,
  onNewDocument,
  onOpenDiscountModal,
  onOpenReprint,
  parkedCarts,
  onResumeParkedCart,
  onDeleteParkedCart,
  notes,
  onNotesChange,
}) {
  return (
    <div className="w-full lg:w-80 bg-[#FCFBFA] p-5 flex flex-col gap-3 shrink-0 select-none">
      {/* Dedicated SKU search zone — top of action grid */}
      <div className="relative z-20 shrink-0">
        <div className="bg-[#F7F5F0] px-3 py-3">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-[#7A6F69] absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              value={searchTerm}
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="Scan Barcode or type SKU / Name — press Enter to add..."
              className="w-full pl-6 pr-8 py-2 bg-transparent text-[#332822] font-normal text-sm placeholder-[#7A6F69] focus:outline-none border-b border-[#C9C0B5] focus:border-[#2E2822] transition-colors"
            />
            {searching ? (
              <RefreshIcon className="w-4 h-4 text-[#7A6F69] animate-spin absolute right-0 top-1/2 -translate-y-1/2" />
            ) : searchTerm ? (
              <BarcodeIcon className="w-4 h-4 text-[#7A6F69] absolute right-0 top-1/2 -translate-y-1/2" />
            ) : null}
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="bg-[#F7F5F0] border-t border-[#C9C0B5]/60 max-h-64 overflow-y-auto">
            <div className="px-3 pt-2 pb-1 flex items-baseline justify-between gap-4">
              <span className="text-[9px] font-normal uppercase tracking-[0.22em] text-[#7A6F69]">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} — enter adds top
              </span>
              <button
                type="button"
                onClick={onClearSearch}
                className="text-[9px] font-normal uppercase tracking-[0.18em] text-[#7A6F69] hover:text-[#2E2822] transition-colors shrink-0"
              >
                clear
              </button>
            </div>

            {searchResults.map((art, idx) => (
              <button
                key={art.id}
                type="button"
                role="option"
                aria-selected={idx === 0}
                onClick={() => onAddToCart(art)}
                className={`w-full px-3 py-3 text-left flex items-center justify-between gap-4 border-b border-[#C9C0B5]/40 last:border-b-0 transition-colors hover:bg-[#EFEBE3]/80 ${
                  idx === 0 ? 'bg-[#EFEBE3]/40' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-sans font-medium text-[#2E2822] text-sm leading-snug truncate">
                    {art.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#7A6F69] mt-1">
                    <span className="font-mono">{art.sku}</span>
                    <span className="mx-2 text-[#C9C0B5]">·</span>
                    stock {art.quantity}
                    {idx === 0 && (
                      <>
                        <span className="mx-2 text-[#C9C0B5]">·</span>
                        <span className="tracking-[0.18em]">[ enter ]</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="font-mono font-semibold text-[#2E2822] text-sm tabular-nums shrink-0">
                  Rs.&nbsp;{Number(art.retail_price || 0).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Grid — classic POS reference icons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCompleteSale}
          disabled={processing || itemsLength === 0}
          className="col-span-2 py-5 px-4 bg-[#1E2832] hover:bg-[#2C3A47] text-[#F7F5F0] font-display font-bold text-xl uppercase tracking-[0.12em] flex items-center justify-center gap-3 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed border-0 shadow-md rounded-none"
        >
          {processing ? (
            <RefreshIcon className="w-6 h-6 animate-spin text-[#C9B99A]" />
          ) : (
            <POSCheckoutIcon className="w-6 h-6 text-[#C9B99A]" />
          )}
          <span>Checkout [F12]</span>
        </button>

        <button
          onClick={onNewDocument}
          className="p-4 bg-[#F7F5F0] hover:bg-[#EFEBE3] text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 rounded-none"
        >
          <NewDocumentIcon className="w-6 h-6 text-[#332822]" />
          <span>New Document</span>
        </button>

        <button
          onClick={onOpenDiscountModal}
          className="p-4 bg-[#F7F5F0] hover:bg-[#EFEBE3] text-[#332822] font-medium text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all text-center h-24 border-0 rounded-none"
        >
          <DiscountAmountIcon className="w-6 h-6 text-[#332822]" />
          <span>Set Discount</span>
        </button>

        <button
          onClick={onOpenReprint}
          className="col-span-2 py-3.5 px-4 bg-[#F7F5F0] hover:bg-[#EFEBE3] text-[#332822] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-center border-0 rounded-none"
        >
          <OfferTicketIcon className="w-5 h-5 text-[#332822]" />
          <span>Reprint Sale</span>
        </button>
      </div>

      {/* Inline Parked Bills List */}
      {parkedCarts && parkedCarts.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-[#7A6F69] border-b border-[#C9C0B5] pb-1">
            Parked Documents
          </div>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
            {parkedCarts.map((cart) => (
              <div
                key={cart.id}
                className="bg-[#F7F5F0] border border-[#C9C0B5]/50 flex flex-col gap-1 p-2 cursor-pointer hover:bg-[#EFEBE3] transition-colors"
                onClick={() => onResumeParkedCart(cart.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-xs text-[#2E2822]">{cart.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteParkedCart(cart.id);
                    }}
                    className="text-rose-600 hover:text-rose-800 p-0.5"
                    title="Discard"
                  >
                    <POSDeleteIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                {cart.firstItemName && (
                  <div className="text-[10px] text-[#2E2822] font-medium truncate italic" title={cart.firstItemName}>
                    {cart.firstItemName}
                  </div>
                )}
                <div className="text-[9px] text-[#7A6F69]">
                  Items: {cart.items?.length || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A6F69] block mb-1">
          Remarks / Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={onNotesChange}
          placeholder="Optional sale note..."
          className="w-full px-3 py-2.5 bg-[#F7F5F0] text-[#332822] font-medium text-xs placeholder-[#7A6F69] focus:outline-none border-b border-[#C9C0B5] focus:border-[#2E2822] transition-colors rounded-none"
        />
      </div>
    </div>
  )
}
