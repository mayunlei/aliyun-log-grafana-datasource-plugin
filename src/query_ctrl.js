import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!';
import './bucket_agg';
//import './metric_agg';
export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector)  {
    super($scope, $injector);
    console.log('QueryCtrl');
    console.log($scope);
    this.scope = $scope;
    this.target.target = this.target.ycol;
    this.target.type = this.target.type || 'timeserie';
    this.target.bucketAggs=[];
  }

  getOptions(query) {
    return this.datasource.metricFindQuery(query || '');
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

