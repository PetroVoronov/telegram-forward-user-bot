FROM node:22-alpine

# Copy across the files from our `intermediate` container
RUN mkdir app

COPY ../src /app/src

COPY ../locales /app/locales

COPY ../package.json /app

WORKDIR /app

RUN mkdir data

RUN npm install

CMD [ "node", "src/index.js"]