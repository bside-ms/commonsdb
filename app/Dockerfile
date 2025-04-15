# BUILD
FROM node:22-alpine as build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

# RUN MIGRATIONS
FROM build as migrate

WORKDIR /app

COPY . /app

CMD ["sh", "-c", "npx prisma migrate deploy"]

# RUN APP
FROM migrate AS run

COPY --from=build /app/.output /app/.output

EXPOSE 3000

WORKDIR /app/.output

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

CMD ["node", "/app/.output/server/index.mjs"]