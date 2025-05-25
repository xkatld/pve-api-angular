from fastapi import FastAPI, Depends, HTTPException, APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from proxmoxer import ProxmoxAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.pve_service import get_pve_api, list_nodes, create_container
from app.core.config import settings

app = FastAPI(title="Proxmox VE API Backend")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"], # 允许 Angular 开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 依赖注入 PVE API 连接
def get_api():
    api = get_pve_api()
    if api is None:
        raise HTTPException(status_code=503, detail="无法连接到 Proxmox VE")
    return api

# 创建一个带 /api 前缀的路由器
api_router = APIRouter(prefix="/api")

class NodeInfo(BaseModel):
    node: str
    status: str
    cpu: float
    mem: int
    maxmem: int
    disk: int
    maxdisk: int
    uptime: int

@api_router.get("/nodes", summary="获取所有节点列表", response_model=List[NodeInfo])
def get_nodes(api: ProxmoxAPI = Depends(get_api)):
    try:
        nodes_data = list_nodes(api)
        if isinstance(nodes_data, list):
            return nodes_data
        else:
            raise HTTPException(status_code=500, detail="获取节点数据格式不正确")
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

@api_router.post("/nodes/{node_name}/lxc", summary="创建 LXC 容器")
def post_lxc(node_name: str, config: ContainerConfig, api: ProxmoxAPI = Depends(get_api)):
    try:
        config_dict = config.model_dump() if hasattr(config, 'model_dump') else config.dict()
        result = create_container(api, node_name, config_dict)
        return {"message": "容器创建任务已启动", "data": result}
    except Exception as e:
        detail = str(e)
        if hasattr(e, 'response') and e.response is not None:
             try:
                 error_content = e.response.json()
                 detail = error_content.get('errors', str(e))
             except Exception:
                 detail = e.response.text or str(e)
        raise HTTPException(status_code=500, detail=detail)

# 将路由器包含到主应用中
app.include_router(api_router)

# 添加一个根路由用于测试
@app.get("/")
def read_root():
    return {"message": "欢迎访问 Proxmox VE API 后端"}
