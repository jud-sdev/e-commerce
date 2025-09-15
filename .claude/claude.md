# E-Commerce Platform - Claude Code Configuration

## Project Overview
Full-stack e-commerce platform built with Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth.js, and Puppeteer integration.

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm test` - Run Jest tests
- `npm run test:e2e` - Run Playwright/Puppeteer E2E tests

## Database Commands
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema to database
- `npx prisma studio` - Open Prisma Studio
- `npx prisma migrate dev` - Create and apply migration

## Architecture Notes
- App Router (Next.js 14)
- Server Components by default
- TypeScript strict mode
- Tailwind CSS + Shadcn/ui components
- Prisma ORM with PostgreSQL
- NextAuth.js for authentication
- Puppeteer for browser automation and testing

## Important Files
- `/prisma/schema.prisma` - Database schema
- `/src/app` - Next.js app directory
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and configurations
- `/tests` - Test files
- `/.env.local` - Environment variables (local)