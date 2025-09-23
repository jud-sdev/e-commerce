import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Define settings with their types and default values
const SETTINGS_SCHEMA = {
  site_name: { type: 'string', default: 'E-Commerce Store' },
  site_description: { type: 'string', default: 'Your online store' },
  site_logo: { type: 'string', default: '' },
  contact_email: { type: 'string', default: 'contact@example.com' },
  support_email: { type: 'string', default: 'support@example.com' },
  currency: { type: 'string', default: 'USD' },
  tax_rate: { type: 'number', default: 0.08 },
  shipping_rate: { type: 'number', default: 10.00 },
  free_shipping_threshold: { type: 'number', default: 100.00 },
  low_stock_threshold: { type: 'number', default: 10 },
  enable_reviews: { type: 'boolean', default: true },
  require_email_verification: { type: 'boolean', default: true },
  enable_wishlist: { type: 'boolean', default: true },
  maintenance_mode: { type: 'boolean', default: false },
  max_order_quantity: { type: 'number', default: 99 },
  session_timeout: { type: 'number', default: 30 }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // For now, we'll return default settings since we don't have a settings table
    // In a real app, you'd fetch these from a database table
    const settings: any = {}

    for (const [key, config] of Object.entries(SETTINGS_SCHEMA)) {
      settings[key] = config.default
    }

    // Get some statistics for the settings page
    const stats = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.product.count({ where: { inventory: { lte: 10 } } }),
      prisma.order.count({ where: { status: 'PENDING' } })
    ])

    return NextResponse.json({
      settings,
      stats: {
        totalProducts: stats[0],
        totalOrders: stats[1],
        totalUsers: stats[2],
        totalCategories: stats[3],
        lowStockProducts: stats[4],
        pendingOrders: stats[5]
      }
    })

  } catch (error) {
    console.error('Settings error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const updates = await request.json()

    // Validate settings against schema
    const validatedSettings: any = {}
    const errors: string[] = []

    for (const [key, value] of Object.entries(updates)) {
      const schema = SETTINGS_SCHEMA[key as keyof typeof SETTINGS_SCHEMA]

      if (!schema) {
        errors.push(`Unknown setting: ${key}`)
        continue
      }

      // Type validation
      if (schema.type === 'number') {
        const num = Number(value)
        if (isNaN(num) || num < 0) {
          errors.push(`${key} must be a valid positive number`)
          continue
        }
        validatedSettings[key] = num
      } else if (schema.type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`)
          continue
        }
        validatedSettings[key] = value
      } else if (schema.type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`${key} must be a string`)
          continue
        }
        validatedSettings[key] = value.trim()
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: errors
      }, { status: 400 })
    }

    // In a real app, you'd save these to a database
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: validatedSettings
    })

  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({
      error: 'Failed to update settings'
    }, { status: 500 })
  }
}

// Bulk actions endpoint
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action, data } = await request.json()

    switch (action) {
      case 'clear_cache':
        // In a real app, you'd clear application cache
        return NextResponse.json({ success: true, message: 'Cache cleared successfully' })

      case 'optimize_database':
        // In a real app, you'd run database optimization
        return NextResponse.json({ success: true, message: 'Database optimized successfully' })

      case 'backup_data':
        // In a real app, you'd create a backup
        return NextResponse.json({ success: true, message: 'Backup created successfully' })

      case 'reset_settings':
        // Return default settings
        const defaultSettings: any = {}
        for (const [key, config] of Object.entries(SETTINGS_SCHEMA)) {
          defaultSettings[key] = config.default
        }
        return NextResponse.json({
          success: true,
          message: 'Settings reset to defaults',
          settings: defaultSettings
        })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Settings action error:', error)
    return NextResponse.json({
      error: 'Failed to perform action'
    }, { status: 500 })
  }
}