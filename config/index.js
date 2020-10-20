"use strict";

module.exports = {
    port: 8080,
    accuWeatherApiKey: "CxYaGsocIihBjT60kAdWHSDmz17Xhlwz",
    accuWeatherUrl: "http://dataservice.accuweather.com",
    accuWeatherUrlPaths: {
        textSearch: "/locations/v1/cities/search",
        forecast1Day: "/forecasts/v1/daily/1day/",
        forecast5Days: "/forecasts/v1/daily/5day/"
    },
    accuWeatherUseMetricUnits: true,
    cacheId: "nodejs-api-proxy-demo-asdf1234",
    clearCache: false
};
