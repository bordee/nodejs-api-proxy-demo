const assert = require("assert").strict;
const sinon = require('sinon');

const
    requestHandlers = require("../src/requestHandlers"),
    handlerKeysToDays = {
        "/search/1day/": 1,
        "/search/5days/": 5
    },
    runTestOnHandlers = function(forecastClient, handlersModule, testFunction) {
        const res = {};
        res.status = function() { return res; };
        res.json = function() { return res; };
        res.send = function() { return res; };

        const
            forecastClientMock = forecastClient.getLocationKey
                ? Object.assign({}, forecastClient)
                : forecastClient;
            handlers = handlersModule(forecastClientMock),
            resStatusSpy = sinon.spy(res, "status"),
            resSendSpy = sinon.spy(res, "send"),
            getLocationKeySpy = forecastClientMock.getLocationKey
                ? sinon.spy(forecastClientMock, "getLocationKey")
                : undefined,
            getForecastSpy = forecastClientMock.getForecast
                ? sinon.spy(forecastClientMock, "getForecast")
                : undefined;

        Object.keys(handlers).forEach((k) => {
            if ("/" === k) {
                /** do not run these tests on healthcheck */
                return;
            }

            testFunction(
                handlers[k].handler,
                k,
                {
                    res,
                    resStatusSpy,
                    resSendSpy,
                    getLocationKeySpy,
                    getForecastSpy
                }
            );
        });
    };

describe("ResponseHandlers module test", function() {
    describe("Object instantiation", function() {
        it("should throw error if parameter is not an object", function() {
            assert.throws(
                () => requestHandlers(null),
                { name: /^Error$/ }
            );

            assert.throws(
                () => requestHandlers(undefined),
                { name: /^Error$/ }
            );
        });


        it("should return and object containing handler configurations", function() {
            const handlers = requestHandlers({});

            assert.ok("object" === typeof handlers);
            Object.keys(handlers).forEach((k) => {
                const handlerConfig = handlers[k];
                assert.ok("object" === typeof handlerConfig);
                assert.ok(["get", "post"].includes(handlerConfig.method));
                assert.ok("function" === typeof handlerConfig.handler);
            });
        });
    });

    describe("Handler functions", function() {
        const
            testLocationKey = "asdf1234",
            testForecast = { text: "asd" },
            forecastClient = {
                getLocationKey: () => { return Promise.resolve(testLocationKey); },
                getForecast: (key, days) => {
                    return Promise.resolve(testForecast);
                }
            },
            forecastClientFail1 = {
                getLocationKey: () => { throw new Error(); },
                getForecast: () => {}
            },
            forecastClientFalse = {
                getLocationKey: () => { return Promise.resolve(false); },
                getForecast: () => {}
            },
            forecastClientFail2 = {
                getLocationKey: () => { return Promise.resolve(testLocationKey); },
                getForecast: () => { throw new Error(); }
            };

        runTestOnHandlers(
            {},
            requestHandlers,
            (handler, k, { res, resStatusSpy }) => {
                it("should call res.status with 400 on empty search string", function() {
                    resStatusSpy.resetHistory();
                    handler({ query: { city: "" } }, res);
                    assert.ok(resStatusSpy.calledOnceWithExactly(400));
                });
            }
        );

        runTestOnHandlers(
            forecastClient,
            requestHandlers,
            (handler, k, { res, getLocationKeySpy }) => {
                it("should call forecastClient.getLocationKey with search string as parameter", async function() {
                    getLocationKeySpy.resetHistory();
                    const testSearchString = "asd";
                    await handler({ query: { city: testSearchString } }, res);
                    assert.ok(getLocationKeySpy.calledOnceWithExactly(testSearchString));
                });
            }
        );

        runTestOnHandlers(
            forecastClientFail1,
            requestHandlers,
            (handler, k, { res, resStatusSpy }) => {
                it("should return response status 500 if forecastClient.getLocationKey call fails", async function() {
                    resStatusSpy.resetHistory();
                    await handler({ query: { city: "asd" } }, res);
                    assert.ok(resStatusSpy.calledOnceWithExactly(500));
                });
            }
        );

        runTestOnHandlers(
            forecastClientFalse,
            requestHandlers,
            (handler, k, { res, resStatusSpy }) => {
                it("should return response status 404 if locationKey is not found", async function() {
                    resStatusSpy.resetHistory();
                    await handler({ query: { city: "asd" } }, res);
                    assert.ok(resStatusSpy.calledOnceWithExactly(404));
                });
            }
        );

        runTestOnHandlers(
            forecastClient,
            requestHandlers,
            (handler, k, { res, getForecastSpy }) => {
                it("should call forecastClient.getForecast with locationKey and days as paramaters", async function() {
                    getForecastSpy.resetHistory();
                    await handler({ query: { city: "asd" } }, res);
                    assert.ok(
                        getForecastSpy.calledOnceWithExactly(
                            testLocationKey,
                            handlerKeysToDays[k]
                        )
                    );
                });
            }
        );

        runTestOnHandlers(
            forecastClientFail2,
            requestHandlers,
            (handler, k, { res, resStatusSpy }) => {
                it("should return response status 500 if forecastClient.getForecast call fails", async function() {
                    resStatusSpy.resetHistory();
                    await handler({ query: { city: "asd" } }, res);
                    assert.ok(resStatusSpy.calledOnceWithExactly(500));
                });
            }
        );

        runTestOnHandlers(
            forecastClient,
            requestHandlers,
            (handler, k, { res, resSendSpy }) => {
                it("should call res.send with forecast as paramater", async function() {
                    resSendSpy.resetHistory();
                    await handler({ query: { city: "asd" } }, res);
                    assert.ok(resSendSpy.calledOnceWithExactly(testForecast));
                });
            }
        );
    });
});
