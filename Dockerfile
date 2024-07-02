FROM node:18-alpine

# Copy across the files from our `intermediate` container
RUN mkdir app

COPY ../index.js /app
COPY ../lib /app/lib

COPY ../package.json /app

WORKDIR /app

RUN mkdir data

RUN npm install

CMD [ "node", "index.js"]