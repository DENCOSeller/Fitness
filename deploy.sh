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
# Copy public but preserve uploads as symlink to persistent storage
rm -rf .next/standalone/public
cp -r public .next/standalone/public
rm -rf .next/standalone/public/uploads
ln -sf /root/Fitness/public/uploads .next/standalone/public/uploads

echo "6. Restarting PM2..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "=== Deploy complete ==="
echo "Check status: pm2 status"
echo "Check logs: pm2 logs denco-health"
