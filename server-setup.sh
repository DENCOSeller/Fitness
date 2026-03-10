#!/bin/bash
set -e

echo "=== DENCO Health — Server Setup (Ubuntu 24.04) ==="
echo "Server IP: 155.212.190.58"
echo ""

# 1. System updates
echo "1. Updating system packages..."
apt update && apt upgrade -y

# 2. Install Node.js 22 LTS
echo "2. Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 3. Install PM2 globally
echo "3. Installing PM2..."
npm install -g pm2

# 4. Install Nginx
echo "4. Installing Nginx..."
apt install -y nginx

# 5. Install Certbot for Let's Encrypt
echo "5. Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# 6. Install PostgreSQL
echo "6. Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# 7. Configure PostgreSQL
echo "7. Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE USER denco WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE denco_health OWNER denco;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE denco_health TO denco;"

# 8. Configure firewall
echo "8. Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 9. Copy Nginx config
echo "9. Setting up Nginx..."
cp /root/Fitness/nginx.conf /etc/nginx/sites-available/denco-health
ln -sf /etc/nginx/sites-available/denco-health /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 10. Get SSL certificate
echo "10. Obtaining SSL certificate..."
echo "NOTE: Before running this, ensure DNS for health.denco.store points to 155.212.190.58"
echo "Run manually: certbot --nginx -d health.denco.store --non-interactive --agree-tos -m your@email.com"

# 11. Setup PM2 startup
echo "11. Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root
cd /root/Fitness
npm ci --production=false
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 start ecosystem.config.js
pm2 save

# 12. Setup certbot auto-renewal
echo "12. Setting up SSL auto-renewal..."
systemctl enable certbot.timer

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update .env with correct DATABASE_URL: postgresql://denco:YOUR_PASSWORD@localhost:5432/denco_health"
echo "2. Update .env with AUTH_PASSWORD, SESSION_SECRET, ANTHROPIC_API_KEY"
echo "3. Point DNS health.denco.store → 155.212.190.58"
echo "4. Run: certbot --nginx -d health.denco.store"
echo "5. Run: cd /root/Fitness && ./deploy.sh"
echo ""
echo "Useful commands:"
echo "  pm2 status              — check app status"
echo "  pm2 logs denco-health   — view logs"
echo "  pm2 restart denco-health — restart app"
echo "  nginx -t                — test nginx config"
echo "  systemctl reload nginx  — reload nginx"
