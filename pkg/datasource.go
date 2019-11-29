package main

import (
	"encoding/json"
	sls "github.com/aliyun/aliyun-log-go-sdk"
	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
	"golang.org/x/net/context"
	"strconv"
	"strings"
)

type SlsDatasource struct {
	plugin.NetRPCUnsupportedPlugin
	logger hclog.Logger
}

func (ds *SlsDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {

	ds.logger.Debug("Query", "datasource", tsdbReq.Datasource.Name, "TimeRange", tsdbReq.TimeRange)

	logSource := &LogSource{}

	err := json.Unmarshal([]byte(tsdbReq.Datasource.JsonData), &logSource)
	if err != nil {
		ds.logger.Error("", err)
		return nil, err
	}

	client := &sls.Client{
		Endpoint:        tsdbReq.Datasource.Url,
		AccessKeyID:     logSource.User,
		AccessKeySecret: logSource.Password,
	}

	queries := tsdbReq.Queries

	var results []*datasource.QueryResult

	for _, query := range queries {
		modelJson := query.ModelJson

		queryInfo := &QueryInfo{}
		err = json.Unmarshal([]byte(modelJson), &queryInfo)
		if err != nil {
			ds.logger.Error("", err)
			return nil, err
		}

		getLogsResp, err := client.GetLogs(logSource.Project, logSource.LogStore, "",
			tsdbReq.TimeRange.FromEpochMs/1000, tsdbReq.TimeRange.ToEpochMs/1000, queryInfo.Query, 0, 0, true)
		if err != nil {
			ds.logger.Error("", err)
			return nil, err
		}

		ds.logger.Debug("createResponse", "getLogsResp", getLogsResp)

		logs := getLogsResp.Logs

		var series []*datasource.TimeSeries
		var tables []*datasource.Table
		xcol := queryInfo.Xcol

		ycols := strings.Split(queryInfo.Ycol, ",")
		if xcol == "pie" {
			rt := &datasource.DatasourceResponse{}
			if len(ycols) < 2 {
				return rt, nil
			}
			for _, alog := range logs {
				floatV, err := strconv.ParseFloat(alog[ycols[1]], 10)
				if err != nil {
					ds.logger.Error("", err)
					return nil, err
				}
				point := &datasource.Point{
					Timestamp: 0,
					Value:     floatV,
				}
				var points []*datasource.Point
				points = append(points, point)
				timeSeries := &datasource.TimeSeries{
					Name:   alog[ycols[0]],
					Points: points,
				}
				series = append(series, timeSeries)

			}
			queryResult := &datasource.QueryResult{
				RefId:  "",
				Series: series,
			}
			rt.Results = append(results, queryResult)
			return rt, nil
		} else if xcol != "" && xcol != "map" && xcol != "pie" && xcol != "bar" && xcol != "table" {
			for _, ycol := range ycols {
				var points []*datasource.Point
				for _, alog := range logs {
					var timestamp int64
					var value float64
					for k, v := range alog {
						if k == xcol {
							floatV, err := strconv.ParseFloat(v, 10)
							if err != nil {
								ds.logger.Error("", err)
								return nil, err
							}
							int64V := int64(floatV)
							timestamp = int64V * 1000
						}
						if k == ycol {
							floatV, err := strconv.ParseFloat(v, 10)
							if err != nil {
								ds.logger.Error("", err)
								return nil, err
							}
							value = floatV
						}
					}
					point := &datasource.Point{
						Timestamp: timestamp,
						Value:     value,
					}
					points = append(points, point)
				}
				timeSeries := &datasource.TimeSeries{
					Name:   ycol,
					Points: points,
				}
				series = append(series, timeSeries)
			}
		} else {
			var columns []*datasource.TableColumn

			for _, ycol := range ycols {
				columns = append(columns, &datasource.TableColumn{
					Name: ycol,
				})
			}
			var rows []*datasource.TableRow
			for _, alog := range logs {
				var values []*datasource.RowValue
				for _, ycol := range ycols {
					for k, v := range alog {
						if k == ycol {
							values = append(values, ds.GetValue(v))
						}
					}
				}
				rows = append(rows, &datasource.TableRow{Values: values})
			}
			table := &datasource.Table{
				Columns: columns,
				Rows:    rows,
			}
			tables = append(tables, table)
		}

		queryResult := &datasource.QueryResult{
			RefId:  query.RefId,
			Series: series,
			Tables: tables,
		}
		results = append(results, queryResult)
	}
	rt := &datasource.DatasourceResponse{
		Results: results,
	}

	return rt, nil
}

func (ds *SlsDatasource) GetValue(v string) *datasource.RowValue {
	value := &datasource.RowValue{}
	intValue, err := strconv.ParseInt(v, 10, 10)
	if err == nil {
		value.Int64Value = intValue
		value.Kind = datasource.RowValue_TYPE_INT64
	} else {
		floatValue, err := strconv.ParseFloat(v, 10)
		if err == nil {
			value.DoubleValue = floatValue
			value.Kind = datasource.RowValue_TYPE_DOUBLE
		} else {
			value.StringValue = v
			value.Kind = datasource.RowValue_TYPE_STRING
		}
	}
	return value
}
