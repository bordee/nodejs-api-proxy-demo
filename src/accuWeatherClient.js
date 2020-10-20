"use strict";

const superagent = require("superagent");
const flatCache = require("flat-cache");

const cacheIdDefault = "accuweatherClient_default_cache";

module.exports = function(config) {
    if (config.clearCache) {
        flatCache.clearAll();
    }

    const
        cache = flatCache.load(config.cacheId || cacheIdDefault),
        daysToUrlPath = function(days) {
            switch (days) {
                case 1:
                    return config.accuWeatherUrlPaths.forecast1Day;
                // case 5:
                default:
                    return config.accuWeatherUrlPaths.forecast5Days;
            }
        },
        sendRequest = async function(path, data) {
            return await superagent
                .get(`${config.accuWeatherUrl}${path}`)
                .query(Object.assign(
                    data || {},
                    {
                        apikey: config.accuWeatherApiKey,
                        metric: undefined !== config.accuWeatherUseMetricUnits
                            ? config.accuWeatherUseMetricUnits
                            : true
                    }
                ))
                .set('accept', 'json');
        },
        parseResponse = function(response) {
            switch(true) {
                case (undefined === response):
                    console.error(
                        "Accuweather request failed. Response: undefined."
                    );
                    return false;
                case (200 !== response.statusCode):
                    console.error(
                        "Accuweather request failed. Status code: ",
                        response.statusCode,
                        " Response text: ",
                        response.text
                    );
                    return false;
                case !response.text:
                    return false;
                default:
                    let parsedResponse;
                    try {
                        parsedResponse = JSON.parse(response.text);
                    } catch(err) {
                        console.error("Accuweather response parse error: ", err);
                        return false;
                    }
                    return parsedResponse;
            }
        },
        parseForecastData = function(forecast, days) {
            if (
                !forecast.DailyForecasts
                || !forecast.DailyForecasts[0]
                || !forecast.DailyForecasts[0].Temperature
                || !forecast.DailyForecasts[0].Temperature.Maximum
                || !forecast.DailyForecasts[0].Temperature.Minimum
            ) {
                console.error("Accuweather forecast response is missing temperature data. Response: ", forecast);
                return undefined;
            }

            const
                { Value: MaxValue, Unit: MaxUnit } = forecast.DailyForecasts[0].Temperature.Maximum,
                { Value: MinValue, Unit: MinUnit } = forecast.DailyForecasts[0].Temperature.Minimum;

            if (
                !MaxValue
                || !MaxUnit
                || !MinValue
                || !MinUnit
            ) {
                console.error("Accuweather forecast response is missing temperature values. Response: ", forecast);
                return undefined;
            }

            return {
                "forecast": {
                    "max": {
                        "text": `Maximum temperature within the next ${days} day(s): ${MaxValue} ${MaxUnit}`,
                        "value": MaxValue,
                        "unit": MaxUnit
                    },
                    "min": {
                        "text": `Minimum temperature within the next ${days} day(s): ${MinValue} ${MinUnit}`,
                        "value": MinValue,
                        "unit": MinUnit
                    }
                }
            }
        },
        getLocationKey = async function(searchString) {
            let locationKey = cache.getKey(searchString);

            if (!!locationKey) {
                console.log("Location key loaded from cache: ", searchString, locationKey);
                return locationKey;
            }

            let locationKeyResponse;
            try {
                locationKeyResponse = await sendRequest(
                    config.accuWeatherUrlPaths.textSearch,
                    { q: searchString }
                );
            } catch (err) {
                console.error("Accuweather location key request error: ", err);
                throw err;
            }

            const locations = parseResponse(locationKeyResponse);
            if (!locations) {
                throw new Error("Accuweather location key response is invalid");
            }

            locationKey = locations
                && locations[0] /** @TODO 0 .. */
                ? locations[0].Key
                : undefined;

            if (!!locationKey) {
                console.log("Location key request success: ", locationKey);
                cache.setKey(searchString, locationKey);
                cache.save();
            }

            return locationKey;
        },
        getForecast = async function(locationKey, days) {
            let forecastResponse;
            try {
                forecastResponse = await sendRequest(
                    `${daysToUrlPath(days)}${locationKey}`
                );
            } catch (err) {
                console.error("Accuweather forecast request error: ", err);
                throw err;
            }

            const forecast = parseResponse(forecastResponse);
            if (!forecast) {
                throw new Error("Accuweather forecast response is invalid");
            }

            return parseForecastData(forecast, days);
        };

    return {
        getLocationKey,
        getForecast
    };
}
