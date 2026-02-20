FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

RUN npm install --workspace=packages/shared --workspace=packages/server

RUN npm run build -w packages/shared && npm run build -w packages/server

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
