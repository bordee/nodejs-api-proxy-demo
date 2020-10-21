"use strict";

const express = require("express");
const bodyParser = require("body-parser");

module.exports = function(config, requestHandlers) {
    if (
        !config
        || !config.port
    ) {
        throw new Error("Invalid config: missing 'port'");
    }

    if (
        !requestHandlers
        || "object" !== typeof requestHandlers
    ) {
        throw new Error("Invalid requestHandlers module");
    }

    const
        server = express(),
        startServer = function() {
            return new Promise((resolve, reject) => {
                const serverInstance = server.listen(config.port, function(err) {
                    if (err) {
                        process.env.DEBUG && console.error("Starting server failed: ", err);
                        reject(err.message || err);
                    }

                    process.env.DEBUG && console.log("Server is listening on", config.port);
                    resolve(serverInstance);
                });
            });
        },
        stopServer = function() {
            return server.close();
        };

    server.use(bodyParser.json());

    Object.keys(requestHandlers).forEach((k) => {
        const handlerConfig = requestHandlers[k];
        if (
            !handlerConfig
            || !["get", "post"].includes(handlerConfig.method)
            || "function" !== typeof handlerConfig.handler
        ) {
            process.env.DEBUG && console.error("Invalid request handler in requestHandlers.js: ", JSON.stringify(handlerConfig));
            return;
        }
        server[handlerConfig.method](k, handlerConfig.handler);
    });

    return {
        start: startServer,
        stop: stopServer
    };
};
