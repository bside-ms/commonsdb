# BUILD
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
# copying prisma here, so prisma generation can run after install (post-hook)
COPY prisma ./prisma
RUN yarn install

COPY . .
RUN yarn build

# RUN APP (with drizzle migration)
FROM node:22-alpine AS run

WORKDIR /app

COPY --from=build /app /app

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD sh -c "yarn drizzle-kit migrate && node .output/server/index.mjs"
