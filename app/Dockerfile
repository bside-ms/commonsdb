FROM node:22-alpine as build

WORKDIR /app

COPY package.json yarn.lock ./
# copying prisma here, so prisma generation can run after install (post-hook)
COPY prisma ./prisma
RUN yarn install

COPY . .
RUN yarn build

FROM node:22.8-alpine AS run

COPY --from=build /app/.output /app/.output
COPY --from=build /app/prisma /app/.output/prisma

EXPOSE 3000

WORKDIR /app/.output

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

CMD sh -c "npx prisma migrate deploy && node /app/.output/server/index.mjs"

# FROM node:22-alpine as run

# WORKDIR /app

# # Copy everything including .output and node_modules
# COPY --from=build /app /app

# # Prisma needs access to the schema and node_modules
# ENV NUXT_HOST=0.0.0.0
# ENV NUXT_PORT=3000

# EXPOSE 3000

# CMD sh -c "npx prisma migrate deploy && node .output/server/index.mjs"