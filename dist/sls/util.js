"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var _typeof, crypto, parseURL, hasKey;

  return {
    setters: [],
    execute: function () {
      _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
      } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      crypto = require('crypto');
      parseURL = require('url').parse;


      module.exports = window.Util = {
        parseURL: parseURL,
        checkDefault: function checkDefault(config, defaultConfig) {
          for (var k in defaultConfig) {
            if (config[k] == null) config[k] = defaultConfig[k];
          }
          config.endpoint = config.endpoint.replace(/\/*$/, '');
        },

        /**
         * 服务端使用 node 的 httpRequest 发送请求
         * @param: mt   <String>
         * @param: url  <String>
         * @param: headers <Object>
         * @param: body <String>
         * @param: fn <Function> callback(err, text, status, headers)
         * @param: timeout <Integer> default:10000ms
         * @return: httpRequest
         */
        httpReq: function httpReq(mt, url, headers, body, fn, timeout) {

          var urlinfo = parseURL(url, false);
          mt = mt.toLowerCase();

          var params = urlinfo.query;
          if (params) {
            params = '?' + params;
          } else {
            params = "";
          }

          var encode = 'utf8';
          if (body && !hasKey(headers, 'content-length')) {
            if (body instanceof Buffer) {
              encode = 'binary';
              headers['content-length'] = body.length;
            } else headers['content-length'] = Buffer.byteLength(body, 'utf8');
          }

          var opt = {
            method: mt,
            url: 'http://' + urlinfo.hostname + ':' + (urlinfo.port || 80) + urlinfo.pathname + params,
            headers: headers

          };
          return $.ajax(opt);
        },

        signFn: function signFn(accessKey, str) {
          var hmac = crypto.createHmac('sha1', accessKey);
          return hmac.update(str, 'utf8').digest('base64');
        },

        md5Fn: function md5Fn(s) {
          if (s) return crypto.createHash('md5').update(s).digest('hex');else return '';
        },

        getDate: function getDate() {
          return new Date().toGMTString();
        },

        limitLen: function limitLen(data, limit, sub) {
          var dstr = (typeof data === 'undefined' ? 'undefined' : _typeof(data)) == 'object' ? JSON.stringify(data) : data;
          var len = dstr.length;
          sub = sub || limit;
          if (len > limit) {
            return dstr.substring(0, sub) + '...length:' + len + ';';
          } else {
            return data;
          }
        }
      };

      hasKey = function hasKey(m, key) {
        for (var k in m) {
          if (k.toLowerCase() == key.toLowerCase()) return true;
        }
        return false;
      };
    }
  };
});
//# sourceMappingURL=util.js.map
