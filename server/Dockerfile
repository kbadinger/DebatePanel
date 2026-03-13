FROM node:18-alpine

# Install OpenSSL and other dependencies required by Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Railway uses PORT environment variable, default to 8080
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]




