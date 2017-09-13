/*! grafana - v4.4.3 - 2017-08-07
 * Copyright (c) 2017 Torkel Ödegaard; Licensed Apache-2.0 */
import {QueryCtrl} from 'app/plugins/sdk';
import _ from "lodash";
export class SlsBucketAggCtrl  extends QueryCtrl{

    constructor($scope, $injector) {
        super($scope,$injector);
        this.target.bucketAggs;
        $scope.orderByOptions=[{text:"Doc Count",value:"_count"},{text:"Term value",value:"_term"}];
        $scope.orderOptions=[{text:"Top",value:"desc"},{text:"Bottom",value:"asc"}];
        $scope.getSizeOptions = [{text:"No limit",value:"0"},{text:"1",value:"1"},{text:"2",value:"2"},{text:"3",value:"3"},{text:"5",value:"5"},{text:"10",value:"10"},{text:"15",value:"15"},{text:"20",value:"20"}];
        console.log("SlsBucketAgg");
    }
    getBucketAggTypes() {
        return [{text:"Terms",value:"terms",requiresField:!0},{text:"Filters",value:"filters"},{text:"Geo Hash Grid",value:"geohash_grid",requiresField:!0},{text:"Date Histogram",value:"date_histogram",requiresField:!0}];
    }
    onChangeInternal (){
        this.oChange;
        this.onTypeChanged = function(){
            switch ($scope.agg.settings={}, $scope.showOptions != !1, $scope.agg.type) {
                case "Time": 
                case "Field": 
                    delete a.agg.query;
                    a.agg.field = "select field";
                 break; 

            }
        }
    }
}

SlsBucketAggCtrl.templateUrl = 'partials/bucket_agg.html';