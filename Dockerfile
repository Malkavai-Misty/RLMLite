FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Hugging Face Spaces expects port 7860
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 7860

CMD ["npm", "start"]
