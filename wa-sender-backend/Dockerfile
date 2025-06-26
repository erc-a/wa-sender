# Gunakan gambar dasar Node.js yang sudah ada
FROM node:18-slim

# Install semua "onderdil" yang dibutuhkan oleh Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
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

# Install dependensi
RUN npm install

# Salin semua sisa kode aplikasi
COPY . .

# Beritahu port mana yang akan dipakai aplikasi
EXPOSE 5000

# Perintah untuk menjalankan aplikasi saat server hidup
CMD [ "npm", "start" ]