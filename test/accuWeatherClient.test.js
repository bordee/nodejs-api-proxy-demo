const assert = require("assert").strict;
const sinon = require('sinon');

const accuWeatherClient = require("../src/accuWeatherClient");

const
    testCacheId = "cacheIdTest",
    testSearchString = "asd",
    testLocationKey = "asdf1234",
    testLocationKeys = [
        { Key: testLocationKey }
    ],
    testMinValue = 0,
    testMinUnit = "C",
    testMaxValue = 100,
    testMaxUnit = "F",
    testRainProbability = "11%",
    testForecast1Day = {
        DailyForecasts: [{
            Temperature: {
                Minimum: {
                    Value: testMinValue,
                    Unit: testMinUnit
                },
                Maximum: {
                    Value: testMaxValue,
                    Unit: testMaxUnit
                }
            },
            Day: {
                PrecipitationType: "Rain",
                PrecipitationProbability: testRainProbability
            }
        }]
    },
    testForecast5Days = {
        DailyForecasts: [
            {
                Temperature: {
                    Minimum: {
                        Value: testMinValue,
                        Unit: testMinUnit
                    },
                    Maximum: {
                        Value: testMaxValue,
                        Unit: testMaxUnit
                    }
                }
            },
            {
                Temperature: {
                    Minimum: { Value: 9999 },
                    Maximum: { Value: -1000 }
                }
            }
        ]
    },
    testConfig = {
        accuWeatherApiKey: "accuWeatherApiKey",
        accuWeatherUrl: "accuWeatherUrl",
        accuWeatherUrlPaths: {
            textSearch: "textSearch",
            forecast1Day: "forecast1Day",
            forecast5Days: "forecast5Days"
        },
        accuWeatherUseMetricUnits: true,
        cacheId: testCacheId
    },
    requestError = {
        get: function() { throw new Error(); }
    },
    errorResponse = {
        statusCode: 500
    },
    invalidResponse = {
        statusCode: 200,
        text: "asd"
    },
    falsyResponse = {
        statusCode: 200,
        text: ""
    },
    cacheHit = {
        getKey: () => { return testLocationKey; }
    },
    RequestMock = function(response) {
        const request = {};
        request.get = function() { return request; };
        request.query = function() { return request; };
        request.set = function() { return Promise.resolve(response); };
        return request;
    },
    requestWithErrorResponse = RequestMock(errorResponse),
    requestWithInvalidResponse = RequestMock(invalidResponse),
    requestWithFalsyResponse = RequestMock(falsyResponse);

describe("accuWeatherClient module test", function() {
    describe("Object instantiation", function() {
        it("should throw error if parameter is not an object", function() {
            assert.throws(
                () => accuWeatherClient(null, {}),
                { name: /^Error$/ }
            );

            assert.throws(
                () => accuWeatherClient(undefined, {}),
                { name: /^Error$/ }
            );
        });

        it("should throw error on missing parameter key", function() {
            assert.throws(
                () => accuWeatherClient({}, {}),
                { name: /^Error$/ }
            );
        });

        it("should return and object with 2 functions", function() {
            const forecastClient = accuWeatherClient(testConfig, {});

            assert.ok("object" === typeof forecastClient);
            assert.ok("function" === typeof forecastClient.getLocationKey);
            assert.ok("function" === typeof forecastClient.getForecast);
        });
    });

    describe("getLocationKey function", function() {
        const
            locationKeyEmptyResponse = {
                statusCode: 200,
                text: "[]"
            },
            locationKeyOkResponse = {
                statusCode: 200,
                text: JSON.stringify(testLocationKeys)
            },
            locationKeyQueryData = {
                apikey: testConfig.accuWeatherApiKey,
                q: testSearchString
            },
            cacheMiss = {
                getKey: () => { return ""; },
                setKey: () => {},
                save: () => {}
            },
            request = RequestMock(locationKeyOkResponse),
            requestWithEmptyResponse = RequestMock(locationKeyEmptyResponse),
            cacheHitGetKeySpy = sinon.spy(cacheHit, "getKey"),
            cacheGetKeySpy = sinon.spy(cacheMiss, "getKey"),
            cacheSetKeySpy = sinon.spy(cacheMiss, "setKey"),
            cacheSaveSpy = sinon.spy(cacheMiss, "save"),
            locationKeyGetSpy = sinon.spy(request, "get"),
            locationKeyQuerySpy = sinon.spy(request, "query");

        it("should return location key from cache", async function() {
            cacheHitGetKeySpy.resetHistory();
            const cachedData = await accuWeatherClient(
                    testConfig,
                    { cache: cacheHit }
                ).getLocationKey(testSearchString);
            assert.ok(cacheHitGetKeySpy.calledOnceWithExactly(testSearchString));
            assert.equal(cachedData, testLocationKey);
        });

        it("should reject on request error", function() {
            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { cache: cacheMiss, request: requestError }
                ).getLocationKey(testSearchString)
            );
        });

        it("should send request with proper parameters", async function() {
            locationKeyGetSpy.resetHistory();
            locationKeyQuerySpy.resetHistory();
            await accuWeatherClient(
                testConfig,
                { cache: cacheMiss, request }
            ).getLocationKey(testSearchString);

            assert.ok(locationKeyGetSpy.calledOnceWithExactly(
                `${testConfig.accuWeatherUrl}${testConfig.accuWeatherUrlPaths.textSearch}`
            ));
            assert.ok(locationKeyQuerySpy.calledOnceWithExactly(locationKeyQueryData));
        });

        it("should reject on error / invalid / falsy respose", function() {
            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { cache: cacheMiss, request: requestWithErrorResponse }
                ).getLocationKey(testSearchString)
            );

            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { cache: cacheMiss, request: requestWithInvalidResponse }
                ).getLocationKey(testSearchString)
            );

            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { cache: cacheMiss, request: requestWithFalsyResponse }
                ).getLocationKey(testSearchString)
            );
        });

        it("should return undefined and not cache on missing Key attribute", async function() {
            cacheSetKeySpy.resetHistory();
            cacheSaveSpy.resetHistory();
            assert.equal(
                await accuWeatherClient(
                    testConfig,
                    { cache: cacheMiss, request: requestWithEmptyResponse }
                ).getLocationKey(testSearchString),
                undefined
            );
            assert.ok(cacheSetKeySpy.notCalled);
            assert.ok(cacheSaveSpy.notCalled);
        });

        it("should cache and return key on success", async function() {
            cacheSetKeySpy.resetHistory();
            cacheSaveSpy.resetHistory();
            assert.equal(
                await accuWeatherClient(
                    testConfig,
                    { cache: cacheMiss, request }
                ).getLocationKey(testSearchString),
                testLocationKeys[0].Key
            );
            assert.ok(cacheSetKeySpy.calledOnceWithExactly(testSearchString, testLocationKey));
            assert.ok(cacheSaveSpy.calledOnce);
        });
    });

    describe("getForecast function", function() {
        const
            forecastEmptyResponse = {
                statusCode: 200,
                text: "{}"
            },
            forecast1DayOkResponse = {
                statusCode: 200,
                text: JSON.stringify(testForecast1Day)
            },
            forecast5DaysOkResponse = {
                statusCode: 200,
                text: JSON.stringify(testForecast5Days)
            },
            forecastQueryData = {
                apikey: testConfig.accuWeatherApiKey,
                metric: testConfig.accuWeatherUseMetricUnits
            },
            request1Day = RequestMock(forecast1DayOkResponse),
            request5Days = RequestMock(forecast5DaysOkResponse),
            requestWithEmptyResponse = RequestMock(forecastEmptyResponse),
            forecast1DayGetSpy = sinon.spy(request1Day, "get"),
            forecast5DaysGetSpy = sinon.spy(request5Days, "get"),
            forecast1DayQuerySpy = sinon.spy(request1Day, "query"),
            forecast5DaysQuerySpy = sinon.spy(request5Days, "query");

        it("should reject on request error", function() {
            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { request: requestError }
                ).getForecast(testLocationKey, undefined)
            );
        });

        it("should send 1 day forecast request with proper parameters", function() {
            const days = 1;
            forecast1DayGetSpy.resetHistory();
            forecast1DayQuerySpy.resetHistory();
            accuWeatherClient(
                testConfig,
                { request: request1Day }
            ).getForecast(testLocationKey, days);

            assert.ok(forecast1DayGetSpy.calledOnceWithExactly(
                `${testConfig.accuWeatherUrl}${testConfig.accuWeatherUrlPaths.forecast1Day}${testLocationKey}`,
            ));

            assert.ok(forecast1DayQuerySpy.calledOnceWithExactly(forecastQueryData));
        });

        it("should send 5 days forecast request with proper parameters", function() {
            const days = 5;
            forecast5DaysGetSpy.resetHistory();
            forecast5DaysQuerySpy.resetHistory();
            accuWeatherClient(
                testConfig,
                { request: request5Days }
            ).getForecast(testLocationKey, days);

            assert.ok(forecast5DaysGetSpy.calledOnceWithExactly(
                `${testConfig.accuWeatherUrl}${testConfig.accuWeatherUrlPaths.forecast5Days}${testLocationKey}`,
            ));

            assert.ok(forecast5DaysQuerySpy.calledOnceWithExactly(forecastQueryData));
        });

        it("should reject on error / invalid / falsy respose", function() {
            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { request: requestWithErrorResponse }
                ).getForecast(testLocationKey, undefined)
            );

            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { request: requestWithInvalidResponse }
                ).getForecast(testLocationKey, undefined)
            );

            assert.rejects(
                accuWeatherClient(
                    testConfig,
                    { request: requestWithFalsyResponse }
                ).getForecast(testLocationKey, undefined)
            );
        });

        it("should return undefined on missing forecast attributes", async function() {
            assert.equal(
                await accuWeatherClient(
                    testConfig,
                    { cache: cacheHit, request: requestWithEmptyResponse }
                ).getForecast(testLocationKey, undefined),
                undefined
            );
        });

        it("should return 1 day forecast response on success", async function() {
            const
                days = 1,
                result = await accuWeatherClient(
                    testConfig,
                    { cache: cacheHit, request: request1Day }
                ).getForecast(testLocationKey, days);

            assert.ok("object" === typeof result.forecast);
            const forecast = result.forecast;
            assert.ok("object" === typeof forecast.max);
            assert.ok("object" === typeof forecast.min);
            assert.ok("object" === typeof forecast.rain);
            assert.ok("string" === typeof forecast.max.text);
            assert.ok("string" === typeof forecast.max.text);
            assert.ok("string" === typeof forecast.rain.text);
            assert.equal(forecast.max.value, testMaxValue);
            assert.equal(forecast.max.unit, testMaxUnit);
            assert.equal(forecast.min.value, testMinValue);
            assert.equal(forecast.min.unit, testMinUnit);
            assert.equal(forecast.rain.value, testRainProbability);
        });

        it("should return 5 day forecast response on success", async function() {
            const
                days = 5,
                result = await accuWeatherClient(
                    testConfig,
                    { cache: cacheHit, request: request5Days }
                ).getForecast(testLocationKey, days);

            assert.ok("object" === typeof result.forecast);
            const forecast = result.forecast;
            assert.ok("object" === typeof forecast.max);
            assert.ok("object" === typeof forecast.min);
            assert.ok("object" === typeof forecast.max);
            assert.ok("string" === typeof forecast.max.text);
            assert.ok("string" === typeof forecast.max.text);
            assert.equal(forecast.max.value, testMaxValue);
            assert.equal(forecast.max.unit, testMaxUnit);
            assert.equal(forecast.min.value, testMinValue);
            assert.equal(forecast.min.unit, testMinUnit);
        });
    });
});
