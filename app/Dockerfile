FROM node:22-alpine as build

ARG GQL_HOST
ENV GQL_HOST $GQL_HOST

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build


FROM node:22.8-alpine AS run

COPY --from=build /app/.output /app/.output

EXPOSE 3000

WORKDIR /app/.output

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

CMD ["node", "/app/.output/server/index.mjs"]