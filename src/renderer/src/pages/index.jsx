import React from 'react'
import { PlaceholderPage } from './PlaceholderPage.jsx'
import { Settings as SettingsComponent } from './Settings.jsx'
import { Suppliers as SuppliersComponent } from './Suppliers.jsx'
import { Inventory as InventoryComponent } from './Inventory.jsx'
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
  return (
    <PlaceholderPage
      title="Dashboard Overview"
      sprint="Sprint 1 (Task 1.12)"
      description="Executive KPIs, daily revenue summaries, alert tickers, and low-stock indicators will be rendered here."
      icon={LayoutDashboard}
    />
  )
}

export function POSSalePage() {
  return (
    <PlaceholderPage
      title="Point of Sale (POS) Terminal"
      sprint="Sprint 2"
      description="Barcode scanner support, fast sku lookups, instant cart calculations, discount toggles, and thermal receipt printing."
      icon={ShoppingCart}
    />
  )
}

export function InventoryPage() {
  return <InventoryComponent />
}

export function SuppliersPage() {
  return <SuppliersComponent />
}

export function ReturnsPage() {
  return (
    <PlaceholderPage
      title="Returns & Exchanges Processing"
      sprint="Sprint 4"
      description="Refund calculation engine, customer credit slips, net exchange billing, and damaged stock categorization."
      icon={RotateCcw}
    />
  )
}

export function ExpensesPage() {
  return (
    <PlaceholderPage
      title="Store Expense Management"
      sprint="Sprint 5"
      description="Categorized daily overhead logging, staff advance deduction tracking, and net shop profit reporting."
      icon={Receipt}
    />
  )
}

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports & Analytics"
      sprint="Sprint 5"
      description="Daily sales registers, monthly profit/loss statements, stock valuation audits, and exportable Excel sheets."
      icon={BarChart3}
    />
  )
}

export function SalespersonsPage() {
  return (
    <PlaceholderPage
      title="Salespersons & Commission Tracking"
      sprint="Sprint 6"
      description="Staff profiles, tiered monthly commission rate assignments, payout ledgers, and sales performance ranking."
      icon={Users}
    />
  )
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
