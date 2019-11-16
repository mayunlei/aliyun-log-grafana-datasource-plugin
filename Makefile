all: grunt build

grunt:
	grunt

build:
	go build -i -o ./dist/aliyun-log-plugin_darwin_amd64 ./pkg
	go build -i -o ./dist/aliyun-log-plugin_linux_amd64 ./pkg
	go build -i -o ./dist/aliyun-log-plugin_windows_amd64.exe ./pkg