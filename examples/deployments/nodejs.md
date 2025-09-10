# Deploying Astro + Stack Auth on Node.js

This guide shows how to deploy your Astro + Stack Auth application on a Node.js server (VPS, dedicated server, Docker, etc.).

## Prerequisites

- Node.js 18+ server environment
- Stack Auth project configured
- Process manager (PM2, systemd, or Docker)

## Configuration Files

### astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import stackAuth from 'astro-stack-auth';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone' // or 'middleware' if using Express/other framework
  }),
  integrations: [
    react(),
    stackAuth({
      // Environment variables loaded from .env or system environment
    })
  ],
  server: {
    port: process.env.PORT || 4321,
    host: process.env.HOST || '0.0.0.0'
  }
});
```

### Environment Configuration

#### .env (Development)
```bash
# Stack Auth Configuration
STACK_PROJECT_ID=your-project-id
STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-client-key
STACK_SECRET_SERVER_KEY=your-secret-server-key

# Server Configuration
PORT=4321
HOST=0.0.0.0
NODE_ENV=production

# Optional
STACK_AUTH_PREFIX=/handler
```

#### systemd Environment File
```bash
# /etc/systemd/system/astro-app.service.d/environment.conf
[Service]
Environment="STACK_PROJECT_ID=your-project-id"
Environment="STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-client-key"
Environment="STACK_SECRET_SERVER_KEY=your-secret-server-key"
Environment="PORT=4321"
Environment="NODE_ENV=production"
```

## Deployment Methods

### 1. Direct Node.js Deployment

#### Build and Start
```bash
# Build the application
npm run build

# Start the server
npm start
# or
node ./dist/server/entry.mjs
```

#### Package.json Scripts
```json
{
  "scripts": {
    "build": "astro check && astro build",
    "start": "node ./dist/server/entry.mjs",
    "dev": "astro dev",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/node": "^8.5.1",
    "astro": "^5.13.7",
    "astro-stack-auth": "^0.1.0"
  }
}
```

### 2. PM2 Process Manager

#### Install PM2
```bash
npm install -g pm2
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'astro-stack-auth',
    script: './dist/server/entry.mjs',
    instances: 'max', // Use all available CPUs
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4321,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      STACK_PROJECT_ID: 'your-project-id',
      STACK_PUBLISHABLE_CLIENT_KEY: 'your-publishable-client-key',
      STACK_SECRET_SERVER_KEY: 'your-secret-server-key'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### PM2 Commands
```bash
# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart astro-stack-auth

# Auto-start on system boot
pm2 startup
pm2 save
```

### 3. systemd Service

#### Service File
```ini
# /etc/systemd/system/astro-app.service
[Unit]
Description=Astro Stack Auth Application
Documentation=https://astro.build
After=network.target

[Service]
Type=simple
User=astro
WorkingDirectory=/opt/astro-app
ExecStart=/usr/bin/node ./dist/server/entry.mjs
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=astro-app
Environment=NODE_ENV=production
Environment=PORT=4321
Environment=HOST=0.0.0.0
EnvironmentFile=/etc/astro-app/environment

[Install]
WantedBy=multi-user.target
```

#### systemd Commands
```bash
# Enable and start service
sudo systemctl enable astro-app
sudo systemctl start astro-app

# Check status
sudo systemctl status astro-app

# View logs
sudo journalctl -u astro-app -f

# Restart
sudo systemctl restart astro-app
```

### 4. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

RUN addgroup --system --gid 1001 astro
RUN adduser --system --uid 1001 astro

WORKDIR /app

COPY --from=builder --chown=astro:astro /app/dist ./dist
COPY --from=builder --chown=astro:astro /app/node_modules ./node_modules
COPY --from=builder --chown=astro:astro /app/package.json ./package.json

USER astro

EXPOSE 4321

ENV HOST=0.0.0.0
ENV PORT=4321

CMD ["node", "./dist/server/entry.mjs"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  astro-app:
    build: .
    ports:
      - "4321:4321"
    environment:
      - NODE_ENV=production
      - STACK_PROJECT_ID=${STACK_PROJECT_ID}
      - STACK_PUBLISHABLE_CLIENT_KEY=${STACK_PUBLISHABLE_CLIENT_KEY}
      - STACK_SECRET_SERVER_KEY=${STACK_SECRET_SERVER_KEY}
      - PORT=4321
      - HOST=0.0.0.0
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.astro.rule=Host(`your-domain.com`)"
      - "traefik.http.services.astro.loadbalancer.server.port=4321"

  # Optional: Reverse proxy
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

#### Docker Commands
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Update
docker-compose pull
docker-compose up -d
```

## Reverse Proxy Configuration

### Nginx
```nginx
# /etc/nginx/sites-available/astro-app
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Proxy to Astro application
    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:4321;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache
```apache
# /etc/apache2/sites-available/astro-app.conf
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    
    # SSL configuration
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Proxy configuration
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:4321/
    ProxyPassReverse / http://127.0.0.1:4321/
    
    # WebSocket support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:4321/$1" [P,L]
</VirtualHost>
```

## Monitoring and Logging

### Log Configuration
```javascript
// astro.config.mjs - Add logging middleware
export default defineConfig({
  // ... other config
  vite: {
    define: {
      'process.env.LOG_LEVEL': JSON.stringify(process.env.LOG_LEVEL || 'info')
    }
  }
});
```

### Health Check Endpoint
```typescript
// src/pages/api/health.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
};
```

### Log Rotation
```bash
# /etc/logrotate.d/astro-app
/opt/astro-app/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        systemctl reload astro-app
    endscript
}
```

## Security Considerations

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 4321/tcp   # Block direct access to app
sudo ufw enable
```

### Environment Security
- Use a secrets management system (HashiCorp Vault, AWS Secrets Manager)
- Rotate API keys regularly
- Use read-only filesystem for containers
- Implement proper user permissions
- Regular security updates

### Example with Docker Secrets
```yaml
# docker-compose.yml
version: '3.8'

services:
  astro-app:
    build: .
    ports:
      - "4321:4321"
    secrets:
      - stack_project_id
      - stack_client_key
      - stack_server_key
    environment:
      - STACK_PROJECT_ID_FILE=/run/secrets/stack_project_id
      - STACK_PUBLISHABLE_CLIENT_KEY_FILE=/run/secrets/stack_client_key
      - STACK_SECRET_SERVER_KEY_FILE=/run/secrets/stack_server_key

secrets:
  stack_project_id:
    file: ./secrets/stack_project_id.txt
  stack_client_key:
    file: ./secrets/stack_client_key.txt
  stack_server_key:
    file: ./secrets/stack_server_key.txt
```

This comprehensive Node.js deployment guide provides multiple deployment strategies with proper security, monitoring, and scaling considerations for your Astro + Stack Auth application.