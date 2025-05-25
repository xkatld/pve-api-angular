# PVE API - Proxmox VE 管理后端

这是一个基于 Python `FastAPI` 构建的后端 API 项目，旨在提供一个便捷的接口来管理 [Proxmox VE 8.x](https://www.proxmox.com/en/proxmox-ve) 环境中的资源，特别是 LXC 容器。

## ✨ 功能特性

* **现代 Web 框架**: 使用 `FastAPI` 构建，提供高性能和自动 API 文档。
* **Proxmox VE 集成**: 通过 `proxmoxer` 库与 Proxmox VE API 进行交互。
* **核心功能**:
    * 获取 PVE 节点列表。
    * 在指定节点上创建 LXC 容器。
* **配置灵活**: 使用 `.env` 文件和 `pydantic-settings` 管理 PVE 连接信息。
* **结构清晰**: 模块化的项目结构，易于扩展和维护。

## ⚙️ 环境要求

* Proxmox VE 8.x
* Python 3.10+

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/xkatld/pve-api
cd pve-api
```

### 2. 安装依赖

建议在虚拟环境中进行安装：

```bash
pip install -r requirements.txt
```

### 3. 配置环境

在项目根目录下创建一个名为 `.env` 的文件，并填入你的 Proxmox VE 连接信息：

```dotenv
PVE_HOST=your_proxmox_host_ip_or_domain
PVE_USER=your_user@pam  # 或 @pve 等认证域
PVE_PASSWORD=your_password
```

## 运行应用

使用 `uvicorn` 启动 FastAPI 应用：

```bash
uvicorn app.main:app --host 0.0.0.0 --reload
```

## 📚 API 文档与使用

启动应用后，你可以通过浏览器访问以下地址查看自动生成的 API 文档：

* **Swagger UI**: `http://127.0.0.1:8000/docs`
* **ReDoc**: `http://127.0.0.1:8000/redoc`

### 当前可用端点：

* `GET /nodes`: 获取所有 PVE 节点的信息。
* `POST /nodes/{node_name}/lxc`: 在指定的 `node_name` 节点上创建一个新的 LXC 容器。

**创建容器示例 (`POST /nodes/pve/lxc`) 请求体:**

```json
{
  "ostemplate": "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz",
  "vmid": 101,
  "hostname": "my-new-container",
  "password": "secure_password",
  "net0": "name=eth0,bridge=vmbr0,ip=dhcp",
  "storage": "local-lvm",
  "cores": 1,
  "memory": 512,
  "swap": 512
}
```

## 🏗️ 项目结构

```
pve-api/
├── app/
│   ├── __init__.py
│   ├── main.py         # FastAPI 应用、路由定义
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py   # 配置加载
│   └── services/
│       ├── __init__.py
│       └── pve_service.py  # PVE 连接与服务逻辑
├── .env                # 环境变量 (需手动创建)
└── requirements.txt    # Python 依赖
```

## 🤝 贡献

欢迎提交 Pull Requests 或 Issues 来改进这个项目。
