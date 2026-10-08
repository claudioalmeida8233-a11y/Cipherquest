FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY index.html ./
COPY css ./css
COPY js ./js
COPY assets ./assets
COPY server ./server

RUN mkdir -p /app/server/data && chown -R node:node /app

USER node
EXPOSE 3000

CMD ["node", "server/server.js"]
