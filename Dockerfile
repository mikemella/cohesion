FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Create placeholder for client workspace so npm doesn't fail on missing workspace
RUN mkdir -p packages/client && echo '{"name":"@cohesion/client","version":"1.0.0"}' > packages/client/package.json

RUN npm install

RUN npm run build -w packages/shared && npm run build -w packages/server

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
