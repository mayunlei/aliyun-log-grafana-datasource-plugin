import {QueryCtrl} from 'grafana/app/plugins/sdk';
import './css/query-editor.css!';

export class GenericDatasourceQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  scope: any;



  /** @ngInject */
  constructor($scope, $injector) {
    super($scope, $injector);
    this.target.target = this.target.ycol;

    this.target.type = this.panel.type || 'timeserie';

    this.target.logsPerPage = 100;
    this.target.currentPage = 1;

    this.getHistograms();
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

  getHistograms(){
    const query = this.datasource.replaceQueryParameters(this.target, {"scopedVars":""});
    const to = this.datasource.templateSrv.timeRange.to.unix()*1000;
    const from = this.datasource.templateSrv.timeRange.from.unix()*1000;
    const data = '{"queries":[{"queryType":"query","target":"","refId":"A","type":"histograms","datasourceId":'
        +this.datasource.id+',"query":"'+query+'","xcol":"","ycol":""}],"from":"'+from+'","to":"'+to+'"}';
    this.datasource.backendSrv.datasourceRequest({
      url: '/api/tsdb/query',
      method: 'POST',
      data: data
    }).then((res: any) => {
      this.target.logEntries = res.data.results.A.meta.count;
      this.target.totalPages = Math.ceil(this.target.logEntries/this.target.logsPerPage)
    });
  }

  queryChanged() {
    this.getHistograms();
    this.refresh();
  }

  previousPage() {
    if (this.target.currentPage>1){
      this.target.currentPage = this.target.currentPage - 1;
      this.queryChanged()
    }
  }

  nextPage() {
    if (this.target.currentPage<this.target.totalPages){
      this.target.currentPage = this.target.currentPage + 1;
      this.queryChanged()
    }
  }

  goToPage(){
    this.target.currentPage = 1;
    this.queryChanged();
  }
}
