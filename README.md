# PVE Manager - Proxmox VE 管理 (FastAPI + Angular)

这是一个全栈项目，旨在提供一个现代化的 Web 界面来管理 [Proxmox VE 8.x](https://www.proxmox.com/en/proxmox-ve) 环境中的资源，特别是 LXC 容器。它由一个 Python `FastAPI` 后端和一个 `Angular` 前端组成。

## ✨ 功能特性

* **后端 (FastAPI)**:
    * 提供高性能的 RESTful API 接口。
    * 通过 `proxmoxer` 库与 Proxmox VE API 进行交互。
    * 核心功能：获取 PVE 节点列表、创建 LXC 容器等。
    * 使用 `.env` 文件和 `pydantic-settings` 管理 PVE 连接信息。
    * 提供自动 API 文档 (Swagger UI / ReDoc)。
* **前端 (Angular)**:
    * 使用现代 Angular 框架构建，提供动态、响应式的用户界面。
    * 通过 HTTP 服务与后端 API 通信。
    * 提供节点查看和 LXC 容器创建表单。
    * 易于扩展以支持更多 PVE 管理功能。

## ⚙️ 环境要求

* Proxmox VE 8.x
* Python 3.10+
* Node.js 16+ (建议 18 或更高版本)
* Angular CLI

## 🏗️ 项目结构

```
pve-api-angular/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── services/
│   │   │   └── pve_service.py
│   │   └── main.py
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.css
│   │   │   ├── app.component.html
│   │   │   ├── app.component.ts
│   │   │   ├── app.module.ts
│   │   │   └── pve-api.service.ts
│   │   ├── index.html
│   │   └── main.ts
│   ├── angular.json
│   └── package.json
└── README.md
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <你的项目仓库地址>
cd pve-api-angular
```

### 2. 设置后端

```bash
cd backend

# (建议) 创建并激活 Python 虚拟环境
# python -m venv venv
# source venv/bin/activate # 或者 .\venv\Scripts\activate (Windows)

# 安装依赖
pip install -r requirements.txt

# 创建 .env 文件 (在 backend 目录下)
cp .env.example .env # 如果你有 .env.example，否则手动创建

# 编辑 .env 文件并填入你的 PVE 信息:
# PVE_HOST=your_proxmox_host_ip_or_domain
# PVE_USER=your_user@pam
# PVE_PASSWORD=your_password
```

### 3. 设置前端

```bash
cd ../frontend

# 安装依赖
npm install
```

## 💻 运行开发环境

你需要**同时运行**后端和前端两个服务。请打开**两个终端**窗口：

**终端 1: 启动后端 (FastAPI)**

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端 API 将在 `http://0.0.0.0:8000` 启动。

**终端 2: 启动前端 (Angular)**

```bash
cd frontend
ng serve --open
```

Angular 开发服务器将启动，并自动在浏览器中打开 `http://localhost:4200`。前端应用将通过该地址访问后端 API。

## 📚 API 文档

当后端服务运行时，你可以通过浏览器访问以下地址查看自动生成的 API 文档：

* **Swagger UI**: `http://127.0.0.1:8000/docs`
* **ReDoc**: `http://127.0.0.1:8000/redoc`

## 🤝 贡献

欢迎提交 Pull Requests 或 Issues 来改进这个项目。
