import React from 'react'
import { PlaceholderPage } from './PlaceholderPage.jsx'
import { Settings as SettingsComponent } from './Settings.jsx'
import { Suppliers as SuppliersComponent } from './Suppliers.jsx'
import { Inventory as InventoryComponent } from './Inventory.jsx'
import { Dashboard as DashboardComponent } from './Dashboard.jsx'
import { Salespersons as SalespersonsComponent } from './Salespersons.jsx'
import { POSSale as POSSaleComponent } from './POSSale.jsx'
import { Returns as ReturnsComponent } from './Returns.jsx'
import { Expenses as ExpensesComponent } from './Expenses.jsx'
import { Reports as ReportsComponent } from './Reports.jsx'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  RotateCcw,
  Receipt,
  BarChart3,
  Users,
  Settings,
  ShieldAlert
} from 'lucide-react'

export function DashboardPage() {
  return <DashboardComponent />
}

export function POSSalePage() {
  return <POSSaleComponent />
}

export function InventoryPage() {
  return <InventoryComponent />
}

export function SuppliersPage() {
  return <SuppliersComponent />
}

export function ReturnsPage() {
  return <ReturnsComponent />
}

export function ExpensesPage() {
  return <ExpensesComponent />
}

export function ReportsPage() {
  return <ReportsComponent />
}

export function SalespersonsPage() {
  return <SalespersonsComponent />
}

export function SettingsPage() {
  return <SettingsComponent />
}

export function AuditLogPage() {
  return (
    <PlaceholderPage
      title="System Security & Audit Log"
      sprint="Sprint 1 (Task 1.13)"
      description="Tamper-evident chronological activity ledger recording price edits, stock overrides, and voided transactions."
      icon={ShieldAlert}
    />
  )
}
