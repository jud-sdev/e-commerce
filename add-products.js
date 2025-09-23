const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
})

async function addProducts() {
  try {
    // Check for existing categories
    let electronics = await prisma.category.findFirst({
      where: { slug: 'electronics' }
    })
    
    if (!electronics) {
      electronics = await prisma.category.create({
        data: {
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and gadgets'
        }
      })
    }

    let clothing = await prisma.category.findFirst({
      where: { slug: 'clothing' }
    })
    
    if (!clothing) {
      clothing = await prisma.category.create({
        data: {
          name: 'Clothing', 
          slug: 'clothing',
          description: 'Fashion and apparel'
        }
      })
    }

    // Delete existing products first
    await prisma.product.deleteMany({})

    // Create sample products individually to handle images
    const products = [
      {
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
        price: 199.99,
        inventory: 50,
        categoryId: electronics.id,
        status: 'ACTIVE',
        featured: true
      },
      {
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'Latest model with 5G connectivity and advanced camera system',
        price: 899.99,
        inventory: 25,
        categoryId: electronics.id,
        status: 'ACTIVE',
        featured: true
      },
      {
        name: 'Laptop',
        slug: 'laptop',
        description: 'High-performance laptop for work and gaming',
        price: 1299.99,
        inventory: 15,
        categoryId: electronics.id,
        status: 'ACTIVE',
        featured: true
      },
      {
        name: 'T-Shirt',
        slug: 't-shirt',
        description: 'Comfortable cotton t-shirt in various colors',
        price: 29.99,
        inventory: 100,
        categoryId: clothing.id,
        status: 'ACTIVE',
        featured: false
      },
      {
        name: 'Jeans',
        slug: 'jeans',
        description: 'Classic denim jeans with perfect fit',
        price: 79.99,
        inventory: 60,
        categoryId: clothing.id,
        status: 'ACTIVE',
        featured: true
      },
      {
        name: 'Sneakers',
        slug: 'sneakers',
        description: 'Comfortable running shoes for everyday wear',
        price: 89.99,
        inventory: 40,
        categoryId: clothing.id,
        status: 'ACTIVE',
        featured: true
      }
    ]

    for (const product of products) {
      await prisma.product.create({
        data: product
      })
    }

    const count = await prisma.product.count()
    console.log(`✅ Database seeded successfully! Total products: ${count}`)
    
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addProducts()
