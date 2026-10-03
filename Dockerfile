FROM node:22-bullseye-slim

# Install system dependencies, Chromium, and Bengali typography fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-beng \
    fonts-noto-core \
    fonts-freefont-ttf \
    ca-certificates \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    NODE_OPTIONS="--dns-result-order=ipv4first"

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit

COPY . .
RUN npm run build || true

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/web/server.js"]
