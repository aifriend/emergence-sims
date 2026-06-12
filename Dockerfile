# Next.js 15 (standalone) → Cloud Run. Built for linux/amd64.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
# Next standalone output: minimal server + traced node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# public/ is NOT bundled into standalone output — copy it so /brains and
# /playback static assets (brain weights, recorded-run videos) are served.
COPY --from=build /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
