# Deployment Guide - Pixel Love Backend

## Prerequisites

- Node.js 20+ installed
- MongoDB database (MongoDB Atlas recommended)
- Cloudflare R2 bucket configured
- PayOS merchant account
- OneSignal app (optional)

---

## 1. MongoDB Setup (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free tier available)
3. Create database user with password
4. Whitelist your IP address (or 0.0.0.0/0 for all IPs)
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/pixel-love?retryWrites=true&w=majority
   ```

---

## 2. Cloudflare R2 Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Create a new bucket: `pixel-love-memories`
4. Create API token:
   - Go to "Manage R2 API Tokens"
   - Create new token with Read & Write permissions
   - Save Access Key ID and Secret Access Key
5. Configure public access:
   - Enable public access on bucket
   - Note your public URL domain

---

## 3. PayOS Setup

1. Register at [PayOS](https://payos.vn/)
2. Complete merchant verification
3. Get API credentials:
   - Client ID
   - API Key
   - Checksum Key
4. Configure webhook URL (your-domain.com/api/payment/webhook)
5. Set return and cancel URLs

---

## 4. OneSignal Setup (Optional)

1. Go to [OneSignal](https://onesignal.com/)
2. Create new app
3. Get App ID and API Key
4. Configure for your mobile/web platform

---

## 5. Environment Variables

Create `.env` file with all required variables:

```bash
# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pixel-love

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=30d

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=pixel-love-memories
R2_PUBLIC_URL=https://your-r2-domain.com

# PayOS
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
PAYOS_RETURN_URL=https://your-frontend.com/payment/success
PAYOS_CANCEL_URL=https://your-frontend.com/payment/cancel
PAYOS_WEBHOOK_URL=https://your-backend.com/api/payment/webhook
PAYOS_API_ENDPOINT=https://api-merchant.payos.vn

# OneSignal
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_API_KEY=your-api-key
```

---

## 6. Deployment Options

### Option A: Heroku

1. Install Heroku CLI
2. Login to Heroku:
   ```bash
   heroku login
   ```

3. Create new app:
   ```bash
   heroku create pixel-love-backend
   ```

4. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI="your-mongodb-uri"
   heroku config:set JWT_SECRET="your-jwt-secret"
   # ... set all other variables
   ```

5. Deploy:
   ```bash
   git push heroku main
   ```

6. Open app:
   ```bash
   heroku open
   ```

### Option B: DigitalOcean App Platform

1. Go to DigitalOcean Dashboard
2. Create new App
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm run build`
   - Run Command: `npm run start:prod`
   - Port: 3000
5. Add environment variables in dashboard
6. Deploy

### Option C: AWS EC2

1. Launch EC2 instance (Ubuntu 22.04)
2. SSH into instance
3. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. Clone repository:
   ```bash
   git clone <your-repo-url>
   cd pixel-love-backend
   ```

5. Install dependencies:
   ```bash
   npm install
   ```

6. Create `.env` file with production variables

7. Build application:
   ```bash
   npm run build
   ```

8. Install PM2:
   ```bash
   sudo npm install -g pm2
   ```

9. Start application:
   ```bash
   pm2 start dist/main.js --name pixel-love-backend
   pm2 save
   pm2 startup
   ```

10. Configure Nginx as reverse proxy:
    ```bash
    sudo apt install nginx
    sudo nano /etc/nginx/sites-available/pixel-love
    ```

    Add configuration:
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

11. Enable site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/pixel-love /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

12. Install SSL certificate:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

### Option D: Docker

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:20-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .
   RUN npm run build

   EXPOSE 3000

   CMD ["npm", "run", "start:prod"]
   ```

2. Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       env_file:
         - .env
       restart: unless-stopped
   ```

3. Build and run:
   ```bash
   docker-compose up -d
   ```

---

## 7. Post-Deployment Checklist

- [ ] Test all API endpoints
- [ ] Verify MongoDB connection
- [ ] Test file upload to Cloudflare R2
- [ ] Test PayOS payment flow
- [ ] Test OAuth login (Google & Facebook)
- [ ] Configure CORS for frontend domain
- [ ] Set up monitoring (e.g., Sentry, DataDog)
- [ ] Set up logging
- [ ] Configure backup strategy for MongoDB
- [ ] Set up CI/CD pipeline
- [ ] Document API with Swagger
- [ ] Load testing
- [ ] Security audit

---

## 8. Monitoring & Maintenance

### Health Check Endpoint
Add health check endpoint for monitoring:

```typescript
@Get('health')
healthCheck() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

### Logging
Consider adding Winston or Pino for structured logging.

### Error Tracking
Integrate Sentry for error tracking:
```bash
npm install @sentry/node
```

### Performance Monitoring
Use New Relic or DataDog for APM.

---

## 9. Scaling Considerations

- Use Redis for session storage
- Implement rate limiting
- Add caching layer (Redis)
- Use CDN for static assets
- Database indexing optimization
- Horizontal scaling with load balancer
- Queue system for background jobs (Bull/BullMQ)

---

## 10. Security Best Practices

- Keep dependencies updated
- Use helmet.js for security headers
- Implement rate limiting
- Validate all inputs
- Use HTTPS only
- Rotate JWT secrets regularly
- Implement request logging
- Use environment-specific configs
- Regular security audits
- Implement CSRF protection

---

## Support

For deployment issues, contact: devops@pixellove.com

