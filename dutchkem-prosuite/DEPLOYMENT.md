# Dutchkem Ventures ProSuite NG+ — Deployment Guide

## Prerequisites

- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 6+
- NGINX (reverse proxy)
- SSL Certificate (Let's Encrypt)
- PM2 (process manager)

## Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 50 GB SSD | 100+ GB SSD |
| Bandwidth | 100 Mbps | 1 Gbps |

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install NGINX
sudo apt install -y nginx

# Install ClamAV (virus scanning)
sudo apt install -y clamav clamav-daemon
sudo freshclam
```

### 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE dutchkem_prosuite;
CREATE USER dutchkem WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dutchkem_prosuite TO dutchkem;
\q

# Run migrations (after cloning repo)
npm run db:migrate
```

### 3. Clone & Configure

```bash
# Clone repository
cd /var/www
git clone https://github.com/dutchkem/prosuite-ng.git dutchkem-prosuite
cd dutchkem-prosuite

# Install dependencies
npm install --production

# Create environment file
cp .env.example .env
nano .env
```

### 4. Environment Configuration

```env
# .env file
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://dutchkem:your_password@localhost:5432/dutchkem_prosuite

# Redis
REDIS_URL=redis://localhost:6379

# NVIDIA NIM
NVIDIA_NIM_API_KEY=your_nvidia_nim_key
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct

# JWT (generate strong secrets)
JWT_SECRET=generate_with_openssl_rand_base64_64
JWT_REFRESH_SECRET=generate_with_openssl_rand_base64_64

# SMS (Termii)
TERMII_API_KEY=your_termii_key
TERMII_SENDER_ID=Dutchkem

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM=noreply@dutchkem.com

# Cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Security
CORS_ORIGIN=https://dutchkem.com,https://www.dutchkem.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=30
```

### 5. Create Admin User

```bash
# Interactive admin creation
npm run create-admin

# Enter email and secure password when prompted
# Save the MFA secret securely!
```

### 6. Build Application

```bash
# Build frontend
npm run build

# Verify build
ls -la dist/
```

### 7. Verify All Agents

```bash
# Run pre-deployment verification
npm run verify-agents

# Should output: "🚀 Deployment verification PASSED!"
```

### 8. PM2 Process Manager

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dutchkem-prosuite',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 config (auto-restart on reboot)
pm2 save
pm2 startup
```

### 9. NGINX Configuration

```bash
# Create NGINX config
sudo nano /etc/nginx/sites-available/dutchkem-prosuite
```

```nginx
# /etc/nginx/sites-available/dutchkem-prosuite

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# Upstream
upstream dutchkem_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name dutchkem.com www.dutchkem.com;
    return 301 https://$server_name$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;
    server_name dutchkem.com www.dutchkem.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dutchkem.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dutchkem.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.nvidia.com;" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Root (frontend)
    root /var/www/dutchkem-prosuite/dist;
    index index.html;

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://dutchkem_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth endpoints (stricter rate limit)
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://dutchkem_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket (chat)
    location /socket.io/ {
        proxy_pass http://dutchkem_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # File uploads
    location /api/upload {
        client_max_body_size 10M;
        proxy_pass http://dutchkem_backend;
    }

    # Health check
    location /api/health {
        proxy_pass http://dutchkem_backend;
        access_log off;
    }
}

# Admin subdomain
server {
    listen 443 ssl http2;
    server_name admin.dutchkem.com;

    ssl_certificate /etc/letsencrypt/live/dutchkem.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dutchkem.com/privkey.pem;

    location / {
        return 301 https://dutchkem.com/admin/dashboard;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dutchkem-prosuite /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

### 10. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d dutchkem.com -d www.dutchkem.com -d admin.dutchkem.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 11. Firewall

```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 12. Monitoring & Logs

```bash
# View PM2 logs
pm2 logs dutchkem-prosuite

# View NGINX access logs
sudo tail -f /var/log/nginx/access.log

# View NGINX error logs
sudo tail -f /var/log/nginx/error.log

# Monitor PM2
pm2 monit
```

## Post-Deployment Checklist

- [ ] All 13 agents verified operational
- [ ] Admin user created with MFA
- [ ] SSL certificate installed
- [ ] Database migrations complete
- [ ] Redis connected
- [ ] NVIDIA NIM API responding
- [ ] Termii SMS working
- [ ] SendGrid email working
- [ ] File uploads working
- [ ] WebSocket chat working
- [ ] Rate limiting active
- [ ] Security headers present
- [ ] Backups configured
- [ ] Monitoring setup (PM2/Datadog/etc.)

## Backup Strategy

```bash
# Daily database backup (add to cron)
0 2 * * * pg_dump dutchkem_prosuite | gzip > /backups/db/dutchkem_$(date +\%Y\%m\%d).sql.gz

# Weekly file backup
0 3 * * 0 tar -czf /backups/files/uploads_$(date +\%Y\%m\%d).tar.gz /var/www/dutchkem-prosuite/uploads/
```

## Rollback Procedure

```bash
# Stop current deployment
pm2 stop dutchkem-prosuite

# Checkout previous version
git checkout v1.0.0

# Reinstall dependencies
npm install --production

# Run migrations (if needed)
npm run db:migrate

# Restart
pm2 restart dutchkem-prosuite
```

## Support

For deployment assistance:
- Email: devops@dutchkem.com
- WhatsApp: +234 812 116 1202

---

© 2024 Dutchkem Ventures
