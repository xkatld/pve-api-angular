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
~~~
# 使用教程
API 示例：

以下是每个 API 端点的示例请求。你可以使用 curl 或任何 API 测试工具（如 Postman）来发送这些请求。

创建容器：

~~~
curl -X POST http://localhost:8080/container/create \
-H "Content-Type: application/json" \
-d '{
  "node": "pve",
  "storage": "local-lvm",
  "template": "ubuntu-20.04-standard_20.04-1_amd64.tar.gz",
  "hostname": "my-container",
  "memory": 512,
  "cpu": 1,
  "disk": 8
}'
~~~
这将创建一个新的容器，并返回创建成功的消息和 VMID。

设置容器资源：

~~~
curl -X POST http://localhost:8080/container/100/resources \
-H "Content-Type: application/json" \
-d '{
  "cpu": 2,
  "memory": 1024,
  "disk": 16
}'
~~~
这将为 VMID 为 100 的容器设置 2 个 CPU 核心，1024MB 内存，和 16GB 硬盘。

设置容器网络：

~~~
curl -X POST http://localhost:8080/container/100/network \
-H "Content-Type: application/json" \
-d '{
  "bandwidth": 10,
  "ssh_port": 1050,
  "nat_start": 26300,
  "nat_end": 26399
}'
~~~
这将为 VMID 为 100 的容器设置 10Mbps 的带宽限制，SSH 端口为 1050，NAT 端口范围为 26300-26399。
