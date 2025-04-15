# BUILD
FROM node:22-alpine as build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

# RUN APP (with migrations)
FROM node:22-alpine as run

WORKDIR /app

# Copy everything including .output and node_modules
COPY --from=build /app /app

# Prisma needs access to the schema and node_modules
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD sh -c "npx prisma generate && npx prisma migrate deploy && node .output/server/index.mjs"
