"use strict";

module.exports = function(config, { cache, request }) {
    [
        "accuWeatherApiKey",
        "accuWeatherUrlPaths",
        "accuWeatherUrl"
    ].forEach((e) => {
        if (
            !config
            || !config.hasOwnProperty(e)
        ) {
            throw new Error(`Missing config value: ${e}`);
        }
    });

    const
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
            return await request
                .get(`${config.accuWeatherUrl}${path}`)
                .query(Object.assign(
                    data || {},
                    {
                        apikey: config.accuWeatherApiKey
                    }
                ))
                .set('accept', 'json');
        },
        parseResponse = function(response) {
            switch(true) {
                case (undefined === response):
                    process.env.DEBUG && console.error(
                        "Accuweather request failed. Response: undefined."
                    );
                    return false;
                case (200 !== response.statusCode):
                    process.env.DEBUG && console.error(
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
                        process.env.DEBUG && console.error("Accuweather response parse error: ", err);
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
                || !forecast.DailyForecasts[0].Temperature.hasOwnProperty("Maximum")
                || !forecast.DailyForecasts[0].Temperature.hasOwnProperty("Minimum")
            ) {
                process.env.DEBUG && console.error("Accuweather forecast response is missing temperature data. Response: ", forecast);
                return undefined;
            }

            const
                { Value: MaxValue, Unit: MaxUnit } = forecast.DailyForecasts[0].Temperature.Maximum,
                { Value: MinValue, Unit: MinUnit } = forecast.DailyForecasts[0].Temperature.Minimum;

            if (
                undefined === MaxValue
                || undefined === MaxUnit
                || undefined === MinValue
                || undefined === MinUnit
            ) {
                process.env.DEBUG && console.error("Accuweather forecast response is missing temperature values. Response: ", forecast);
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
                process.env.DEBUG && console.log("Location key loaded from cache: ", searchString, locationKey);
                return locationKey;
            }

            let locationKeyResponse;
            try {
                locationKeyResponse = await sendRequest(
                    config.accuWeatherUrlPaths.textSearch,
                    { q: searchString }
                );
            } catch (err) {
                process.env.DEBUG && console.error("Accuweather location key request error: ", err);
                throw err;
            }

            const locations = parseResponse(locationKeyResponse);

            if (!locations) {
                throw new Error("Accuweather location key response is invalid");
            }

            locationKey = locations[0] /** @TODO 0 .. */
                ? locations[0].Key
                : undefined;

            if (!!locationKey) {
                process.env.DEBUG && console.log("Location key request success: ", locationKey);
                cache.setKey(searchString, locationKey);
                cache.save();
            }

            return locationKey;
        },
        getForecast = async function(locationKey, days) {
            let forecastResponse;
            try {
                forecastResponse = await sendRequest(
                    `${daysToUrlPath(days)}${locationKey}`,
                    {
                        metric: undefined !== config.accuWeatherUseMetricUnits
                            ? config.accuWeatherUseMetricUnits
                            : true
                    }
                );
            } catch (err) {
                process.env.DEBUG && console.error("Accuweather forecast request error: ", err);
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
