from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from app.services.pve_service import get_pve_api, list_nodes, create_container
from proxmoxer import ProxmoxAPI

app = FastAPI(title="Proxmox VE API Backend")

# 依赖注入 PVE API 连接
def get_api():
    api = get_pve_api()
    if api is None:
        raise HTTPException(status_code=503, detail="无法连接到 Proxmox VE")
    return api

@app.get("/nodes", summary="获取所有节点列表")
def get_nodes(api: ProxmoxAPI = Depends(get_api)):
    try:
        return list_nodes(api)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContainerConfig(BaseModel):
    ostemplate: str
    vmid: int
    hostname: str
    password: str
    net0: str
    storage: str
    cores: int = 1
    memory: int = 512
    swap: int = 512

@app.post("/nodes/{node_name}/lxc", summary="创建 LXC 容器")
def post_lxc(node_name: str, config: ContainerConfig, api: ProxmoxAPI = Depends(get_api)):
    try:
        result = create_container(api, node_name, config.dict())
        return {"message": "容器创建任务已启动", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 你可以添加更多路由来调用不同的 PVE API
