FROM node:24-alpine
ARG TARGETPLATFORM

# Copy across the files from our `intermediate` container
RUN mkdir app

COPY ../src /app/src

COPY ../locales /app/locales

COPY ../package*.json /app

WORKDIR /app

RUN mkdir data

RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then npm install -g npm@latest && npm ci --omit=dev ; else \
    apk --no-cache --update --virtual build-dependencies add \
    build-base python3 \
    && npm install -g npm@latest \
    && npm ci --omit=dev \
    && apk del build-dependencies ; fi \
    && rm package-lock.json

ENTRYPOINT [ "node", "src/index.js" ]
CMD []