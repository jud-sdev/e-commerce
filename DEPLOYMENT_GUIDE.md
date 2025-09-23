# Deployment Guide for Render

## Prerequisites
1. Push your code to GitHub first
2. Have a Render account at https://dashboard.render.com/

## Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial e-commerce project setup"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Render

### A. Create a PostgreSQL Database on Render

1. Go to https://dashboard.render.com/
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `ecommerce-db`
   - Database: `ecommerce`
   - User: (auto-generated)
   - Region: Choose closest to you
   - PostgreSQL Version: 15
   - Instance Type: Free
4. Click "Create Database"
5. Wait for it to be created, then copy the "External Database URL"

### B. Deploy the Next.js Application

1. Click "New +" → "Web Service"
2. Connect your GitHub account if not already connected
3. Select your repository
4. Configure the Web Service:

   **Basic Settings:**
   - Name: `ecommerce-app`
   - Region: Same as your database
   - Branch: `main`
   - Root Directory: (leave empty)
   - Runtime: Node

   **Build & Deploy Settings:**
   - Build Command: `npm install && npm run build && npx prisma generate && npx prisma db push`
   - Start Command: `npm start`

   **Instance Type:**
   - Select "Free" for testing

### C. Add Environment Variables

Click "Environment" tab and add these variables:

```env
# Database (use the External Database URL from your PostgreSQL)
DATABASE_URL=postgresql://[YOUR_DATABASE_URL_FROM_RENDER]

# NextAuth.js
NEXTAUTH_URL=https://[YOUR-APP-NAME].onrender.com
NEXTAUTH_SECRET=[GENERATE_A_RANDOM_SECRET]

# Node Environment
NODE_ENV=production

# Application
NEXT_PUBLIC_APP_NAME=E-Commerce Platform
NEXT_PUBLIC_APP_URL=https://[YOUR-APP-NAME].onrender.com
```

To generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### D. Update Your Code for Production

1. Update `prisma/schema.prisma` to use PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"   // Change from sqlite to postgresql
  url      = env("DATABASE_URL")
}
```

2. Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: ecommerce-app
    runtime: node
    buildCommand: npm install && npm run build && npx prisma generate && npx prisma db push
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: ecommerce-db
          property: connectionString
```

3. Update `next.config.js` to remove deprecated options:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'your-domain.onrender.com'],
  },
}

module.exports = nextConfig
```

4. Commit and push these changes:

```bash
git add .
git commit -m "Configure for Render deployment"
git push
```

## Step 3: Deploy

1. After adding all environment variables, click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Set up the database
   - Start your application

## Step 4: Seed Initial Data (Optional)

After deployment, you can seed initial data:

1. Go to your Web Service dashboard on Render
2. Click "Shell" tab
3. Run: `node seed-products.js`

## Step 5: Monitor Deployment

- Check the "Logs" tab for deployment progress
- The first deployment may take 10-15 minutes
- Your app will be available at: `https://[YOUR-APP-NAME].onrender.com`

## Troubleshooting

### Common Issues:

1. **Build fails**: Check logs for missing dependencies
2. **Database connection fails**: Verify DATABASE_URL is correct
3. **App crashes**: Check start command and environment variables
4. **Slow performance on Free tier**: Normal for free tier, upgrade for better performance

### Important Notes for Free Tier:
- The app will spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Limited to 750 hours/month
- Database has 1GB storage limit

## Production Checklist

- [ ] Remove all localhost references
- [ ] Set NODE_ENV to production
- [ ] Configure proper NEXTAUTH_URL
- [ ] Use PostgreSQL instead of SQLite
- [ ] Add error monitoring (optional)
- [ ] Set up custom domain (optional)

## Support

For Render-specific issues, check:
- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com/