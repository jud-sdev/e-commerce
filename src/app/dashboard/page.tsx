import { requireAuth } from '@/lib/auth-utils'
import { LogoutButton } from '@/components/auth/logout-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <LogoutButton />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>You're signed in as {user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Name:</span>
                <span className="text-sm font-medium">{user.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Role:</span>
                <span className="text-sm font-medium">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">User ID:</span>
                <span className="text-sm font-medium font-mono">{user.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No orders yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shopping Cart</CardTitle>
            <CardDescription>Items in your cart</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Your cart is empty</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}