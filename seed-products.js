const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
})

async function seed() {
  try {
    // Create categories
    const electronics = await prisma.category.create({
      data: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets'
      }
    })

    const clothing = await prisma.category.create({
      data: {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel'
      }
    })

    // Create sample products
    await prisma.product.createMany({
      data: [
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
    })

    console.log('✅ Database seeded successfully with sample products!')
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
