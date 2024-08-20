# pve-api
Proxmox VE功能性api项目
# 环境
ProxmoxVE 8.2/go 1.19
~~~
apt update -y
apt install git golang nano -y
~~~
# 安装教程
~~~
git clone https://github.com/xkatld/pve-api.git
~~~
拉库后修改./pve-api/api/config.json文件填入地址，用户，密码即可
~~~
nano ./pve-api/api/config.json
~~~
运行启动后默认端口：8080
~~~
cd ./pve-api/api/
go mod tidy
go run main.go
~~~/
第一次运行会安装和创建数据库需要等待
# 使用教程
API 示例：

以下是每个 API 端点的示例请求。你可以使用 curl 或任何 API 测试工具（如 Postman）来发送这些请求。

1. 创建容器
```
POST /container/create
Content-Type: application/json

{
  "storage": "local-lvm",
  "template": "ubuntu-20.04-standard_20.04-1_amd64.tar.gz",
  "hostname": "test-container",
  "memory": 512,
  "cpu": 1,
  "disk": 8
}
```
curl 示例：
```bash
curl -X POST http://localhost:8080/container/create \
  -H "Content-Type: application/json" \
  -d '{
    "storage": "local-lvm",
    "template": "ubuntu-20.04-standard_20.04-1_amd64.tar.gz",
    "hostname": "test-container",
    "memory": 512,
    "cpu": 1,
    "disk": 8
  }'
```

2. 设置容器资源
```
POST /container/{id}/resources
Content-Type: application/json

{
  "cpu": 2,
  "memory": 1024,
  "disk": 16
}
```
curl 示例：
```bash
curl -X POST http://localhost:8080/container/100/resources \
  -H "Content-Type: application/json" \
  -d '{
    "cpu": 2,
    "memory": 1024,
    "disk": 16
  }'
```

3. 设置容器交换分区
```
POST /container/{id}/swap
Content-Type: application/json

{
  "size": 1024
}
```
curl 示例：
```bash
curl -X POST http://localhost:8080/container/100/swap \
  -H "Content-Type: application/json" \
  -d '{
    "size": 1024
  }'
```

4. 启动容器
```
POST /container/{id}/start
```
curl 示例：
```bash
curl -X POST http://localhost:8080/container/100/start
```

5. 停止容器
```
POST /container/{id}/stop
```
curl 示例：
```bash
curl -X POST http://localhost:8080/container/100/stop
```

6. 重启容器
```
POST /container/{id}/restart
```
curl 示例：
```bash
curl -X POST http://localhost:8080/container/100/restart
```

7. 删除容器
```
DELETE /container/{id}/delete
```
curl 示例：
```bash
curl -X DELETE http://localhost:8080/container/100/delete
```
