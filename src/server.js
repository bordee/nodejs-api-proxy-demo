"use strict";

const express = require("express");
const bodyParser = require("body-parser");

module.exports = function(config, { forecastClient }) {
    if (
        !config
        || !config.port
    ) {
        throw new Error("Invalid config: missing 'port'");
    }

    const
        server = express(),
        handlers = require("./requestHandlers")(forecastClient);

    server.use(bodyParser.json());

    Object.keys(handlers).forEach((k) => {
        const handlerConfig = handlers[k];
        if (
            !handlerConfig
            || !["get", "post"].includes(handlerConfig.method)
            || "function" !== typeof handlerConfig.handler
        ) {
            console.error("Invalid request handler in requestHandlers.js: ", JSON.stringify(handlerConfig));
            return;
        }
        server[handlerConfig.method](k, handlerConfig.handler);
    });

    server.listen(config.port, function(err) {
        if (err) {
            console.error("Starting server failed: ", err);
            throw new Error(err.message || err);
        }

        console.log("Server is listening on", config.port);
    });

    return server;
};
