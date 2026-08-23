# Use minimal Node.js Alpine base image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency definitions and install production packages
COPY package.json ./
RUN npm install --only=production

# Copy application source code
COPY server.js ./

# Expose default Gateway listening port
EXPOSE 8080

# Start Gateway server
CMD ["npm", "start"]