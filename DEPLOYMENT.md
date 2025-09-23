# Production Deployment Guide

## Overview

This guide covers deploying the E-Commerce Platform to production using Render.com with automated CI/CD pipeline via GitHub Actions.

## Prerequisites

- GitHub repository with the codebase
- Render.com account
- Domain name (optional, for custom domain)
- Email service (SendGrid recommended)
- Stripe account for payments
- Cloudinary account for image uploads

## Environment Setup

### 1. Fork/Clone Repository

```bash
git clone <repository-url>
cd e-commerce
npm install
```

### 2. Environment Variables

Copy `.env.production.example` to `.env.production` and configure:

#### Required Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Authentication
NEXTAUTH_URL="https://your-app.onrender.com"
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# Email
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="your-sendgrid-api-key"
EMAIL_FROM="noreply@your-domain.com"

# Payments
STRIPE_PUBLISHABLE_KEY="pk_live_your_stripe_publishable_key"
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# File Uploads
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

## Render Deployment

### 1. Deploy with render.yaml

The project includes a `render.yaml` file for automated deployment:

```bash
# Push to main branch to trigger deployment
git push origin main
```

Render will automatically:
- Create PostgreSQL database
- Create Redis instance
- Deploy the web service
- Set up environment variables
- Run database migrations

### 2. Manual Render Setup

If not using render.yaml:

1. **Create New Web Service**
   - Connect GitHub repository
   - Set build command: `npm ci && npm run build`
   - Set start command: `npm start`
   - Set environment to Node.js

2. **Create PostgreSQL Database**
   - Name: `e-commerce-db`
   - Plan: Starter or higher
   - Note the connection string

3. **Create Redis Instance** (Optional)
   - Name: `e-commerce-redis`
   - Plan: Starter
   - Note the connection URL

4. **Configure Environment Variables**
   - Add all variables from `.env.production.example`
   - Use database connection string from step 2
   - Generate secure NEXTAUTH_SECRET

### 3. Database Setup

After deployment, the startup script automatically:
- Runs Prisma migrations
- Seeds database (if SEED_DB=true)

To manually run migrations:
```bash
# In Render shell
npx prisma migrate deploy
npx prisma db seed
```

## CI/CD Pipeline

### GitHub Actions Workflows

Three workflows are configured:

#### 1. CI Pipeline (`.github/workflows/ci.yml`)
- Runs on push/PR to main
- Executes tests, linting, type-checking
- Builds application
- Security scanning

#### 2. Deployment (`.github/workflows/deploy.yml`)
- Runs on push to main branch
- Deploys to Render automatically
- Runs final tests before deployment

#### 3. Security Checks (`.github/workflows/security.yml`)
- Weekly security scans
- Dependency vulnerability checks
- CodeQL analysis

### Setting up GitHub Actions

1. **Repository Secrets**
   No secrets needed - Render handles deployment via git integration

2. **Branch Protection**
   ```bash
   # Enable branch protection for main
   # Require status checks to pass
   # Require PR reviews
   ```

## Domain Configuration

### Custom Domain Setup

1. **In Render Dashboard**
   - Go to your web service
   - Settings → Custom Domains
   - Add your domain

2. **DNS Configuration**
   ```
   Type: CNAME
   Name: www
   Value: your-app.onrender.com

   Type: A
   Name: @
   Value: [Render IP addresses]
   ```

3. **SSL Certificate**
   - Render automatically provisions SSL
   - Certificate updates automatically

## Monitoring and Maintenance

### Health Checks

The application includes health check endpoints:
- `/api/health` - Basic health check
- `/api/health/db` - Database connectivity
- `/api/health/redis` - Redis connectivity

### Logging

Configure logging levels via environment:
```bash
LOG_LEVEL="info"
ENABLE_ACCESS_LOGS="true"
```

### Performance Monitoring

1. **Built-in Monitoring**
   - Render provides basic metrics
   - Response times, error rates
   - Resource usage

2. **External Monitoring** (Optional)
   ```bash
   # Add to environment variables
   SENTRY_DSN="your-sentry-dsn"
   GOOGLE_ANALYTICS_ID="GA-XXXXXXXXX"
   ```

### Database Backups

- Render automatically backs up PostgreSQL
- Backups retained for 7 days (Starter plan)
- Manual backups available via dashboard

## Security Considerations

### 1. Environment Variables
- Never commit secrets to repository
- Use Render's environment variable management
- Rotate secrets regularly

### 2. Security Headers
- CSP, HSTS, and other headers configured
- Rate limiting enabled
- CORS properly configured

### 3. Database Security
- SSL connections enforced
- Regular security updates
- Access logging enabled

## Scaling

### Horizontal Scaling
```bash
# In render.yaml
plan: starter  # or standard, pro
autoDeploy: true
```

### Database Scaling
- Upgrade PostgreSQL plan as needed
- Connection pooling configured
- Read replicas available on higher plans

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Render dashboard
   # Verify all dependencies in package.json
   # Check Node.js version compatibility
   ```

2. **Database Connection Issues**
   ```bash
   # Verify DATABASE_URL format
   # Check firewall settings
   # Confirm SSL requirements
   ```

3. **Environment Variable Issues**
   ```bash
   # Check variable names match exactly
   # Verify values don't have extra spaces
   # Confirm required variables are set
   ```

### Debugging

1. **Application Logs**
   ```bash
   # View in Render dashboard
   # Or connect via shell:
   curl -H "Authorization: Bearer $RENDER_API_KEY" \
     https://api.render.com/v1/services/$SERVICE_ID/logs
   ```

2. **Database Access**
   ```bash
   # Connect to production database
   psql $DATABASE_URL
   ```

## Rollback Strategy

### Quick Rollback
1. **Via Git**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Via Render Dashboard**
   - Go to Deploys tab
   - Click "Rollback" on previous deployment

### Database Rollback
```bash
# If migrations need rollback
npx prisma migrate reset --force
npx prisma migrate deploy --to <previous-migration>
```

## Performance Optimization

### 1. Build Optimization
- Bundle analysis configured
- Tree shaking enabled
- Image optimization via Next.js

### 2. Database Optimization
- Connection pooling
- Query optimization
- Appropriate indexes

### 3. CDN and Caching
- Static assets cached by Render
- Redis for session/API caching
- Browser caching headers set

## Support and Monitoring

### Health Monitoring
- Set up alerts for downtime
- Monitor response times
- Track error rates

### Backup Verification
- Test restore procedures monthly
- Verify backup integrity
- Document recovery processes

## Checklist Before Go-Live

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificate active
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy verified
- [ ] Performance tested under load
- [ ] Security audit completed
- [ ] Error tracking configured
- [ ] Analytics set up
- [ ] Support processes documented