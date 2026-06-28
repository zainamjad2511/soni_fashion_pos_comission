export function runSeed(db) {
  console.log('[Seed] Seeding initial configuration settings...')

  const seedSettings = [
    ['shop_name', 'Soni Fashion'],
    ['shop_address', 'Qazi Market, Machli Bazar, Daska'],
    ['shop_contact', ''],
    ['sku_prefix', 'SF'],
    ['invoice_prefix', 'SNF-INV'],
    ['return_prefix', 'SNF-RET'],
    ['last_sku_number', '0'],
    ['last_invoice_number', '0'],
    ['last_return_number', '0'],
    ['receipt_footer', 'Thank you for shopping at Soni Fashion!'],
    ['receipt_printer_name', ''],
    ['default_commission', '5']
  ]

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `)

  const seedTransaction = db.transaction(() => {
    for (const [key, value] of seedSettings) {
      insertStmt.run(key, value)
    }
  })

  seedTransaction()
  console.log('[Seed] Initial settings seed completed.')
}
