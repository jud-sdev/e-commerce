import { requireAdmin } from '@/lib/auth-utils'
import { LogoutButton } from '@/components/auth/logout-button'
import Link from 'next/link'
import { Package, Users, Settings, BarChart3, ShoppingCart, Warehouse, TrendingUp } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                User Dashboard
              </Link>
              <LogoutButton variant="outline" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              <Link
                href="/admin"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <BarChart3 className="mr-3 h-5 w-5" />
                Overview
              </Link>
              <Link
                href="/admin/products"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <Package className="mr-3 h-5 w-5" />
                Products
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <Settings className="mr-3 h-5 w-5" />
                Categories
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <ShoppingCart className="mr-3 h-5 w-5" />
                Orders
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <Users className="mr-3 h-5 w-5" />
                Users
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <Warehouse className="mr-3 h-5 w-5" />
                Inventory
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <TrendingUp className="mr-3 h-5 w-5" />
                Analytics
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
              >
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}