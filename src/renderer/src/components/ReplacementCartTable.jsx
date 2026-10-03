import React from 'react'
import { MinusIcon, PlusIcon, TrashIcon } from './icons/TechnicalIcons.jsx'
import { computeItemLineTotals } from '../store/cartStore.js'

/**
 * Replacement/exchange items table — POS-sized rows, sticky header. The
 * matching search box (InlineArticleSearch) lives in the action rail;
 * this is just the resulting document, same split as the POS cart table.
 */
export function ReplacementCartTable({
  replacementCart,
  onQtyChange,
  onPriceChange,
  onRemoveItem,
  formatCurrency,
}) {
  return (
    <table className="w-full text-left border-collapse font-sans">
      <thead>
        <tr className="bg-[#E4DBC8] text-[#332822] text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
          <th className="py-3.5 px-4 font-semibold">Replacement Article</th>
          <th className="py-3.5 px-4 text-right font-semibold">Retail</th>
          <th className="py-3.5 px-3 text-center w-28 font-semibold">Qty</th>
          <th className="py-3.5 px-3 text-right w-36 font-semibold">Unit Price</th>
          <th className="py-3.5 px-4 text-right font-semibold">Discount</th>
          <th className="py-3.5 px-4 text-right font-semibold">Line Total</th>
        </tr>
      </thead>
      <tbody className="text-sm md:text-base font-normal text-[#332822]">
        {replacementCart.length === 0 ? (
          <tr className="bg-white">
            <td colSpan={6} className="py-16 text-center text-[#7A6F69] font-normal text-base">
              No replacement items added yet.
            </td>
          </tr>
        ) : (
          replacementCart.map((item) => {
            const { lineTotal, unitDiscount } = computeItemLineTotals(item)
            const unitPriceInput =
              item.final_amount_input !== '' && item.final_amount_input !== undefined
                ? item.final_amount_input
                : item.retail_price_snapshot
            return (
              <tr key={item.article_id} className="bg-white hover:bg-[#F7F5F0] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-medium text-[#332822]">{item.name}</div>
                  <div className="font-mono text-xs text-[#7A6F69] mt-0.5">{item.sku}</div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[#332822]">{formatCurrency(item.retail_price_snapshot)}</td>
                <td className="p-0 h-px text-center w-28">
                  <div className="flex items-center justify-center gap-2 h-full">
                    <button
                      type="button"
                      onClick={() => onQtyChange(item.article_id, -1)}
                      className="p-1 border border-[#332822] text-[#332822] hover:bg-[#332822] hover:text-[#F7F5F0] rounded-[2px] transition-all"
                    >
                      <MinusIcon className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onQtyChange(item.article_id, 1)}
                      className="p-1 border border-[#332822] text-[#332822] hover:bg-[#332822] hover:text-[#F7F5F0] rounded-[2px] transition-all"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-0 h-px text-right w-36">
                  <input
                    type="number"
                    min="0"
                    max={item.retail_price_snapshot}
                    value={unitPriceInput}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                    onChange={(e) => onPriceChange(item.article_id, e.target.value)}
                    className="w-full h-full min-h-[46px] px-2 text-right bg-[#F7F5F0] text-[#332822] font-mono text-sm font-semibold focus:outline-none focus:bg-white border-0"
                  />
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-[#7A6F69]">
                  {unitDiscount > 0 ? `-${formatCurrency(unitDiscount)}` : '0'}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#332822]">
                  <div className="flex items-center justify-end gap-3">
                    <span>+{formatCurrency(lineTotal)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.article_id)}
                      className="text-[#7A6F69] hover:text-rose-700 p-1"
                      title="Remove"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
