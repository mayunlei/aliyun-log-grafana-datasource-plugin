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
        }).catch(error => {
            return { status: "failed", message: "Data source is not working", title: "Error" };
        });
    }
    annotationQuery(options) {
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
        }).then(result => {
            return result.data;
        });
    }
    metricFindQuery(query) {
        const interpolated = {
            target: this.templateSrv.replace(query, null, 'regex'),
            datasourceId: this.id,
            queryType: "search"
        };
        return this.doTsdbRequest({
            targets: [interpolated]
        }).then(response => {
            const res = handleTsdbResponse(response);
            if (res && res.data && res.data.length) {
                return res.data[0].rows;
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
        const targets = _.map(options.targets, target => {
            return {
                queryType: 'query',
                target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie',
                datasourceId: this.id,
                query: target.query,
                xcol: target.xcol,
                ycol: target.ycol
            };
        });
        options.targets = targets;
        return options;
    }
    getTagKeys(options) {
        return new Promise((resolve, reject) => {
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
        return new Promise((resolve, reject) => {
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
    console.log(res);
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