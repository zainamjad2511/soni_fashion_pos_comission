import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import {
  DashboardPage,
  POSSalePage,
  InventoryPage,
  SuppliersPage,
  ReturnsPage,
  ExpensesPage,
  ReportsPage,
  SalespersonsPage,
  SettingsPage,
  AuditLogPage
} from './pages/index.jsx'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sale" element={<POSSalePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="salespersons" element={<SalespersonsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
