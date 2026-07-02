export function runSeed(db) {
  console.log('[Seed] Seeding and personalizing configuration settings...')

  const seedSettings = [
    ['shop_name', 'Soni Fashion | سونی فیشن'],
    ['shop_tagline', 'Jahan Fashion enters your life'],
    ['shop_address', 'Qazi Market,Machli Bazar, Daska'],
    ['shop_contact', '03246470929'],
    ['sku_prefix', 'SF'],
    ['invoice_prefix', 'SF-INV'],
    ['return_prefix', 'SF-RET'],
    ['last_sku_number', '0'],
    ['last_invoice_number', '0'],
    ['last_return_number', '0'],
    ['receipt_footer', 'Exchange allowed within 7 days with original receipt. No cash refund. ONLY EXCHANGE IS ALLOWED'],
    ['receipt_printer_name', ''],
    ['default_commission', '1']
  ]

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `)

  const updateStmt = db.prepare(`
    UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?
  `)

  const seedTransaction = db.transaction(() => {
    for (const [key, value] of seedSettings) {
      insertStmt.run(key, value)
      // Force update client personalization fields on existing database instances
      if (['shop_name', 'shop_tagline', 'shop_contact', 'shop_address', 'receipt_footer'].includes(key)) {
        updateStmt.run(value, key)
      }
    }
  })

  seedTransaction()
  console.log('[Seed] Initial settings seed and personalization completed.')
}
