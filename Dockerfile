FROM node:22-alpine

# Copy across the files from our `intermediate` container
RUN mkdir app

COPY ../src /app/src

COPY ../locales /app/locales

COPY ../package.json /app

WORKDIR /app

RUN mkdir data

RUN apk --no-cache --update --virtual build-dependencies add \
    build-base python3 \
    && npm install -g npm@latest \
    && npm install --omit=dev \
    && apk del build-dependencies

CMD [ "node", "src/index.js"]