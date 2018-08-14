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
            api_version: '0.6.0',  //数据相关api version 默认 0.3.0

            logger: false   //打印请求的详细信息, log4js 实例
        };

    }

    query(options) {
        console.log("hello",options)
        let requests = []
        let slsclient = new SLS(this.defaultConfig, this.backendSrv, this.url);
        let promise = Promise.resolve();
        _(options.targets).forEach(target => {
            if (target.hide) {
                return
            }
        let query = this.templateSrv.replace(target.query, {}, function(value,variable, formatValue){
            console.log(typeof value);
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value == "object" && (variable.multi || variable.includeAll)) {
                let a = [];
                value.forEach(v => {
                    a.push('"'+variable.name+'":"'+v+'"');
                });
                return a.join(" OR ");
            }
            if (typeof value == "array" ||  (_.isArray(value)) ) {
                return value.join(' OR ')
            }
        });
        var re = /\$([0-9]+)([dmhs])/g;
        var reArray = query.match(re);
        _(reArray).forEach(col => {
            var old = col;
            col = col.replace("$",'');
            var sec = 1;
            if(col.indexOf("s") != -1)
                sec = 1;
            else if(col.indexOf("m") != -1)
                sec = 60;
            else if(col.indexOf("h") != -1)
                sec = 3600;
            else if(col.indexOf("d") != -1)
                sec = 3600*24;
            col = col .replace(/[smhd]/g,'');
            var v = parseInt(col);
            v = v* sec;
            console.log(old,v,col,sec,query);
            query = query.replace(old,v);
        });
            if(query.indexOf("#time_end") != -1){
                query = query.replace("#time_end",(parseInt(options.range.to._d.getTime() / 1000)));
            }
            if(query.indexOf("#time_begin") != -1){
                query = query.replace("#time_begin",(parseInt(options.range.from._d.getTime() / 1000)));
            }

            this.doRequest({
                url: "http://slstrack.cn-hangzhou.log.aliyuncs.com/logstores/grafana/track_ua.gif?APIVersion=0.6.0&&query="+query+"&project="+this.projectName+"&logstore="+this.logstore,
                method: 'GET',
            }).then(r=> {
                return r;
            });

            let request = slsclient.GetData(this.projectName,this.logstore, {
                "topic": "",
                "from": parseInt(options.range.from._d.getTime() / 1000),
                "to": parseInt(options.range.to._d.getTime() / 1000),
                "query": query,
                "reverse": "false",
                "lines": "100",
                "offset": "0"
            })
                .then(result => {
                    if (!(result.data)) {
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
                    if (result.ycol.length ==1 && result.ycol[0].lastIndexOf("#:#") != -1)
                    {
                        //group by  this col
                        let gbColArr = result.ycol[0].split("#:#");
                         
                        let gbRes = []
                        let mySet = new Set();
                        let lastX = "";
                        _(result.data).forEach( data => {
                                let row = data;
                                if (lastX == row[result.time_col])
                                {
                                    gbRes[gbRes.length-1][data[gbColArr[0]]] = data[gbColArr[1]];
                                }
                                else
                                {
                                    row [data[gbColArr[0]]] = data[gbColArr[1]];
                                    gbRes.push(row);
                                }
                                lastX = row[result.time_col];
                                mySet.add(row[gbColArr[0]]);
                            }
                        );
                        result.data = gbRes;
                        result.ycol = Array.from(mySet);
                        console.log("rewrite data", result.ycol,result.data);
                    }
                    return result
                })
                .then(result => {
                    console.log("test",result)
                    if(result.time_col == "map"){
                        return result.data;
                    }
                    let resResult = []
                    _(result.ycol).forEach(col => {
                        let datapoints = []
                        if(result.time_col != null && result.time_col!= "" && result.time_col != "pie" && result.time_col!='bar'){
                            _.sortBy(result.data, [result.time_col]).forEach(data => {
                                const _time = data[result.time_col]
                                    const time = parseInt(_time) * 1000
                                    if (data.hasOwnProperty(col))
                                     {
                                    let value = parseFloat(data[col])
                                    if(isNaN(data[col]))
                                        value = data[col];
                                    datapoints.push([value, time])
                                     }
                            })
                        }
                        else{
                            let count = 0;
                            _(result.data).forEach(data => {
                                const value = (data[col]);
                                datapoints.push([value, 1000*(parseInt(data["__time__"])-count)]);
                                count = count-1;
                            })
                        }
                        resResult.push({
                            "target": col,
                            "datapoints": datapoints
                        })
                    })
                    if(result.time_col == "pie" || result.time_col=='bar'){
                        let newtarget =[];
                        let datapoints =[];
                        let pieRes = [];
                        for(var i = 0;i < resResult[0].datapoints.length;++i){
                            for(var j = 0;j < resResult[1].datapoints[i].length;++j)
                            {
                                resResult[1].datapoints[i][j] = parseFloat(resResult[1].datapoints[i][j]);
                            }

                            pieRes.push({
                                "target" : resResult[0].datapoints[i][0],
                                "datapoints": [resResult[1].datapoints[i]]
                            });
                        }
                        return pieRes;
                    }
                    console.log(resResult);
                    return resResult

                });
            requests.push(request)

        })

        return Promise.all(requests
            .map(p => p.catch(e => e)))
            .then(requests => {
                console.log("1:", requests,requests[0])

                if(requests && requests[0]&& requests[0].data&& requests[0].data.errorCode&& requests[0].data.errorMessage) {
                    return {"data":{status: "error", message: requests[0].data.errorMessage, title: "Error1",data:""}};
                }
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
        return slsclient.GetData(this.projectName,this.logstore,
            {
                "topic": "",
                "from": parseInt((new Date().getTime() / 1000) - 900),
                "to": parseInt(new Date().getTime() / 1000),
                "query": "",
                "reverse": "false",
                "line": "10",
                "offset": "0"
            }).then(function (result) {

            return {status: "success", message: "LogService Connection OK", title: "Success"};
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

    metricFindQuery(options) {
        console.log(options);
        let requests = []
        let slsclient = new SLS(this.defaultConfig, this.backendSrv, this.url);
        let promise = Promise.resolve();
        let query = this.templateSrv.replace(options, {}, 'glob');

            let end =parseInt( (new Date()).getTime()/1000);
            let request = slsclient.GetData(this.projectName,this.logstore, {
                "topic": "",
                "from": end-86400,
                "to": end,
                "query": query,
                "reverse": "false",
                "lines": "100",
                "offset": "0"
            })
            .then( this.mapToTextValue);
        return request;
//result => {
//                if (!(result.data)) {
//                    return Promise.reject(new Error("this promise is rejected"));
//                }
//                var res = [];
//                _(result.data).forEach(row => {
//                    _.map(row, (k,v) => {
//                        console.log(k,v);
//                        if(v != "__time__" && v != "__source__")
//                            res.push(k);
//                    });
//                });
//                console.log(res);
//                return res;
//            }
    }

    mapToTextValue(result) {
        return _.map(result.data, (d, i) => {
            let x = "";
                    _.map(d, (k,v) => {
                        if(v != "__time__" && v != "__source__")
                            x = k;
                    });
            console.log(d,x,i);
            return {text: x, value: x};
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
