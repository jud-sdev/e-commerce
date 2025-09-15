# Claude Code Instructions for E-Commerce Platform

## Code Style & Conventions
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Server Components by default, Client Components when needed
- Follow Next.js 14 App Router conventions
- Use Tailwind CSS for styling
- Use Shadcn/ui components when available
- Use Prisma for database operations
- Follow REST API conventions for API routes

## File Organization
- `/src/app` - App Router pages and layouts
- `/src/app/api` - API routes
- `/src/components/ui` - Shadcn/ui components
- `/src/components` - Custom components
- `/src/lib` - Utility functions, database client, auth config
- `/prisma` - Database schema and migrations
- `/tests` - Test files (unit, integration, e2e)
- `/public` - Static assets

## Testing Guidelines
- Use Jest for unit tests
- Use Playwright/Puppeteer for E2E tests
- Test components with React Testing Library
- Mock external dependencies
- Test API routes separately

## Security Practices
- Use NextAuth.js for authentication
- Validate all inputs
- Use environment variables for secrets
- Implement proper CORS policies
- Use HTTPS in production
- Sanitize user inputs

## Database Best Practices
- Use Prisma schema for type safety
- Create migrations for schema changes
- Use transactions for complex operations
- Implement proper indexing
- Use connection pooling

## Performance Guidelines
- Use Next.js Image component for images
- Implement proper caching strategies
- Use React Suspense for loading states
- Optimize bundle size
- Use lazy loading where appropriate