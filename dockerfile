# build - client
FROM node:23-alpine AS build-client
WORKDIR /app
COPY . .

RUN npm install --omit=optional \
    && npm run build

# build - rustsec
FROM node:23-alpine AS build-rustsec
WORKDIR /app
COPY src/rustsec/extract.js .

RUN apk add git

RUN git clone --depth 1 https://github.com/rustsec/advisory-db.git tmp \
    && mkdir -p src/rustsec/data \
    && npm init -y \
    && npm i @iarna/toml \
    && node extract.js

# deploy
FROM node:23-alpine AS deploy
WORKDIR /app
COPY package-lock.json .
COPY package.json .
COPY --from=build-client /app/dist ./dist
COPY --from=build-rustsec /app/src/rustsec/data ./dist/rustsec

RUN npm install --production

ENV PORT=80

EXPOSE 80

CMD ["node", "dist/main.js"]
