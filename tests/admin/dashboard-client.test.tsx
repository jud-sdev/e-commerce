import { render, screen, waitFor } from '@testing-library/react'
import DashboardClient from '@/components/admin/dashboard-client'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockDashboardData = {
  overview: {
    totalProducts: 50,
    totalOrders: 100,
    totalUsers: 25,
    totalRevenue: 12500,
  },
  lowStockProducts: [
    {
      id: 'product1',
      name: 'Low Stock Product',
      inventory: 5,
      price: 99.99,
    },
  ],
  recentOrders: [
    {
      id: 'order1',
      orderNumber: 'ORD-001',
      total: 150.00,
      createdAt: new Date().toISOString(),
      user: { name: 'John Doe', email: 'john@example.com' },
    },
  ],
  topProducts: [
    {
      productId: 'product1',
      productName: 'Best Seller',
      quantity: 10,
      revenue: 999.90,
    },
  ],
}

describe('DashboardClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<DashboardClient />)

    expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument()
  })

  it('should render dashboard data after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<DashboardClient />)

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument() // Total products
      expect(screen.getByText('100')).toBeInTheDocument() // Total orders
      expect(screen.getByText('25')).toBeInTheDocument() // Total users
      expect(screen.getByText('$12,500.00')).toBeInTheDocument() // Total revenue
    })
  })

  it('should render low stock products', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<DashboardClient />)

    await waitFor(() => {
      expect(screen.getByText('Low Stock Products')).toBeInTheDocument()
      expect(screen.getByText('Low Stock Product')).toBeInTheDocument()
      expect(screen.getByText('5 units left')).toBeInTheDocument()
    })
  })

  it('should render recent orders', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<DashboardClient />)

    await waitFor(() => {
      expect(screen.getByText('Recent Orders')).toBeInTheDocument()
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('$150.00')).toBeInTheDocument()
    })
  })

  it('should render top products', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    } as Response)

    render(<DashboardClient />)

    await waitFor(() => {
      expect(screen.getByText('Top Products')).toBeInTheDocument()
      expect(screen.getByText('Best Seller')).toBeInTheDocument()
      expect(screen.getByText('10 sold')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    render(<DashboardClient />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<DashboardClient />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })
})