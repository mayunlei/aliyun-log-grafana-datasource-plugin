import _ from "lodash";
export class GenericDatasource {
    /** @ngInject */
    constructor(instanceSettings, backendSrv, templateSrv) {
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
    query(options) {
        const query = this.buildQueryParameters(options);
        query.targets = query.targets.filter(t => !t.hide);
        if (query.targets.length <= 0) {
            return Promise.resolve({ data: [] });
        }
        return this.doTsdbRequest(query).then(handleTsdbResponse);
    }
    testDatasource() {
        const to = new Date().getTime();
        const from = to - 5000;
        const str = '{"requestId":"Q100","timezone":"","range":{"from":"' + from + '","to":"' + to + '"},' +
            '"targets":[{"queryType":"query","target":"count","refId":"A","type":"timeserie","datasourceId":' + this.id + ',' +
            '"query":"* | select count(*) as count","ycol":"count"}]}';
        const query = JSON.parse(str);
        return this.doTsdbRequest(query).then(response => {
            if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
            }
            else {
                return { status: "failed", message: "Data source is not working", title: "Error" };
            }
        }).catch(() => {
            return { status: "failed", message: "Data source is not working", title: "Error" };
        });
    }
    annotationQuery(options) {
        const query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
        const annotationQuery = {
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
    metricFindQuery(q) {
        q = this.templateSrv.replace(q, {}, 'glob');
        const to = this.templateSrv.timeRange.to.unix() * 1000;
        const from = this.templateSrv.timeRange.from.unix() * 1000;
        const str = '{"requestId":"Q100","timezone":"","range":{"from":"' + from + '","to":"' + to + '"},' +
            '"targets":[{"queryType":"query","target":"query","refId":"A","type":"timeserie","datasourceId":' + this.id + ',' +
            '"query":"' + q + '"}]}';
        const query = JSON.parse(str);
        return this.doTsdbRequest(query).then(response => {
            const res = handleTsdbResponse(response);
            if (res && res.data && res.data.length) {
                let rows = res.data[0].rows;
                rows = rows.map(item => item[0]);
                return rows;
            }
            else {
                return [];
            }
        }).then(mapToTextValue);
    }
    doRequest(options) {
        options.withCredentials = this.withCredentials;
        options.headers = this.headers;
        return this.backendSrv.datasourceRequest(options);
    }
    doTsdbRequest(options) {
        const tsdbRequestData = {
            queries: options.targets,
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
    buildQueryParameters(options) {
        //remove placeholder targets
        options.targets = _.filter(options.targets, target => {
            return target.target !== 'select metric';
        });
        options.targets = _.map(options.targets, target => {
            return {
                queryType: 'query',
                target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                refId: target.refId,
                // hide: target.hide,
                type: target.type || 'timeserie',
                datasourceId: this.id,
                query: this.replaceQueryParameters(target, options),
                xcol: target.xcol,
                ycol: target.ycol,
                logsPerPage: target.logsPerPage,
                currentPage: target.currentPage,
                mode: target.mode
            };
        });
        return options;
    }
    replaceQueryParameters(target, options) {
        if (typeof (target.query) == "undefined") {
            target.query = "";
        }
        let query = this.templateSrv.replace(target.query, options.scopedVars, function (value, variable) {
            if (typeof value == "object" && (variable.multi || variable.includeAll)) {
                const a = [];
                value.forEach(function (v) {
                    if (variable.name == variable.label)
                        a.push('"' + variable.name + '":"' + v + '"');
                    else
                        a.push('"' + v + '"');
                });
                return a.join(" OR ");
            }
            if (_.isArray(value)) {
                return value.join(' OR ');
            }
            return value;
        });
        const re = /\$([0-9]+)([dmhs])/g;
        const reArray = query.match(re);
        _(reArray).forEach(function (col) {
            const old = col;
            col = col.replace("$", '');
            let sec = 1;
            if (col.indexOf("s") != -1)
                sec = 1;
            else if (col.indexOf("m") != -1)
                sec = 60;
            else if (col.indexOf("h") != -1)
                sec = 3600;
            else if (col.indexOf("d") != -1)
                sec = 3600 * 24;
            col = col.replace(/[smhd]/g, '');
            let v = parseInt(col);
            v = v * sec;
            console.log(old, v, col, sec, query);
            query = query.replace(old, v);
        });
        if (query.indexOf("#time_end") != -1) {
            query = query.replace("#time_end", parseInt(String(options.range.to._d.getTime() / 1000)));
        }
        if (query.indexOf("#time_begin") != -1) {
            query = query.replace("#time_begin", parseInt(String(options.range.from._d.getTime() / 1000)));
        }
        return query;
    }
    getTagKeys(options) {
        return new Promise((resolve) => {
            this.doRequest({
                url: this.url + '/tag-keys',
                method: 'POST',
                data: options
            }).then(result => {
                return resolve(result.data);
            });
        });
    }
    getTagValues(options) {
        return new Promise((resolve) => {
            this.doRequest({
                url: this.url + '/tag-values',
                method: 'POST',
                data: options
            }).then(result => {
                return resolve(result.data);
            });
        });
    }
}
export function handleTsdbResponse(response) {
    const res = [];
    _.forEach(response.data.results, r => {
        _.forEach(r.series, s => {
            res.push({ target: s.name, datapoints: s.points });
        });
        _.forEach(r.tables, t => {
            t.type = 'table';
            t.refId = r.refId;
            res.push(t);
        });
    });
    response.data = res;
    return response;
}
export function mapToTextValue(result) {
    return _.map(result, (d, i) => {
        if (d && d.text && d.value) {
            return { text: d.text, value: d.value };
        }
        else if (_.isObject(d)) {
            return { text: d, value: i };
        }
        return { text: d, value: d };
    });
}
//# sourceMappingURL=datasource.js.map