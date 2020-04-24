package main

type LogSource struct {
	Project  string `json:"project"`
	LogStore string `json:"logstore"`
	User     string `json:"user"`
	Password string `json:"password"`
}

type QueryInfo struct {
	QueryType   string `json:"type"`
	QueryMode   string `json:"mode"`
	Query       string `json:"query"`
	Xcol        string `json:"xcol"`
	Ycol        string `json:"ycol"`
	LogsPerPage int64  `json:"logsPerPage"`
	CurrentPage int64  `json:"currentPage"`
}
