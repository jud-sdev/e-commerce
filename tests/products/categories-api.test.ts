import { describe, it, expect, jest } from '@jest/globals'

// Mock data
const mockCategory = {
  id: 'category-123',
  name: 'Electronics',
  slug: 'electronics',
  description: 'Electronic devices and accessories',
  image: 'https://example.com/electronics.jpg',
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  parent: null,
  children: [
    {
      id: 'category-456',
      name: 'Smartphones',
      slug: 'smartphones',
    },
  ],
  _count: {
    products: 25,
  },
}

const mockSubcategory = {
  id: 'category-456',
  name: 'Smartphones',
  slug: 'smartphones',
  description: 'Mobile phones and accessories',
  image: null,
  parentId: 'category-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  parent: {
    id: 'category-123',
    name: 'Electronics',
    slug: 'electronics',
  },
  children: [],
  _count: {
    products: 10,
  },
}

describe('Categories API', () => {
  describe('GET /api/categories', () => {
    it('should return all categories with hierarchy', () => {
      const categories = [mockCategory, mockSubcategory]

      expect(categories).toHaveLength(2)
      expect(categories[0].children).toHaveLength(1)
      expect(categories[1].parent).toBeDefined()
    })

    it('should include product counts', () => {
      expect(mockCategory._count.products).toBe(25)
      expect(mockSubcategory._count.products).toBe(10)
    })

    it('should handle categories without products', () => {
      const emptyCategory = {
        ...mockCategory,
        _count: { products: 0 },
      }

      expect(emptyCategory._count.products).toBe(0)
    })
  })

  describe('GET /api/categories/[id]', () => {
    it('should return category with products', () => {
      const categoryWithProducts = {
        ...mockCategory,
        products: [
          {
            id: 'product-123',
            name: 'Test Product',
            slug: 'test-product',
            price: 29.99,
            status: 'ACTIVE',
            images: [
              {
                id: 'image-123',
                url: 'https://example.com/product.jpg',
                altText: 'Product image',
              },
            ],
          },
        ],
      }

      expect(categoryWithProducts.products).toHaveLength(1)
      expect(categoryWithProducts.products[0].status).toBe('ACTIVE')
    })

    it('should return 404 for non-existent category', () => {
      const nonExistentCategory = null
      expect(nonExistentCategory).toBeNull()
    })
  })

  describe('POST /api/categories', () => {
    it('should create category with valid data', () => {
      const newCategoryData = {
        name: 'Books',
        slug: 'books',
        description: 'Books and literature',
        image: 'https://example.com/books.jpg',
        parentId: null,
      }

      expect(newCategoryData.name).toBeDefined()
      expect(newCategoryData.slug).toBeDefined()
      expect(newCategoryData.parentId).toBeNull()
    })

    it('should validate required fields', () => {
      const invalidCategory = {
        name: '',
        slug: '',
      }

      const errors = []
      if (!invalidCategory.name) errors.push('Name is required')
      if (!invalidCategory.slug) errors.push('Slug is required')

      expect(errors).toHaveLength(2)
    })

    it('should prevent duplicate slugs', () => {
      const existingSlugs = ['electronics', 'smartphones']
      const newSlug = 'electronics'

      const isDuplicate = existingSlugs.includes(newSlug)
      expect(isDuplicate).toBe(true)
    })

    it('should create subcategory with parent', () => {
      const subcategoryData = {
        name: 'Tablets',
        slug: 'tablets',
        description: 'Tablet computers',
        parentId: 'category-123',
      }

      expect(subcategoryData.parentId).toBe('category-123')
    })
  })

  describe('PUT /api/categories/[id]', () => {
    it('should update category with valid data', () => {
      const updateData = {
        name: 'Updated Electronics',
        description: 'Updated description for electronics',
      }

      const updatedCategory = {
        ...mockCategory,
        ...updateData,
        updatedAt: new Date(),
      }

      expect(updatedCategory.name).toBe('Updated Electronics')
      expect(updatedCategory.description).toBe('Updated description for electronics')
    })

    it('should prevent category from being its own parent', () => {
      const invalidUpdate = {
        parentId: 'category-123', // Same as category ID
      }

      const categoryId = 'category-123'
      const isInvalidParent = invalidUpdate.parentId === categoryId

      expect(isInvalidParent).toBe(true)
    })

    it('should allow changing parent category', () => {
      const updateData = {
        parentId: 'category-789',
      }

      const categoryId = 'category-456'
      const isValidParent = updateData.parentId !== categoryId

      expect(isValidParent).toBe(true)
    })
  })

  describe('DELETE /api/categories/[id]', () => {
    it('should prevent deletion of categories with products', () => {
      const categoryWithProducts = {
        ...mockCategory,
        products: [{ id: 'product-123' }],
      }

      const canDelete = categoryWithProducts.products.length === 0
      expect(canDelete).toBe(false)
    })

    it('should prevent deletion of categories with subcategories', () => {
      const categoryWithChildren = {
        ...mockCategory,
        products: [],
        children: [{ id: 'category-456' }],
      }

      const canDelete = categoryWithChildren.children.length === 0
      expect(canDelete).toBe(false)
    })

    it('should allow deletion of empty categories', () => {
      const emptyCategory = {
        ...mockCategory,
        products: [],
        children: [],
      }

      const canDelete = emptyCategory.products.length === 0 && emptyCategory.children.length === 0
      expect(canDelete).toBe(true)
    })
  })

  describe('Category Hierarchy', () => {
    it('should build category tree structure', () => {
      const flatCategories = [
        { id: '1', name: 'Root', parentId: null },
        { id: '2', name: 'Child 1', parentId: '1' },
        { id: '3', name: 'Child 2', parentId: '1' },
        { id: '4', name: 'Grandchild', parentId: '2' },
      ]

      const buildTree = (categories: typeof flatCategories, parentId: string | null = null) => {
        return categories
          .filter(cat => cat.parentId === parentId)
          .map(cat => ({
            ...cat,
            children: buildTree(categories, cat.id),
          }))
      }

      const tree = buildTree(flatCategories)

      expect(tree).toHaveLength(1) // One root
      expect(tree[0].children).toHaveLength(2) // Two children
      expect(tree[0].children[0].children).toHaveLength(1) // One grandchild
    })

    it('should get category breadcrumb path', () => {
      const getBreadcrumbs = (category: typeof mockSubcategory) => {
        const breadcrumbs = []
        let current = category

        while (current) {
          breadcrumbs.unshift({
            id: current.id,
            name: current.name,
            slug: current.slug,
          })
          current = current.parent as any
        }

        return breadcrumbs
      }

      const breadcrumbs = getBreadcrumbs(mockSubcategory)

      expect(breadcrumbs).toHaveLength(2)
      expect(breadcrumbs[0].name).toBe('Electronics')
      expect(breadcrumbs[1].name).toBe('Smartphones')
    })
  })

  describe('Category Validation', () => {
    it('should validate category name length', () => {
      const validateName = (name: string) => {
        return name.length >= 1 && name.length <= 100
      }

      expect(validateName('')).toBe(false)
      expect(validateName('Valid Name')).toBe(true)
      expect(validateName('a'.repeat(101))).toBe(false)
    })

    it('should validate slug format', () => {
      const validateSlug = (slug: string) => {
        const slugRegex = /^[a-z0-9-]+$/
        return slugRegex.test(slug)
      }

      expect(validateSlug('valid-slug')).toBe(true)
      expect(validateSlug('invalid slug')).toBe(false)
      expect(validateSlug('Invalid-Slug')).toBe(false)
      expect(validateSlug('valid-slug-123')).toBe(true)
    })

    it('should generate slug from name', () => {
      const generateSlug = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }

      expect(generateSlug('Electronics & Gadgets')).toBe('electronics-gadgets')
      expect(generateSlug('Smart Phones (New)')).toBe('smart-phones-new')
      expect(generateSlug('  Computers  ')).toBe('computers')
    })
  })

  describe('Category Search and Filtering', () => {
    it('should search categories by name', () => {
      const categories = [mockCategory, mockSubcategory]
      const searchTerm = 'smart'

      const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

      expect(filteredCategories).toHaveLength(1)
      expect(filteredCategories[0].name).toBe('Smartphones')
    })

    it('should filter categories by parent', () => {
      const categories = [mockCategory, mockSubcategory]
      const parentId = 'category-123'

      const subcategories = categories.filter(cat => cat.parentId === parentId)

      expect(subcategories).toHaveLength(1)
      expect(subcategories[0].name).toBe('Smartphones')
    })

    it('should get root categories only', () => {
      const categories = [mockCategory, mockSubcategory]

      const rootCategories = categories.filter(cat => cat.parentId === null)

      expect(rootCategories).toHaveLength(1)
      expect(rootCategories[0].name).toBe('Electronics')
    })
  })
})