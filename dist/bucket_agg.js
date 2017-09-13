"use strict";

System.register(["app/plugins/sdk", "lodash"], function (_export, _context) {
    "use strict";

    var QueryCtrl, _, _createClass, SlsBucketAggCtrl;

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
        }, function (_lodash) {
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

            _export("SlsBucketAggCtrl", SlsBucketAggCtrl = function (_QueryCtrl) {
                _inherits(SlsBucketAggCtrl, _QueryCtrl);

                function SlsBucketAggCtrl($scope, $injector) {
                    _classCallCheck(this, SlsBucketAggCtrl);

                    var _this = _possibleConstructorReturn(this, (SlsBucketAggCtrl.__proto__ || Object.getPrototypeOf(SlsBucketAggCtrl)).call(this, $scope, $injector));

                    _this.target.bucketAggs;
                    $scope.orderByOptions = [{ text: "Doc Count", value: "_count" }, { text: "Term value", value: "_term" }];
                    $scope.orderOptions = [{ text: "Top", value: "desc" }, { text: "Bottom", value: "asc" }];
                    $scope.getSizeOptions = [{ text: "No limit", value: "0" }, { text: "1", value: "1" }, { text: "2", value: "2" }, { text: "3", value: "3" }, { text: "5", value: "5" }, { text: "10", value: "10" }, { text: "15", value: "15" }, { text: "20", value: "20" }];
                    console.log("SlsBucketAgg");
                    return _this;
                }

                _createClass(SlsBucketAggCtrl, [{
                    key: "getBucketAggTypes",
                    value: function getBucketAggTypes() {
                        return [{ text: "Terms", value: "terms", requiresField: !0 }, { text: "Filters", value: "filters" }, { text: "Geo Hash Grid", value: "geohash_grid", requiresField: !0 }, { text: "Date Histogram", value: "date_histogram", requiresField: !0 }];
                    }
                }, {
                    key: "onChangeInternal",
                    value: function onChangeInternal() {
                        this.oChange;
                        this.onTypeChanged = function () {
                            switch ($scope.agg.settings = {}, $scope.showOptions != !1, $scope.agg.type) {
                                case "Time":
                                case "Field":
                                    delete a.agg.query;
                                    a.agg.field = "select field";
                                    break;

                            }
                        };
                    }
                }]);

                return SlsBucketAggCtrl;
            }(QueryCtrl));

            _export("SlsBucketAggCtrl", SlsBucketAggCtrl);

            SlsBucketAggCtrl.templateUrl = 'partials/bucket_agg.html';
        }
    };
});
//# sourceMappingURL=bucket_agg.js.map
