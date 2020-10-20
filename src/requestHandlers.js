"use strict";

module.exports = function(forecastClient) {
    if (
        !forecastClient
        || "object" != typeof forecastClient
    ) {
        throw new Error("Missing server dependency: forecastClient")
    }

    const
        healthCheckHander = function(req, res) {
            res.send("Server is running.");
        },
        forecastHander = async function({req, res}, days) {
            const searchString = req.query.city;
            if (
                !searchString
                || !searchString.length
            ) {
                return res.status(400).json({ error: "Missing query parameter: city." });
            }

            let locationKey;
            try {
                locationKey = await forecastClient.getLocationKey(searchString);
            } catch (err) {
                console.error("forecastClient.getLocationKey failed", err);
                return res.status(500).json({ error: "Loading forecast data failed" });
            }

            if(!locationKey) {
                return res.status(400).json({
                    error: "Location not found",
                    searchString
                });
            }

            let forecast;
            try {
                forecast = await forecastClient.getForecast(locationKey, days);
            } catch (err) {
                console.error("forecastClient.getForecast failed", err);
                return res.status(500).json({ error: "Loading forecast data failed" });
            }

            return res.send(forecast);
        };

    return {
        "/" : {
            method: "get",
            handler: healthCheckHander
        },
        "/search/1day/": {
            method: "get",
            handler: (req, res) => forecastHander({req, res}, 1)
        },
        "/search/5days/": {
            method: "get",
            handler: (req, res) => forecastHander({req, res}, 5)
        }
    };
}
