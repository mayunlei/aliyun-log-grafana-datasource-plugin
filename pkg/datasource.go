package main

import (
	"encoding/json"
	"errors"
	"sort"
	"strconv"
	"strings"

	sls "github.com/aliyun/aliyun-log-go-sdk"
	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
	"golang.org/x/net/context"
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
		ds.logger.Error("Unmarshal logSource", "error ", err)
		return nil, err
	}

	accessKeyId := tsdbReq.Datasource.DecryptedSecureJsonData["accessKeyId"]
	if len(accessKeyId) == 0 {
		ds.logger.Error("AccessKeyID cannot be null")
		return nil, errors.New("AccessKeyID cannot be null")
	}

	accessKeySecret := tsdbReq.Datasource.DecryptedSecureJsonData["accessKeySecret"]
	if len(accessKeySecret) == 0 {
		ds.logger.Error("AccessKeySecret cannot be null")
		return nil, errors.New("AccessKeySecret cannot be null")
	}

	client := &sls.Client{
		Endpoint:        tsdbReq.Datasource.Url,
		AccessKeyID:     accessKeyId,
		AccessKeySecret: accessKeySecret,
	}

	queries := tsdbReq.Queries

	from := tsdbReq.TimeRange.FromEpochMs / 1000
	to := tsdbReq.TimeRange.ToEpochMs / 1000

	var results []*datasource.QueryResult

	ch := make(chan *datasource.QueryResult, len(queries))

	for _, query := range queries {
		go ds.QueryLogs(ch, query, client, logSource, from, to)
	}
	c := 0
	for result := range ch {
		c = c + 1
		if c == len(queries) {
			close(ch)
		}
		results = append(results, result)
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

func (ds *SlsDatasource) ParseTimestamp(v string) (int64, error) {
	floatV, err := strconv.ParseFloat(v, 10)
	if err != nil {
		return 0, err
	}
	int64V := int64(floatV)
	return int64V * 1000, nil
}

func (ds *SlsDatasource) SortLogs(logs []map[string]string, xcol string) {
	sort.Slice(logs, func(i, j int) bool {
		timestamp1, err := ds.ParseTimestamp(logs[i][xcol])
		if err != nil {
			ds.logger.Error("SortLogs1", "error ", err)
		}
		timestamp2, err := ds.ParseTimestamp(logs[j][xcol])
		if err != nil {
			ds.logger.Error("SortLogs2", "error ", err)
		}
		if timestamp1 < timestamp2 {
			return true
		}
		return false
	})
}

func (ds *SlsDatasource) QueryLogs(ch chan *datasource.QueryResult, query *datasource.Query, client *sls.Client, logSource *LogSource, from int64, to int64) {
	modelJson := query.ModelJson

	queryInfo := &QueryInfo{}
	err := json.Unmarshal([]byte(modelJson), &queryInfo)
	if err != nil {
		ds.logger.Error("Unmarshal queryInfo", "error ", err)
		ch <- &datasource.QueryResult{
			Error: err.Error(),
		}
		return
	}
	getLogsResp, err := client.GetLogs(logSource.Project, logSource.LogStore, "",
		from, to, queryInfo.Query, 0, 0, true)
	if err != nil {
		ds.logger.Error("GetLogs ", "query : ", queryInfo.Query, "error ", err)
		ch <- &datasource.QueryResult{
			Error: err.Error(),
		}
		return
	}
	logs := getLogsResp.Logs

	var series []*datasource.TimeSeries
	var tables []*datasource.Table
	xcol := queryInfo.Xcol
	var ycols []string
	queryInfo.Ycol = strings.Replace(queryInfo.Ycol, " ", "", -1)
	isFlowGraph := strings.Contains(queryInfo.Ycol, "#:#")
	if isFlowGraph {
		ycols = strings.Split(queryInfo.Ycol, "#:#")
	} else {
		ycols = strings.Split(queryInfo.Ycol, ",")
	}
	if isFlowGraph {
		ds.BuildFlowGraph(ch, logs, xcol, ycols, query.RefId)
		return
	} else if xcol == "pie" {
		ds.BuildPieGraph(ch, logs, xcol, ycols, query.RefId)
		return
	} else if xcol != "" && xcol != "map" && xcol != "pie" && xcol != "bar" && xcol != "table" {
		ds.BuildTimingGraph(ch, logs, xcol, ycols, &series)
	} else {
		ds.BuildTable(ch, logs, xcol, ycols, &tables)
	}
	ch <- &datasource.QueryResult{
		RefId:  query.RefId,
		Series: series,
		Tables: tables,
	}
}

func (ds *SlsDatasource) BuildFlowGraph(ch chan *datasource.QueryResult, logs []map[string]string, xcol string, ycols []string, refId string) {
	ds.SortLogs(logs, xcol)
	if len(ycols) < 2 {
		ch <- &datasource.QueryResult{
			Error: "The len of ycols must greater than 2 ",
		}
	}
	var set map[string]bool
	set = make(map[string]bool)
	for _, alog := range logs {
		set[alog[ycols[0]]] = true
	}
	var series []*datasource.TimeSeries
	for flowId := range set {
		var points []*datasource.Point
		for _, alog := range logs {
			if flowId == alog[ycols[0]] {
				if alog[ycols[1]] == "null" {
					continue
				}
				floatV, err := strconv.ParseFloat(alog[ycols[1]], 10)
				if err != nil {
					ds.logger.Error("ParseFloat ycols[1]", "error ", err)
					ch <- &datasource.QueryResult{
						Error: err.Error(),
					}
					return
				}
				floatV1, err := strconv.ParseFloat(alog[xcol], 10)
				if err != nil {
					ds.logger.Error("ParseFloat xcol", "error ", err)
					ch <- &datasource.QueryResult{
						Error: err.Error(),
					}
					return
				}
				int64V := int64(floatV1)
				point := &datasource.Point{
					Timestamp: int64V * 1000,
					Value:     floatV,
				}
				points = append(points, point)
			}
		}
		timeSeries := &datasource.TimeSeries{
			Name:   flowId,
			Points: points,
		}
		series = append(series, timeSeries)
	}
	ch <- &datasource.QueryResult{
		RefId:  refId,
		Series: series,
	}
}

func (ds *SlsDatasource) BuildPieGraph(ch chan *datasource.QueryResult, logs []map[string]string, xcol string, ycols []string, refId string) {
	if len(ycols) < 2 {
		ch <- &datasource.QueryResult{
			Error: "The len of ycols must greater than 2 ",
		}
	}
	var series []*datasource.TimeSeries
	for _, alog := range logs {
		if alog[ycols[1]] == "null" {
			continue
		}
		floatV, err := strconv.ParseFloat(alog[ycols[1]], 10)
		if err != nil {
			ds.logger.Error("ParseFloat ycols[1]", "error ", err)
			ch <- &datasource.QueryResult{
				Error: err.Error(),
			}
			return
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

	ch <- &datasource.QueryResult{
		RefId:  refId,
		Series: series,
	}
}

func (ds *SlsDatasource) BuildTimingGraph(ch chan *datasource.QueryResult, logs []map[string]string, xcol string, ycols []string, series *[]*datasource.TimeSeries) {
	ds.SortLogs(logs, xcol)
	for _, ycol := range ycols {
		var points []*datasource.Point
		for _, alog := range logs {
			var timestamp int64
			var value float64
			for k, v := range alog {
				if k == xcol {
					var err error
					timestamp, err = ds.ParseTimestamp(v)
					if err != nil {
						ds.logger.Error("ParseTimestamp v", "error ", err)
						ch <- &datasource.QueryResult{
							Error: err.Error(),
						}
						return
					}
				}
				if k == ycol {
					if v == "null" {
						continue
					}
					floatV, err := strconv.ParseFloat(v, 10)
					if err != nil {
						ds.logger.Error("ParseFloat v", "error ", err)
						ch <- &datasource.QueryResult{
							Error: err.Error(),
						}
						return
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
		*series = append(*series, timeSeries)
	}
}

func (ds *SlsDatasource) BuildTable(ch chan *datasource.QueryResult, logs []map[string]string, xcol string, ycols []string, tables *[]*datasource.Table) {
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
		if len(ycols) == 1 && ycols[0] == "" {
			for k, v := range alog {
				if k != "__source__" && k != "__time__" {
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
	*tables = append(*tables, table)
}
