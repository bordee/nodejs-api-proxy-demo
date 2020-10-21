"use strict";

const
    handleError = function(err) {
        process.env.DEBUG && console.log(err);
        process.env.DEBUG && console.error(
            "[ERROR] Starting application failed: ",
            err ? (err.message || err) : "unknown error",
            err ? err.stack : undefined
        );
        process.exit(1);
    },
    handleUncaughtException = function(err) {
        handleError(err);
    },
    handleUnhandledRejection = function(reason, p) {
        handleError(reason);
    };

module.exports = {
    handleError,
    handleUncaughtException,
    handleUnhandledRejection
};
