import Script from 'next/script'

interface OrganizationProps {
  name: string
  url: string
  logo?: string
  description?: string
}

export function OrganizationSchema({ name, url, logo, description }: OrganizationProps) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo: logo || `${url}/logo.png`,
    description: description || 'Premium e-commerce platform offering high-quality products',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-0123',
      contactType: 'customer service',
    },
    sameAs: [
      'https://www.facebook.com/ecommerceplatform',
      'https://www.twitter.com/ecommerceplatform',
      'https://www.instagram.com/ecommerceplatform',
    ],
  }

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organizationSchema),
      }}
    />
  )
}

interface WebSiteProps {
  name: string
  url: string
  description: string
}

export function WebSiteSchema({ name, url, description }: WebSiteProps) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(websiteSchema),
      }}
    />
  )
}

interface ProductProps {
  name: string
  description: string
  image: string[]
  price: number
  currency: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  brand?: string
  sku?: string
  url: string
  reviews?: {
    ratingValue: number
    reviewCount: number
  }
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency,
  availability,
  brand,
  sku,
  url,
  reviews,
}: ProductProps) {
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    sku,
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url,
    },
    aggregateRating: reviews
      ? {
          '@type': 'AggregateRating',
          ratingValue: reviews.ratingValue,
          reviewCount: reviews.reviewCount,
        }
      : undefined,
  }

  return (
    <Script
      id="product-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(productSchema),
      }}
    />
  )
}

interface BreadcrumbProps {
  items: Array<{
    name: string
    url?: string
  }>
}

export function BreadcrumbSchema({ items }: BreadcrumbProps) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? item.url : undefined,
    })),
  }

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbSchema),
      }}
    />
  )
}

interface FAQProps {
  questions: Array<{
    question: string
    answer: string
  }>
}

export function FAQSchema({ questions }: FAQProps) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema),
      }}
    />
  )
}