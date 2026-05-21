FROM node:22-alpine

# Install system dependencies required for building and running the canvas package
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    pango-dev \
    giflib-dev \
    jpeg-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    fontconfig-dev \
    python3 \
    make \
    pkgconfig

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . . 

# Expose the port the app runs on
EXPOSE 6002

# Start the application
CMD ["node", "server.js"]