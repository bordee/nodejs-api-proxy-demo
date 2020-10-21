"use strict";

const flatCache = require("flat-cache");
const superagent = require("superagent");

const {
    handleError,
    handleUncaughtException,
    handleUnhandledRejection
} = require("./src/errorHandler");

process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

try {
    const
        config = require("./config"),
        cache = flatCache.load(config.cacheId || "demo_app_default_cache_id"),
        server = require("./src/server")(
            config,
            require("./src/requestHandlers")(
                require("./src/accuWeatherClient")(
                    config,
                    { cache, request: superagent }
                )
            )
        );

    if (config.clearCache) {
        flatCache.clearAll();
    }

    server.start();
} catch(err) {
    handleError(err);
}
