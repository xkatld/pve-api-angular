# Proxmox LXC Web 面板 (pve-lxc-web)

## 项目简介

Proxmox LXC Web 面板是一个 PHP 前端，用于通过 `pve-lxc-server` API 管理 Proxmox VE 中的 LXC 容器，支持管理多个后端 API 实例。

## 环境要求

* **后端服务**: 正在运行的 `pve-lxc-server` 实例。
* **Web 服务器**: 支持 PHP 的 Web 服务器 (如 Apache, Nginx)。
* **PHP 版本**: 建议 PHP 7.4 或更高版本。
* **PHP 扩展**: `session`, `curl`, `json`。

## 快速部署

1.  **获取代码**: 下载或克隆 `pve-lxc-web` 项目文件。
2.  **部署文件**: 将项目文件放置到 Web 服务器的文档根目录下。
3.  **配置管理员**:
    * 打开 `config.php` 文件。
    * 设置 `ADMIN_USERNAME` (管理员用户名)。
    * 设置 `ADMIN_PASSWORD_HASH`。使用 PHP 生成密码哈希值替换 `'您的安全密码'` 部分：
        ```php
        <?php echo password_hash('您的强密码', PASSWORD_DEFAULT); ?>
        ```
4.  **访问面板**: 通过浏览器访问您部署的 `pve-lxc-web` URL (例如 `http://您的服务器IP/pve-lxc-web/`)。

## 使用说明

1.  **登录**:
    使用您在 `config.php` 中设置的用户名和（明文）密码登录。

2.  **后端服务器管理**:
    * 首次登录后，请进入“后端管理”页面。
    * 添加您的 `pve-lxc-server` 实例信息，包括：
        * **唯一ID**: 自定义，例如 `pve1`。
        * **服务器名称**: 便于识别的名称。
        * **服务器URL**: `pve-lxc-server` 的访问地址 (例如 `http://192.168.1.100:8000`)。
        * **API密钥**: `pve-lxc-server` 中配置的 `GLOBAL_API_KEY`。
    * 后端配置保存在用户会话中。

3.  **选择操作后端**:
    * 在“仪表盘”或“后端管理”页面选择要操作的后端服务器。
    * 后续所有操作（节点查看、容器管理等）都将针对此选定后端。

4.  **主要功能**:
    * **仪表盘**: 选择活动后端。
    * **节点列表**: 查看所选后端节点状态。
    * **容器列表**: 查看和管理（启动、停止、删除、重建等）所选后端的容器。
    * **创建容器**: 在指定节点创建新容器。
    * **控制台**: 获取容器VNC控制台连接信息。

## 注意事项

* 建议为 `pve-lxc-web` 和 `pve-lxc-server` 启用 HTTPS。
* 实际的 VNC 控制台连接需要客户端软件或集成 Web VNC (如 noVNC)。
