'use strict';

System.register(['lodash'], function (_export, _context) {
    "use strict";

    var _, _createClass, GenericDatasource;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function handleTsdbResponse(response) {
        var res = [];
        _.forEach(response.data.results, function (r) {
            _.forEach(r.series, function (s) {
                res.push({ target: s.name, datapoints: s.points });
            });
            _.forEach(r.tables, function (t) {
                t.type = 'table';
                t.refId = r.refId;
                res.push(t);
            });
        });
        response.data = res;
        console.log(res);
        return response;
    }

    _export('handleTsdbResponse', handleTsdbResponse);

    function mapToTextValue(result) {
        return _.map(result, function (d, i) {
            if (d && d.text && d.value) {
                return { text: d.text, value: d.value };
            } else if (_.isObject(d)) {
                return { text: d, value: i };
            }
            return { text: d, value: d };
        });
    }
    //# sourceMappingURL=datasource.js.map

    _export('mapToTextValue', mapToTextValue);

    return {
        setters: [function (_lodash) {
            _ = _lodash.default;
        }],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            _export('GenericDatasource', GenericDatasource = function () {
                /** @ngInject */
                function GenericDatasource(instanceSettings, backendSrv, templateSrv) {
                    _classCallCheck(this, GenericDatasource);

                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.type = instanceSettings.type;
                    this.url = instanceSettings.url;
                    this.name = instanceSettings.name;
                    this.id = instanceSettings.id;
                    this.withCredentials = instanceSettings.withCredentials;
                    this.headers = { 'Content-Type': 'application/json' };
                    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
                        this.headers['Authorization'] = instanceSettings.basicAuth;
                    }
                }

                _createClass(GenericDatasource, [{
                    key: 'query',
                    value: function query(options) {
                        var query = this.buildQueryParameters(options);
                        query.targets = query.targets.filter(function (t) {
                            return !t.hide;
                        });
                        if (query.targets.length <= 0) {
                            return Promise.resolve({ data: [] });
                        }
                        return this.doTsdbRequest(query).then(handleTsdbResponse);
                    }
                }, {
                    key: 'testDatasource',
                    value: function testDatasource() {
                        var to = new Date().getTime();
                        var from = to - 5000;
                        var str = '{"requestId":"Q100","timezone":"","range":{"from":"' + from + '","to":"' + to + '"},' + '"targets":[{"queryType":"query","target":"count","refId":"A","type":"timeserie","datasourceId":' + this.id + ',' + '"query":"* | select count(*) as count","ycol":"count"}]}';
                        var query = JSON.parse(str);
                        return this.doTsdbRequest(query).then(function (response) {
                            if (response.status === 200) {
                                return { status: "success", message: "Data source is working", title: "Success" };
                            } else {
                                return { status: "failed", message: "Data source is not working", title: "Error" };
                            }
                        }).catch(function (error) {
                            return { status: "failed", message: "Data source is not working", title: "Error" };
                        });
                    }
                }, {
                    key: 'annotationQuery',
                    value: function annotationQuery(options) {
                        var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
                        var annotationQuery = {
                            range: options.range,
                            annotation: {
                                name: options.annotation.name,
                                datasource: options.annotation.datasource,
                                enable: options.annotation.enable,
                                iconColor: options.annotation.iconColor,
                                query: query
                            },
                            rangeRaw: options.rangeRaw
                        };
                        return this.doRequest({
                            url: this.url + '/annotations',
                            method: 'POST',
                            data: annotationQuery
                        }).then(function (result) {
                            return result.data;
                        });
                    }
                }, {
                    key: 'metricFindQuery',
                    value: function metricFindQuery(query) {
                        var interpolated = {
                            target: this.templateSrv.replace(query, null, 'regex'),
                            datasourceId: this.id,
                            queryType: "search"
                        };
                        return this.doTsdbRequest({
                            targets: [interpolated]
                        }).then(function (response) {
                            var res = handleTsdbResponse(response);
                            if (res && res.data && res.data.length) {
                                return res.data[0].rows;
                            } else {
                                return [];
                            }
                        }).then(mapToTextValue);
                    }
                }, {
                    key: 'doRequest',
                    value: function doRequest(options) {
                        options.withCredentials = this.withCredentials;
                        options.headers = this.headers;
                        return this.backendSrv.datasourceRequest(options);
                    }
                }, {
                    key: 'doTsdbRequest',
                    value: function doTsdbRequest(options) {
                        var tsdbRequestData = {
                            queries: options.targets
                        };
                        if (options.range) {
                            tsdbRequestData.from = options.range.from.valueOf().toString();
                            tsdbRequestData.to = options.range.to.valueOf().toString();
                        }
                        return this.backendSrv.datasourceRequest({
                            url: '/api/tsdb/query',
                            method: 'POST',
                            data: tsdbRequestData
                        });
                    }
                }, {
                    key: 'buildQueryParameters',
                    value: function buildQueryParameters(options) {
                        var _this = this;

                        //remove placeholder targets
                        options.targets = _.filter(options.targets, function (target) {
                            return target.target !== 'select metric';
                        });
                        var targets = _.map(options.targets, function (target) {
                            return {
                                queryType: 'query',
                                target: _this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                                refId: target.refId,
                                hide: target.hide,
                                type: target.type || 'timeserie',
                                datasourceId: _this.id,
                                query: target.query,
                                xcol: target.xcol,
                                ycol: target.ycol
                            };
                        });
                        options.targets = targets;
                        return options;
                    }
                }, {
                    key: 'getTagKeys',
                    value: function getTagKeys(options) {
                        var _this2 = this;

                        return new Promise(function (resolve, reject) {
                            _this2.doRequest({
                                url: _this2.url + '/tag-keys',
                                method: 'POST',
                                data: options
                            }).then(function (result) {
                                return resolve(result.data);
                            });
                        });
                    }
                }, {
                    key: 'getTagValues',
                    value: function getTagValues(options) {
                        var _this3 = this;

                        return new Promise(function (resolve, reject) {
                            _this3.doRequest({
                                url: _this3.url + '/tag-values',
                                method: 'POST',
                                data: options
                            }).then(function (result) {
                                return resolve(result.data);
                            });
                        });
                    }
                }]);

                return GenericDatasource;
            }());

            _export('GenericDatasource', GenericDatasource);
        }
    };
});
//# sourceMappingURL=datasource.js.map
