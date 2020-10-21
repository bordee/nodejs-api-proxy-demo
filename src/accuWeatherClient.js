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
        rainIntensityToProbabilityInt = function(intensity) {
            switch (intensity) {
                case "light":
                    return 25;
                case "moderate":
                    return 50;
                case "heavy":
                    return 75;
                default:
                    return 0;
            }
        },
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
        parseDailyForecast = function(dailyForecast) {
            if (
                !dailyForecast
                || !dailyForecast.Temperature
                || !dailyForecast.Temperature.hasOwnProperty("Minimum")
                || !dailyForecast.Temperature.hasOwnProperty("Maximum")
            ) {
                process.env.DEBUG && console.error("Daily forecast is missing temperature data: ", dailyForecast);
                return undefined;
            }

            const
                { Value: MinValue, Unit: MinUnit } = dailyForecast.Temperature.Minimum,
                { Value: MaxValue, Unit: MaxUnit } = dailyForecast.Temperature.Maximum,
                rainProbabilityInt = "Rain" === dailyForecast.Day.PrecipitationType
                    ? (dailyForecast.Day.PrecipitationProbability
                        || rainIntensityToProbabilityInt(dailyForecast.Day.PrecipitationIntensity))
                    : 0,
                probabilityText = `${rainProbabilityInt}%`;

            if (
                undefined === MinValue
                || undefined === MinUnit
                || undefined === MaxValue
                || undefined === MaxUnit
            ) {
                process.env.DEBUG && console.error("Accuweather forecast response is missing temperature values. Response: ", forecast);
                return undefined;
            }

            return {
                "date": dailyForecast.Date,
                "forecast": {
                    "min": {
                        "text": `Minimum temperature for today: ${MinValue} ${MinUnit}.`,
                        "value": MinValue,
                        "unit": MinUnit
                    },
                    "max": {
                        "text": `Maximum temperature for today: ${MaxValue} ${MaxUnit}.`,
                        "value": MaxValue,
                        "unit": MaxUnit
                    },
                    "rain": {
                        "text": `The probability of rain for today is ${probabilityText}.`,
                        "value": probabilityText
                    }
                }
            }
        },
        parse5DaysForecast = function(forecasts) {
            if (
                !Array.isArray(forecasts)
            ) {
                process.env.DEBUG && console.error("Accuweather response is not an array: ", forecast);
                return undefined;
            }

            if (
                !forecasts[0].Temperature
                || !forecasts[0].Temperature.hasOwnProperty("Minimum")
                || !forecasts[0].Temperature.hasOwnProperty("Maximum")
            ) {
                process.env.DEBUG && console.error("Forecast is missing temperature data: ", forecasts);
                return undefined;
            }

            let minTemp, maxTemp;
            const
                { Unit: MinUnit } = forecasts[0].Temperature.Minimum,
                { Unit: MaxUnit } = forecasts[0].Temperature.Maximum;

            forecasts.forEach((forecast) => {
                if(
                    !forecast.Temperature
                    || !forecast.Temperature.hasOwnProperty("Minimum")
                    || !forecast.Temperature.hasOwnProperty("Maximum")
                ) {
                    return;
                }

                const
                    { Value: MinValue } = forecast.Temperature.Minimum,
                    { Value: MaxValue } = forecast.Temperature.Maximum;

                if (
                    !minTemp
                    || MinValue < minTemp
                ) {
                    minTemp = MinValue;
                }
                if (
                    !maxTemp
                    || maxTemp < MaxValue
                ) {
                    maxTemp = MaxValue;
                }
            });

            return minTemp && maxTemp
                ? {
                    "forecast": {
                        "max": {
                            "text": `Maximum temperature within the next 5 days: ${maxTemp} ${MaxUnit}`,
                            "value": maxTemp,
                            "unit": MaxUnit
                        },
                        "min": {
                            "text": `Minimum temperature within the next 5 days: ${minTemp} ${MinUnit}`,
                            "value": minTemp,
                            "unit": MinUnit
                        }
                    }
                }
                : undefined
        },
        parseForecastData = function(forecast, days) {
            if (
                !forecast.DailyForecasts
                || !forecast.DailyForecasts[0]
            ) {
                process.env.DEBUG && console.error("Accuweather response is missing forecast data: ", forecast);
                return undefined;
            }

            process.env.DEBUG && console.log("Forecast data: ", JSON.stringify(forecast, null, 4));

            return 1 === days
                ? parseDailyForecast(forecast.DailyForecasts[0])
                : parse5DaysForecast(forecast.DailyForecasts);
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
