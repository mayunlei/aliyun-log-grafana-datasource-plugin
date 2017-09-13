"use strict";

//var util = require('./util');

System.register(['./util', 'jquery'], function (_export, _context) {
    "use strict";

    var util, $, _createClass, API, LEN, defaultConfig, SClient, kk, getSortParamStr, getRealEndPoint, isIP;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_util) {
            util = _util.default;
        }, function (_jquery) {
            $ = _jquery.default;
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

            API = require('./api');
            LEN = 500;
            defaultConfig = {

                //requires
                accessId: '', //accessId
                accessKey: '', //accessKey
                endpoint: '', //sls service endpoint

                //optional
                timeout: 20000, //请求timeout时间, 默认: 20s

                signature_method: 'hmac-sha1', //签名计算方式，目前只支持'hmac-sha1', 默认: 'hmac-sha1'
                api_version: '0.3.0', //数据相关api version 默认 0.3.0

                logger: false //打印请求的详细信息, log4js 实例
            };

            _export('SClient', SClient = function () {
                function SClient(config) {
                    _classCallCheck(this, SClient);

                    Util.checkDefault(config, defaultConfig);
                    this.config = config;
                }

                _createClass(SClient, [{
                    key: 'requestData',
                    value: function requestData(mt, uri, hd, bd, fn, timeout) {
                        var config = this.config;

                        mt = mt.toUpperCase();

                        bd = bd || {};
                        bd['x-date'] = Util.getDate();
                        bd['APIVersion'] = config.api_version || '0.3.0';
                        bd['AccessKeyId'] = config.accessId;
                        bd['SignatureMethod'] = config.signature_method;
                        hd['User-Agent'] = "slsweb";

                        var sortStr = getSortParamStr(bd);

                        var signature = Util.signFn(config.accessKey, uri + '\n' + sortStr);

                        var url = uri + '?' + getSortParamStr(bd, true) + '&Signature=' + encodeURIComponent(signature);
                        var logger = config.logger;

                        var rEp = getRealEndPoint(config.endpoint, bd);

                        var vurl = rEp.endpoint + url;

                        hd['host'] = rEp.host;

                        //console.log('SLS_CLIENT_CALL: method:', mt, ', url:', vurl, ', headers:', hd, ', body:', bd.protobuf||null );

                        Util.httpReq(mt, vurl, hd, bd.protobuf || null, function (err, data, statusCode, headers) {

                            if (logger) {
                                logger.info('SLS_CLIENT_CALL: method:', mt, ', url:', vurl, ', headers:', hd, ', body:', Util.limitLen(bd, LEN), '---------RESPONSE---------\n err:', err, ', data:', Util.limitLen(data, LEN), ', contentLength:' + JSON.stringify(data).length + ', status:', statusCode, ', headers:', headers);
                            }
                            if (typeof data == 'string') {
                                try {
                                    data = JSON.parse(data);
                                } catch (e) {}
                            }

                            if (statusCode < 400) {
                                fn(err, data, statusCode, headers);
                            } else {
                                fn(err || data, data, statusCode, headers);
                            }
                        }, timeout || config.timeout);
                    }
                }]);

                return SClient;
            }());

            _export('SClient', SClient);

            ;

            //业务逻辑
            for (kk in API) {
                SClient.prototype[kk] = API[kk];
            }
            ;

            getSortParamStr = function getSortParamStr(obj, flag) {
                var t = [];
                if (flag) {
                    for (var k in obj) {
                        if (k == 'protobuf' || obj.APIVersion >= '0.3.0' && k == 'Project') continue;
                        t.push(k + '=' + encodeURIComponent(obj[k]));
                    }
                } else {
                    for (var k in obj) {
                        if (k == 'protobuf' || obj.APIVersion >= '0.3.0' && k == 'Project') continue;
                        t.push(k + '=' + obj[k]);
                    }
                }
                t.sort();
                return t.join('&');
            };

            getRealEndPoint = function getRealEndPoint(url, obj) {

                //test
                //return {endpoint:  'http://service.sls-stg.aliyun-inc.com:179/', host: '44.sls-stg.aliyun-inc.com:179'};

                var v = Util.parseURL(url);
                var p = obj['Project'];

                if (obj.APIVersion >= '0.3.0') {

                    var host = p + '.' + v.hostname;

                    if (isIP(v.hostname)) {
                        url = v.protocol + '//' + v.host + v.pathname;
                    } else {
                        url = v.protocol + '//' + p + '.' + v.host + v.pathname;
                    }

                    return {
                        endpoint: url.replace(/\/$/g, ''),
                        host: host
                    };
                } else {
                    return { endpoint: url.replace(/\/$/g, ''), host: v.hostname };
                }
            };

            isIP = function isIP(s) {
                return (/^[\d.]+$/.test(s)
                );
            };
        }
    };
});
//# sourceMappingURL=index.js.map
