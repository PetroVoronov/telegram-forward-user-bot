FROM node:18-alpine

# Copy across the files from our `intermediate` container
RUN mkdir app

COPY ../src /app/src

COPY ../package.json /app

WORKDIR /app

RUN mkdir data

RUN npm install

CMD [ "node", "src/index.js"]