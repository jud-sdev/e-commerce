import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const exportData = searchParams.get('export') === 'true'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (category && category !== 'all') {
      where.categoryId = category
    }

    if (lowStock) {
      where.inventory = { lte: 10 } // Low stock threshold
    }

    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'inventory') {
      orderBy.inventory = sortOrder
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder
    } else if (sortBy === 'category') {
      orderBy.category = { name: sortOrder }
    } else {
      orderBy[sortBy] = sortOrder
    }

    if (exportData) {
      // Export all matching products as CSV
      const products = await prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          images: { select: { url: true }, take: 1 },
          variants: { select: { inventory: true } },
          _count: {
            select: {
              orderItems: {
                where: {
                  order: { paymentStatus: 'SUCCEEDED' }
                }
              }
            }
          }
        },
        orderBy
      })

      // Generate CSV
      const csvHeaders = [
        'ID',
        'Name',
        'SKU',
        'Category',
        'Status',
        'Price',
        'Inventory',
        'Variants Inventory',
        'Total Sold',
        'Created Date',
        'Updated Date'
      ]

      const csvRows = products.map(product => {
        const variantsInventory = product.variants.reduce((sum, v) => sum + v.inventory, 0)

        return [
          product.id,
          product.name,
          product.sku || '',
          product.category?.name || 'Uncategorized',
          product.status,
          product.price.toString(),
          product.inventory.toString(),
          variantsInventory.toString(),
          product._count.orderItems.toString(),
          product.createdAt.toISOString(),
          product.updatedAt.toISOString()
        ]
      })

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Regular API response
    const [products, totalProducts, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { select: { url: true, altText: true }, take: 1 },
          variants: { select: { id: true, name: true, value: true, inventory: true } },
          _count: {
            select: {
              orderItems: {
                where: {
                  order: { paymentStatus: 'SUCCEEDED' }
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),

      prisma.product.count({ where }),

      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    ])

    const totalPages = Math.ceil(totalProducts / limit)
    const hasMore = page < totalPages

    // Calculate inventory summary
    const inventorySummary = await prisma.product.aggregate({
      _sum: { inventory: true },
      _count: { _all: true },
      where: { status: 'ACTIVE' }
    })

    const lowStockCount = await prisma.product.count({
      where: {
        ...where,
        inventory: { lte: 10 },
        status: 'ACTIVE'
      }
    })

    const outOfStockCount = await prisma.product.count({
      where: {
        ...where,
        inventory: { lte: 0 },
        status: 'ACTIVE'
      }
    })

    const formattedProducts = products.map(product => {
      const variantsInventory = product.variants.reduce((sum, v) => sum + v.inventory, 0)
      const totalInventory = product.inventory + variantsInventory

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        inventory: product.inventory,
        variantsInventory,
        totalInventory,
        status: product.status,
        featured: product.featured,
        category: product.category,
        image: product.images[0]?.url || null,
        variants: product.variants,
        totalSold: product._count.orderItems,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      }
    })

    return NextResponse.json({
      products: formattedProducts,
      categories,
      summary: {
        totalProducts: inventorySummary._count._all,
        totalInventory: inventorySummary._sum.inventory || 0,
        lowStockCount,
        outOfStockCount
      },
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        hasMore
      }
    })

  } catch (error) {
    console.error('Inventory error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { productId, inventory, status, price, comparePrice, sku, variantUpdates } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const updateData: any = {}

    if (typeof inventory === 'number' && inventory >= 0) {
      updateData.inventory = inventory
    }

    if (status) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (typeof price === 'number' && price >= 0) {
      updateData.price = price
    }

    if (typeof comparePrice === 'number' && comparePrice >= 0) {
      updateData.comparePrice = comparePrice
    } else if (comparePrice === null) {
      updateData.comparePrice = null
    }

    if (sku !== undefined) {
      updateData.sku = sku
    }

    updateData.updatedAt = new Date()

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        images: { select: { url: true, altText: true }, take: 1 },
        variants: true
      }
    })

    // Update variants if provided
    if (variantUpdates && Array.isArray(variantUpdates)) {
      for (const variantUpdate of variantUpdates) {
        if (variantUpdate.id && typeof variantUpdate.inventory === 'number') {
          await prisma.productVariant.update({
            where: { id: variantUpdate.id },
            data: { inventory: variantUpdate.inventory }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct
    })

  } catch (error) {
    console.error('Update inventory error:', error)
    return NextResponse.json({
      error: 'Failed to update inventory'
    }, { status: 500 })
  }
}