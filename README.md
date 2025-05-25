# PVE Manager - Proxmox VE 网页管理界面 (FastAPI + Angular)

这是一个全栈项目，旨在提供一个现代化的 Web 用户界面，用于管理 [Proxmox VE 8.x](https://www.proxmox.com/en/proxmox-ve) 环境。

它利用 Python FastAPI 提供后端 API 服务，并使用 Angular 构建前端用户界面。

## ✨ 主要功能

* **后端 (FastAPI)**:
    * 通过 `proxmoxer` 库与 Proxmox VE API 安全交互。
* **前端 (Angular)**:
    * 现代化的单页应用 (SPA) 界面。
    * 使用 Bootstrap 5 进行样式设计。

## ⚙️ 环境要求

* Proxmox VE 8.x
* Python 3.10+
* Node.js 16+

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
│   │   ├── assets/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## 🚀 安装与设置

### 1. 克隆项目

```bash
git clone https://github.com/xkatld/pve-api-angular
cd pve-api-angular
```

### 2. 设置后端 (FastAPI)

```bash
# 进入后端目录
cd backend

# (强烈建议) 创建并激活 Python 虚拟环境
python -m venv venv
source venv/bin/activate

# 安装 Python 依赖
pip install -r requirements.txt

# 并填入你的 Proxmox VE 连接信息:(在 backend 目录下)
# PVE_HOST=your_proxmox_host_ip_or_domain
# PVE_USER=your_user@pam  # 例如 root@pam 或 myuser@pve
# PVE_PASSWORD=your_password
```

**`.env` 文件示例:**

```dotenv
PVE_HOST=192.168.1.10
PVE_USER=root@pam
PVE_PASSWORD=YourSecretPassword!
```

### 3. 设置前端 (Angular)

```bash
# 返回项目根目录，然后进入前端目录
cd frontend

# 安装 Node.js 依赖
npm install
```

## 💻 运行开发环境

你需要**同时运行**后端和前端两个服务。请打开**两个终端**窗口：

**终端 1: 启动后端 (FastAPI)**

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端 API 将在 `http://0.0.0.0:8000` 启动。`--reload` 会在代码更改时自动重启。

**终端 2: 启动前端 (Angular)**

```bash
cd frontend

# 运行 ng serve 并监听 0.0.0.0 以便从其他机器访问
npm start -- --host 0.0.0.0
```

Angular 开发服务器将启动，并监听 `http://0.0.0.0:4200`。

## 📚 API 文档

当后端服务运行时，你可以通过浏览器访问以下地址查看自动生成的 API 文档：

* **Swagger UI**: `http://127.0.0.1:8000/docs`
* **ReDoc**: `http://127.0.0.1:8000/redoc`
