# E-Commerce Platform

A full-stack e-commerce platform built with Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth.js, and Puppeteer integration.

## Features

- **Next.js 14** with App Router and TypeScript
- **Authentication** with NextAuth.js (Google OAuth, Email)
- **Database** with Prisma ORM and PostgreSQL
- **UI Components** with Tailwind CSS and Shadcn/ui
- **Testing** with Jest, Playwright, and Puppeteer
- **Browser Automation** with Puppeteer integration

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **UI Components**: Shadcn/ui
- **Testing**: Jest, React Testing Library, Playwright, Puppeteer
- **Deployment**: Vercel (recommended)

## Database Schema

The application includes comprehensive models for:
- User management and authentication
- Product catalog with categories, variants, and images
- Shopping cart and wishlist functionality
- Order management system
- User addresses and reviews
- Complete e-commerce workflow

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd e-commerce
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your environment variables:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Provider (optional)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-email-password"
EMAIL_FROM="noreply@example.com"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

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

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── ui/            # Shadcn/ui components
│   └── providers/     # Context providers
├── lib/               # Utility functions and configurations
│   ├── auth.ts        # NextAuth.js configuration
│   ├── prisma.ts      # Prisma client
│   └── utils.ts       # Utility functions
└── types/             # TypeScript type definitions

prisma/
└── schema.prisma      # Database schema

tests/                 # Test files
├── unit/             # Unit tests
├── integration/      # Integration tests
└── e2e/              # End-to-end tests
```

## Authentication

The application uses NextAuth.js with support for:
- Google OAuth
- Email/Password authentication
- Session management
- Protected routes

## Testing

- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: API route testing
- **E2E Tests**: Playwright and Puppeteer for browser automation

Run tests:
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
```

## Deployment

The easiest way to deploy is using [Vercel Platform](https://vercel.com/new):

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy automatically on every push

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
