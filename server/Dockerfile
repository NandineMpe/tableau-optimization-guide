FROM node:18-slim

# Install dependencies for building native modules if needed
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build the project
RUN npm run build

# Expose the port (Dedalus or other platforms usually expect 3000 or 8080)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
