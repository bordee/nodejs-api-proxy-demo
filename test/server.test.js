const assert = require("assert").strict;

const Server = require("../src/server");

describe("Server module test", function() {
    describe("Server instantiation", function() {
        it("should throw error on missing port number in config", function() {
            assert.throws(
                () => Server({}, {}),
                { name: /^Error$/ }
            );
        });

        it("should throw error if requestHandlers parameter is missing", function() {
            assert.throws(
                () => Server({ port: 8080 }, null),
                { name: /^Error$/ }
            );

            assert.throws(
                () => Server({ port: 8080 }, undefined),
                { name: /^Error$/ }
            );
        });

        it("should return and object with 'start' and 'stop' functions", function() {
            const server = Server({ port: 8080 }, {});

            assert.ok("object" === typeof server);
            assert.ok("function" === typeof server.start);
            assert.ok("function" === typeof server.stop);
        });
    });

    describe("Server start", function() {
        it("should return a Promise", async function() {
            const
                server = Server({ port: 8080 }, {}),
                promise = server.start();

            assert.ok("function" === typeof promise.then);

            (await promise).close();
        });

        it("should not reject", function() {
            const server = Server({ port: 8080 }, {});

            assert.doesNotReject(async () => {
                (await server.start()).close();
            });
        });
    });
});
