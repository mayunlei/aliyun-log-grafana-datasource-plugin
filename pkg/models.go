package main

type LogSource struct {
	Project  string `json:"project"`
	LogStore string `json:"logstore"`
	User     string `json:"user"`
	Password string `json:"password"`
}

type QueryInfo struct {
	Query string `json:"query"`
	Xcol  string `json:"xcol"`
	Ycol  string `json:"ycol"`
}
