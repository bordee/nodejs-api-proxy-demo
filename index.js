"use strict";
const config = require("./config");

require("./src/server")(
    config,
    {
        forecastClient: require("./src/accuWeatherClient")(config)
    }
);
