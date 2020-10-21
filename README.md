# nodejs-api-proxy-demo
Api / proxy server demo in node.js

---

## Requirements

* node.js: https://nodejs.org/en/download/
* npm: https://www.npmjs.com/get-npm

## Build

    npm install


('npm run build' can be used as well)

## Usage

### Start server (without error logging)

After running the following command, the application should be available on http://locatlost:8080. (Port number can be changed in config/index.js)

    npm run start

### Start server (with error logging)
Error logging to console is only active in debug mode:

    npm run debug

### API URIs

#### /search/1day?city=[search text]
* Search for 1 day forecast by city name
* Example:

    http://localhost:8080/search/1day/?city=Budapest

#### /search/5day?city=[search text]
* Search for 5 days forecast by city name
* Example:

    http://localhost:8080/search/5days/?city=Budapest

### Normal response

#### 1 day forecast

    {
        "forecast": {
            "min": {
                "text": [ForecastText],
                "value": [MinimumValue],
                "unit": [Unit]
            },
            "max": {
                "text": [ForecastText],
                "value": [MaximumValue],
                "unit": [Unit]
            },
            "rain": {
                "text": [RainProbabilityText],
                "value": [RainProbabilityValue]
            }
        }
    }

#### 5 days forecast

    {
        "forecast": {
            "min": {
                "text": [ForecastText],
                "value": [MinimumValue],
                "unit": [Unit]
            },
            "max": {
                "text": [ForecastText],
                "value": [MaximumValue],
                "unit": [Unit]
            }
        }
    }

### Error response

    {
        error: [ErrorText]
        [, searchString: [SearchString]]
    }

(The attribute _searchString_ is returned only when no locations have been found, and no other errors occured.)

### For development:

The following command starts the app in debug mode using [nodemon](https://nodemon.io/), so the server is restarted on code / config changes:

    npm run watch

## Run tests:

    npm run test
