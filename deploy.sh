#!/bin/bash
set -e

echo "=== DENCO Health Deploy ==="

cd /root/Fitness

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
npm ci --production=false

echo "3. Running database migrations..."
npx prisma migrate deploy
npx prisma generate

echo "4. Building Next.js (standalone)..."
npm run build

echo "5. Copying static assets to standalone..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "6. Restarting PM2..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "=== Deploy complete ==="
echo "Check status: pm2 status"
echo "Check logs: pm2 logs denco-health"
