import React from 'react'
import { SearchIcon, RefreshIcon, BarcodeIcon } from './icons/TechnicalIcons.jsx'

/**
 * POS-style search box + live results dropdown, reused anywhere staff need
 * to find an article fast: type a name, SKU, or vendor code and either press
 * Enter (adds the top match) or click a row.
 */
export function InlineArticleSearch({
  label,
  value,
  onChange,
  onKeyDown,
  results,
  onSelect,
  searching,
  placeholder,
  autoFocus,
}) {
  return (
    <div className="relative z-20 shrink-0">
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A6F69] mb-1.5">
          {label}
        </div>
      )}
      <div className="bg-[#F7F5F0] px-3 py-3">
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-[#7A6F69] absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            autoFocus={autoFocus}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder || 'Type article name, SKU, or vendor code...'}
            className="w-full pl-6 pr-8 py-2 bg-transparent text-[#332822] font-normal text-sm placeholder-[#7A6F69] focus:outline-none border-b border-[#C9C0B5] focus:border-[#2E2822] transition-colors"
          />
          {searching ? (
            <RefreshIcon className="w-4 h-4 text-[#7A6F69] animate-spin absolute right-0 top-1/2 -translate-y-1/2" />
          ) : value ? (
            <BarcodeIcon className="w-4 h-4 text-[#7A6F69] absolute right-0 top-1/2 -translate-y-1/2" />
          ) : null}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-[#F7F5F0] border-t border-[#C9C0B5]/60 max-h-64 overflow-y-auto">
          <div className="px-3 pt-2 pb-1">
            <span className="text-[9px] font-normal uppercase tracking-[0.22em] text-[#7A6F69]">
              {results.length} result{results.length !== 1 ? 's' : ''} — enter adds top
            </span>
          </div>

          {results.map((art, idx) => (
            <button
              key={art.id}
              type="button"
              role="option"
              aria-selected={idx === 0}
              onClick={() => onSelect(art)}
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
                Rs.&nbsp;{Number(art.retail_price || art.selling_price || 0).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
