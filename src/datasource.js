import _ from "lodash";
import {SLS} from "./sls.js";

export class GenericDatasource {
    constructor(instanceSettings, $q, backendSrv, templateSrv) {
        this.type = instanceSettings.type;
        this.url = instanceSettings.url;
        this.name = instanceSettings.name;
        this.projectName = instanceSettings.jsonData.project;
        this.logstore = instanceSettings.jsonData.logstore;
        //this.endpoint = instanceSettings.jsonData.endpoint;
        this.user = instanceSettings.jsonData.user;
        this.password = instanceSettings.jsonData.password;
        this.q = $q;
        this.backendSrv = backendSrv;
        this.templateSrv = templateSrv;
        this.withCredentials = instanceSettings.withCredentials;
        this.headers = {'Content-Type': 'application/json'};
        if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
            this.headers['Authorization'] = instanceSettings.basicAuth;
        }
        this.defaultConfig = {

            //requires
            accessId: this.user,                  //accessId
            accessKey: this.password,                 //accessKey
            //endpoint: this.endpoint,            //sls service endpoint

            //optional
            timeout: 20000,         //请求timeout时间, 默认: 20s


            signature_method: 'hmac-sha1', //签名计算方式，目前只支持'hmac-sha1', 默认: 'hmac-sha1'
            api_version: '0.3.0',  //数据相关api version 默认 0.3.0

            logger: false   //打印请求的详细信息, log4js 实例
        };

    }

    query(options) {
        console.log("hello")
        let requests = []
        let slsclient = new SLS(this.defaultConfig, this.backendSrv, this.url);
        let promise = Promise.resolve();
        _(options.targets).forEach(target => {
            if (target.hide) {
                return
            }
            let request = slsclient.GetData(this.projectName, {
                "Category": this.logstore,
                "Topic": "",
                "BeginTime": parseInt(options.range.from._d.getTime() / 1000),
                "EndTime": parseInt(options.range.to._d.getTime() / 1000),
                "Query": target.query,
                "Reverse": "false",
                "Lines": "100",
                "Offset": "0"
            })
                .then(result => {
                    if (!(result.data && result.data.GetData && result.data.GetData.Data)) {
                        return Promise.reject(new Error("this promise is rejected"));
                    }

                    result.time_col = target.xcol
                    result.ycol = _.reduce(target.ycol.split(","), (result, data) => {
                        data = data.split(' ').join('')
                        if (data) {
                            result.push(data)
                        }
                        return result
                    }, [])
                    return result
                })
                .then(result => {
                    console.log("test")
                    let resResult = []
                    _(result.ycol).forEach(col => {
                        let datapoints = []

                        _.sortBy(result.data.GetData.Data, [result.time_col]).forEach(data => {
                            const _time = data[result.time_col]
                            const time = parseInt(_time) * 1000
                            const value = parseInt(data[col])
                            datapoints.push([value, time])
                        })
                        resResult.push({
                            "target": col,
                            "datapoints": datapoints
                        })
                    })
                    return resResult

                });
            requests.push(request)

        })

        return Promise.all(requests
            .map(p => p.catch(e => e)))
            .then(requests => {
                console.log("1:", requests)

                const _t = _.reduce(requests, (result, data) => {
                    _(data).forEach(t => result.push(t))
                    return result
                }, [])
                console.log("1:", _t)
                return {
                    data: _t
                }

            }) // 1,Error: 2,3
            .catch(err => {
                if (err.data && err.data.message) {
                    return {status: "error", message: err.data.message, title: "Error"};
                } else {
                    return {status: "error", message: err.status, title: "Error"};
                }
            });
    }

    testDatasource() {
        let slsclient = new SLS(this.defaultConfig, this.backendSrv, this.url);
        return slsclient.GetData(this.projectName,
            {
                "Category": this.logstore,
                "Topic": "",
                "BeginTime": parseInt((new Date().getTime() / 1000) - 900),
                "EndTime": parseInt(new Date().getTime() / 1000),
                "Query": "",
                "Reverse": "false",
                "Lines": "10",
                "Offset": "0"
            }).then(function (result) {

            return {status: "success", message: "Database Connection OK", title: "Success"};
        }, function (err) {
            console.log("testDataSource err", err);
            if (err.data && err.data.message) {
                return {status: "error", message: err.data.message, title: "Error"};
            } else {
                return {status: "error", message: err.status, title: "Error"};
            }

        });


    }

    annotationQuery(options) {
        let query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
        let annotationQuery = {
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
        }).then(result => {
            return result.data;
        });
    }

    metricFindQuery(query) {

        let interpolated = {
            target: this.templateSrv.replace(query, null, 'regex')
        };

        return this.doRequest({
            url: this.url + '/search',
            data: interpolated,
            method: 'POST',
        }).then(this.mapToTextValue);
    }

    mapToTextValue(result) {
        return _.map(result.data, (d, i) => {
            if (d && d.text && d.value) {
                return {text: d.text, value: d.value};
            } else if (_.isObject(d)) {
                return {text: d, value: i};
            }
            return {text: d, value: d};
        });
    }

    doRequest(options) {
        options.withCredentials = this.withCredentials;
        options.headers = this.headers;

        return this.backendSrv.datasourceRequest(options);
    }

    buildQueryParameters(options) {
        //remove placeholder targets
        options.targets = _.filter(options.targets, target => {
            return target.target !== 'select metric';
        });

        let targets = _.map(options.targets, target => {
            return {
                target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie'
            };
        });

        options.targets = targets;

        return options;
    }
}
