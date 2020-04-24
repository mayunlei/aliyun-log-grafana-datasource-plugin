'use strict';

System.register(['app/plugins/sdk', './css/query-editor.css!'], function (_export, _context) {
    "use strict";

    var QueryCtrl, _createClass, GenericDatasourceQueryCtrl;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    return {
        setters: [function (_appPluginsSdk) {
            QueryCtrl = _appPluginsSdk.QueryCtrl;
        }, function (_cssQueryEditorCss) {}],
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

            _export('GenericDatasourceQueryCtrl', GenericDatasourceQueryCtrl = function (_QueryCtrl) {
                _inherits(GenericDatasourceQueryCtrl, _QueryCtrl);

                /** @ngInject */
                function GenericDatasourceQueryCtrl($scope, $injector) {
                    _classCallCheck(this, GenericDatasourceQueryCtrl);

                    var _this = _possibleConstructorReturn(this, (GenericDatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(GenericDatasourceQueryCtrl)).call(this, $scope, $injector));

                    _this.target.target = _this.target.ycol;
                    _this.target.type = _this.panel.type || 'timeserie';
                    _this.target.logsPerPage = 100;
                    _this.target.currentPage = 1;
                    _this.getHistograms();
                    return _this;
                }
                // getOptions(query) {
                //   return this.datasource.metricFindQuery(query || '');
                // }
                //
                // toggleEditorMode() {
                //   this.target.rawQuery = !this.target.rawQuery;
                // }
                //
                // onChangeInternal() {
                //   this.panelCtrl.refresh(); // Asks the panel to refresh data.
                // }


                _createClass(GenericDatasourceQueryCtrl, [{
                    key: 'getHistograms',
                    value: function getHistograms() {
                        var _this2 = this;

                        var query = this.datasource.replaceQueryParameters(this.target, { "scopedVars": "" });
                        var to = this.datasource.templateSrv.timeRange.to.unix() * 1000;
                        var from = this.datasource.templateSrv.timeRange.from.unix() * 1000;
                        var data = '{"queries":[{"queryType":"query","target":"","refId":"A","type":"histograms","datasourceId":' + this.datasource.id + ',"query":"' + query + '","xcol":"","ycol":""}],"from":"' + from + '","to":"' + to + '"}';
                        this.datasource.backendSrv.datasourceRequest({
                            url: '/api/tsdb/query',
                            method: 'POST',
                            data: data
                        }).then(function (res) {
                            _this2.target.logEntries = res.data.results.A.meta.count;
                            _this2.target.totalPages = Math.ceil(_this2.target.logEntries / _this2.target.logsPerPage);
                        });
                    }
                }, {
                    key: 'queryChanged',
                    value: function queryChanged() {
                        this.getHistograms();
                        this.refresh();
                    }
                }, {
                    key: 'previousPage',
                    value: function previousPage() {
                        if (this.target.currentPage > 1) {
                            this.target.currentPage = this.target.currentPage - 1;
                            this.queryChanged();
                        }
                    }
                }, {
                    key: 'nextPage',
                    value: function nextPage() {
                        if (this.target.currentPage < this.target.totalPages) {
                            this.target.currentPage = this.target.currentPage + 1;
                            this.queryChanged();
                        }
                    }
                }, {
                    key: 'goToPage',
                    value: function goToPage() {
                        this.target.currentPage = 1;
                        this.queryChanged();
                    }
                }]);

                return GenericDatasourceQueryCtrl;
            }(QueryCtrl));

            _export('GenericDatasourceQueryCtrl', GenericDatasourceQueryCtrl);

            GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
            //# sourceMappingURL=query_ctrl.js.map
        }
    };
});
//# sourceMappingURL=query_ctrl.js.map
