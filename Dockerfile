# TODO - OPTIMIZE

# FROM node:alpine as builder
# WORKDIR /app
# COPY package*.json .
# # Create a new user with necessary privileges
# RUN addgroup -S dgroup && adduser -S -g dgroup wayne
# RUN chown -R wayne:dgroup .
# USER wayne
# # Install deps
# RUN npm install
# # Copy local dir to working dir
# COPY . .
# # Create build dir
# RUN npm run build
# EXPOSE 3000

FROM node:alpine3.10
# WORKDIR /app/build
# RUN npm i husky -g
# COPY --from=builder /app/build .
COPY . .
ENV NODE_ENV=production
# COPY ./package*.json .
# COPY ./server.js .
# RUN npm ci --only=production
EXPOSE 8080
ENTRYPOINT ["node", "server.js"]