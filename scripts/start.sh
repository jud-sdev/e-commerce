#!/bin/bash
set -e

echo "Starting E-Commerce Platform..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed database if SEED_DB environment variable is set
if [ "$SEED_DB" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

# Start the Next.js application
echo "Starting Next.js application..."
exec node server.js