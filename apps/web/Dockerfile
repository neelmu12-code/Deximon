FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

FROM dependencies AS development

WORKDIR /app
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SCANNER_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SCANNER_URL=$NEXT_PUBLIC_SCANNER_URL

COPY . .
RUN npm run build

FROM node:20-alpine AS production

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]
