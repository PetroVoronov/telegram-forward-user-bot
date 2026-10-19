FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force \
    && rm package-lock.json

COPY src ./src

COPY locales ./locales

RUN mkdir data

# Session, configuration and forwarding rules are stored here - mount it to keep them between runs
VOLUME /app/data

ENTRYPOINT [ "node", "src/index.js" ]
CMD []
