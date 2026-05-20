# 1. build & production base
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the Vite React frontend
RUN npm run build

# Expose port
EXPOSE 3002

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Run the app
CMD ["node", "server.js"]
