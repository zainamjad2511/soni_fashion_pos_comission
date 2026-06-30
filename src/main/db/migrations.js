export function runMigrations(db) {
  // Ensure settings table exists first to check schema_version
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT NOT NULL PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const row = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get()
  const currentVersion = row ? parseInt(row.value, 10) : 0

  console.log(`[Migrations] Current schema version: ${currentVersion}`)

  if (currentVersion < 1) {
    console.log('[Migrations] Applying V1 Migration...')
    
    const migrateV1 = db.transaction(() => {
      // 1. suppliers
      db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          code       TEXT    NOT NULL UNIQUE,
          contact    TEXT,
          address    TEXT,
          notes      TEXT,
          is_active  INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 2. articles
      db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id                     INTEGER PRIMARY KEY AUTOINCREMENT,
          sku                    TEXT    NOT NULL UNIQUE,
          supplier_id            INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
          supplier_article_code  TEXT    NOT NULL,
          name                   TEXT,
          category               TEXT,
          colour                 TEXT,
          size                   TEXT,
          wholesale_price        REAL    NOT NULL CHECK (wholesale_price >= 0),
          retail_price           REAL    NOT NULL CHECK (retail_price >= 0),
          quantity               INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
          reorder_level          INTEGER          DEFAULT 5,
          notes                  TEXT,
          is_active              INTEGER NOT NULL DEFAULT 1,
          created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (supplier_id, supplier_article_code)
        );
      `)

      // 3. stock_movements
      db.exec(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id     INTEGER NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
          movement_type  TEXT    NOT NULL CHECK (movement_type IN ('IN','OUT','RETURN_IN','ADJUSTMENT')),
          quantity       INTEGER NOT NULL,
          reference_type TEXT,
          reference_id   INTEGER,
          note           TEXT,
          performed_by   TEXT,
          created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 4. salespersons
      db.exec(`
        CREATE TABLE IF NOT EXISTS salespersons (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          contact    TEXT,
          notes      TEXT,
          is_active  INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 5. commission_rates
      db.exec(`
        CREATE TABLE IF NOT EXISTS commission_rates (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          salesperson_id  INTEGER NOT NULL REFERENCES salespersons(id) ON DELETE CASCADE,
          month           TEXT    NOT NULL,
          rate_percent    REAL    NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (salesperson_id, month)
        );
      `)

      // 6. sales
      db.exec(`
        CREATE TABLE IF NOT EXISTS sales (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number     TEXT    NOT NULL UNIQUE,
          salesperson_id     INTEGER REFERENCES salespersons(id) ON DELETE SET NULL,
          sale_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          subtotal           REAL    NOT NULL,
          total_discount     REAL    NOT NULL DEFAULT 0,
          grand_total        REAL    NOT NULL,
          payment_method     TEXT    NOT NULL DEFAULT 'cash',
          notes              TEXT,
          status             TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided')),
          exchange_return_id INTEGER REFERENCES returns(id),
          created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 7. sale_items
      db.exec(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id                        INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id                   INTEGER NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
          article_id                INTEGER NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
          quantity                  INTEGER NOT NULL CHECK (quantity > 0),
          retail_price_snapshot     REAL    NOT NULL,
          wholesale_price_snapshot  REAL    NOT NULL,
          discount_amount           REAL    NOT NULL DEFAULT 0,
          line_total                REAL    NOT NULL,
          created_at                DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 8. commissions
      db.exec(`
        CREATE TABLE IF NOT EXISTS commissions (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id           INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
          salesperson_id    INTEGER NOT NULL REFERENCES salespersons(id) ON DELETE RESTRICT,
          sale_amount       REAL    NOT NULL,
          rate_percent      REAL    NOT NULL,
          commission_amount REAL    NOT NULL,
          month             TEXT    NOT NULL,
          status            TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','reversed')),
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 9. returns
      db.exec(`
        CREATE TABLE IF NOT EXISTS returns (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          return_number        TEXT    NOT NULL UNIQUE,
          original_sale_id     INTEGER REFERENCES sales(id) ON DELETE RESTRICT,
          return_type          TEXT    NOT NULL CHECK (return_type IN ('refund','exchange','manual')),
          return_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_by         INTEGER REFERENCES salespersons(id) ON DELETE SET NULL,
          refund_amount        REAL    NOT NULL DEFAULT 0,
          refund_credit        REAL    NOT NULL DEFAULT 0,
          exchange_new_sale_id INTEGER REFERENCES sales(id),
          notes                TEXT,
          created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 10. return_items
      db.exec(`
        CREATE TABLE IF NOT EXISTS return_items (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          return_id         INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
          sale_item_id      INTEGER REFERENCES sale_items(id) ON DELETE RESTRICT,
          article_id        INTEGER NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
          quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),
          refund_per_unit   REAL    NOT NULL,
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 11. expenses
      db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          category     TEXT    NOT NULL,
          description  TEXT,
          amount       REAL    NOT NULL CHECK (amount > 0),
          expense_date DATE    NOT NULL,
          recorded_by  TEXT,
          notes        TEXT,
          created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // 12. audit_log
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          action_type  TEXT    NOT NULL,
          entity_type  TEXT    NOT NULL,
          entity_id    INTEGER,
          description  TEXT    NOT NULL,
          old_value    TEXT,
          new_value    TEXT,
          performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_articles_supplier   ON articles(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_articles_sku        ON articles(sku);
        CREATE INDEX IF NOT EXISTS idx_articles_category   ON articles(category);
        CREATE INDEX IF NOT EXISTS idx_sales_date          ON sales(sale_date);
        CREATE INDEX IF NOT EXISTS idx_sales_salesperson   ON sales(salesperson_id);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale     ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_sale_items_article  ON sale_items(article_id);
        CREATE INDEX IF NOT EXISTS idx_commissions_month   ON commissions(month, salesperson_id);
        CREATE INDEX IF NOT EXISTS idx_returns_sale        ON returns(original_sale_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_art ON stock_movements(article_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_date      ON audit_log(performed_at);
        CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(expense_date);
      `)

      // Update schema_version
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ('schema_version', '2', CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = '2', updated_at = CURRENT_TIMESTAMP
      `).run()
    })

    migrateV1()
    console.log('[Migrations] Successfully applied V1 Migration.')
  }

  if (currentVersion < 2) {
    console.log('[Migrations] Applying V2 Migration (relaxing payment_method check constraint)...')
    db.pragma('foreign_keys = OFF')
    try {
      const migrateV2 = db.transaction(() => {
        db.exec('DROP TABLE IF EXISTS sales_v2;')
        db.exec(`
          CREATE TABLE IF NOT EXISTS sales_v2 (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number     TEXT    NOT NULL UNIQUE,
            salesperson_id     INTEGER REFERENCES salespersons(id) ON DELETE SET NULL,
            sale_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            subtotal           REAL    NOT NULL,
            total_discount     REAL    NOT NULL DEFAULT 0,
            grand_total        REAL    NOT NULL,
            payment_method     TEXT    NOT NULL DEFAULT 'cash',
            notes              TEXT,
            status             TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided')),
            exchange_return_id INTEGER REFERENCES returns(id),
            created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          INSERT INTO sales_v2 (id, invoice_number, salesperson_id, sale_date, subtotal, total_discount, grand_total, payment_method, notes, status, exchange_return_id, created_at)
          SELECT id, invoice_number, salesperson_id, sale_date, subtotal, total_discount, grand_total, payment_method, notes, status, exchange_return_id, created_at FROM sales;

          DROP TABLE sales;
          ALTER TABLE sales_v2 RENAME TO sales;

          CREATE INDEX IF NOT EXISTS idx_sales_date        ON sales(sale_date);
          CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales(salesperson_id);

          INSERT INTO settings (key, value, updated_at) 
          VALUES ('schema_version', '2', CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = '2', updated_at = CURRENT_TIMESTAMP;
        `)
      })
      migrateV2()
      console.log('[Migrations] Successfully applied V2 Migration.')
    } finally {
      db.pragma('foreign_keys = ON')
    }
  }
}
