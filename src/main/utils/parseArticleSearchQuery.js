/**
 * Classify free-text article search input into SKU, vendor-article, or plain text.
 *
 * Vendor-article form: VENDOR-ARTICLE (e.g. ZK-AR101). Split on the first hyphen only
 * so article codes that themselves contain hyphens still work (ZK-AR-101).
 *
 * Internal SKUs (prefix + digits, or bare numeric padded to that form) are never
 * treated as vendor-article codes.
 *
 * @param {string} raw
 * @param {string} [skuPrefix] - settings sku_prefix value, e.g. "SF" or "SF-"
 * @returns {{
 *   kind: 'sku' | 'vendor_article' | 'text',
 *   term: string,
 *   exactSku?: string | null,
 *   vendor?: string,
 *   article?: string,
 * }}
 */
export function parseArticleSearchQuery(raw, skuPrefix = 'SF') {
  const trimmed = String(raw || '').trim()
  if (!trimmed) {
    return { kind: 'text', term: '' }
  }

  const upper = trimmed.toUpperCase()
  const cleanPrefix = String(skuPrefix || 'SF').replace(/-+$/, '')
  const skuPrefixWithDash = `${cleanPrefix}-`

  // Bare numeric → pad to SF-XXXXX
  if (/^\d+$/.test(trimmed) && trimmed.length <= 5) {
    return {
      kind: 'sku',
      term: trimmed,
      exactSku: `${skuPrefixWithDash}${String(trimmed).padStart(5, '0')}`,
    }
  }

  // Already a full internal SKU: SF-00012
  if (
    upper.startsWith(skuPrefixWithDash.toUpperCase())
    && /^\d+$/.test(upper.slice(skuPrefixWithDash.length))
  ) {
    return {
      kind: 'sku',
      term: trimmed,
      exactSku: `${skuPrefixWithDash}${upper.slice(skuPrefixWithDash.length)}`,
    }
  }

  // Vendor-article: VENDOR-ARTICLE (first hyphen only)
  const dashIdx = upper.indexOf('-')
  if (dashIdx > 0 && dashIdx < upper.length - 1) {
    const vendor = upper.slice(0, dashIdx).trim()
    const article = upper.slice(dashIdx + 1).trim()
    if (vendor && article) {
      return {
        kind: 'vendor_article',
        term: trimmed,
        vendor,
        article,
      }
    }
  }

  return { kind: 'text', term: trimmed }
}

/**
 * Build SQL WHERE fragment + params for article free-text search.
 * Assumes `articles` and `suppliers` are already joined.
 *
 * @param {ReturnType<typeof parseArticleSearchQuery>} parsed
 * @returns {{ clause: string, params: unknown[], exactSku: string | null, exactVendorArticle: boolean }}
 */
export function buildArticleSearchClause(parsed) {
  const term = `%${parsed.term}%`
  const params = []
  let exactSku = null
  let exactVendorArticle = false

  if (parsed.kind === 'sku' && parsed.exactSku) {
    exactSku = parsed.exactSku
    const clause = `(
      articles.sku = ?
      OR articles.sku LIKE ?
      OR articles.name LIKE ?
      OR articles.supplier_article_code LIKE ?
      OR suppliers.code LIKE ?
      OR UPPER(suppliers.code || '-' || articles.supplier_article_code) LIKE ?
    )`
    params.push(exactSku, term, term, term, term, term.toUpperCase())
    return { clause, params, exactSku, exactVendorArticle }
  }

  if (parsed.kind === 'vendor_article') {
    exactVendorArticle = true
    const articleLike = `${parsed.article}%`
    const combinedLike = `${parsed.vendor}-${parsed.article}%`
    const clause = `(
      (UPPER(suppliers.code) = ? AND UPPER(articles.supplier_article_code) = ?)
      OR (UPPER(suppliers.code) = ? AND UPPER(articles.supplier_article_code) LIKE ?)
      OR UPPER(suppliers.code || '-' || articles.supplier_article_code) LIKE ?
      OR articles.sku LIKE ?
      OR articles.name LIKE ?
      OR articles.supplier_article_code LIKE ?
      OR suppliers.code LIKE ?
    )`
    params.push(
      parsed.vendor,
      parsed.article,
      parsed.vendor,
      articleLike,
      combinedLike,
      term,
      term,
      term,
      term,
    )
    return { clause, params, exactSku, exactVendorArticle }
  }

  const clause = `(
    articles.sku LIKE ?
    OR articles.name LIKE ?
    OR articles.supplier_article_code LIKE ?
    OR suppliers.code LIKE ?
    OR UPPER(suppliers.code || '-' || articles.supplier_article_code) LIKE ?
  )`
  params.push(term, term, term, term, term.toUpperCase())
  return { clause, params, exactSku, exactVendorArticle }
}
