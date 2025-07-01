# Use Node.js LTS
FROM node:20-slim

# Install Chrome and other dependencies
RUN apt-get update && apt-get install -y chromium procps \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tentukan direktori kerja di dalam server
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu
COPY package.json package-lock.json ./

# Install dependencies with specific config
RUN npm config set network-timeout 300000 \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --no-optional --legacy-peer-deps

# Copy rest of the application
COPY . .

# Set environment variables for Puppeteer and Node
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_OPTIONS="--max-old-space-size=2048" \
    NODE_ENV=production

# Clean npm cache
RUN npm cache clean --force

EXPOSE 3000

CMD ["npm", "start"]

# Salin semua sisa kode aplikasi
COPY . .

# Beritahu port mana yang akan dipakai aplikasi
EXPOSE 5000

# Perintah untuk menjalankan aplikasi saat server hidup
CMD [ "npm", "start" ]