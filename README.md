# nodejs-api-proxy-demo
Api / proxy server demo in node.js

---

## Requirements

* node.js: https://nodejs.org/en/download/
* npm: https://www.npmjs.com/get-npm

## Build

    npm install


('npm run build' can be used as well)

## Run

### Start server (without error logging)

After running the following command, the application should be available on http://locatlost:8080. (Port number can be changed in config/index.js)

    npm run start

### Start server (with error logging)
Error logging to console is only active in debug mode:

    npm run debug

### For development:

The following command starts the app in debug mode using [nodemon](https://nodemon.io/)
, so code changes are applied immediately:

    npm run watch

Run tests:

    npm run test
