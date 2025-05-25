from fastapi import FastAPI, Depends, HTTPException, APIRouter, Header, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import List, Any
from fastapi.middleware.cors import CORSMiddleware
from proxmoxer import ProxmoxAPI

from app.services.pve_service import get_pve_api, list_nodes, create_container
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Proxmox VE API Backend")

origins = [origin.strip() for origin in settings.cors_origins.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-API-Key"],
)

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == settings.api_key:
        return api_key
    else:
        raise HTTPException(
            status_code=403, detail="无法验证凭据"
        )

api_router = APIRouter(prefix="/api", dependencies=[Depends(get_api_key)])

def get_api():
    api = get_pve_api()
    if api is None:
        raise HTTPException(status_code=503, detail="无法连接到 Proxmox VE，请检查后端配置和 PVE 服务状态。")
    return api

class NodeInfo(BaseModel):
    node: str
    status: str
    cpu: float
    mem: int
    maxmem: int
    disk: int | None = None
    maxdisk: int | None = None
    uptime: int

class ContainerConfig(BaseModel):
    ostemplate: str = Field(..., description="模板路径，例如: local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz")
    vmid: int = Field(..., gt=0, description="唯一的虚拟机 ID")
    hostname: str = Field(..., min_length=1, description="容器的主机名")
    password: str = Field(..., min_length=6, description="容器的 root 密码")
    net0: str = Field(..., description="网络配置，例如: name=eth0,bridge=vmbr0,ip=dhcp")
    storage: str = Field(..., description="存储位置，例如: local-lvm")
    cores: int = Field(1, gt=0, description="CPU 核心数")
    memory: int = Field(512, gt=127, description="内存大小 (MB)")
    swap: int = Field(512, ge=0, description="SWAP 大小 (MB)")

class CreateResponse(BaseModel):
    message: str
    data: Any

@api_router.get("/nodes",
                summary="获取所有 PVE 节点列表",
                response_model=List[NodeInfo],
                tags=["Nodes"])
def get_nodes_route(api: ProxmoxAPI = Depends(get_api)):
    try:
        nodes = list_nodes(api)
        return nodes
    except Exception as e:
        logger.error(f"获取节点时出错: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取节点列表时发生内部错误: {e}")

@api_router.post("/nodes/{node_name}/lxc",
                 summary="在指定节点上创建 LXC 容器",
                 response_model=CreateResponse,
                 status_code=201,
                 tags=["Containers"])
def post_lxc_route(node_name: str, config: ContainerConfig, api: ProxmoxAPI = Depends(get_api)):
    try:
        try:
            config_dict = config.model_dump()
        except AttributeError:
            config_dict = config.dict()

        logger.info(f"接收到创建容器请求，节点: {node_name}, 配置: {config_dict}")
        result = create_container(api, node_name, config_dict)
        return {"message": "容器创建任务已成功启动", "data": result}
    except Exception as e:
        logger.error(f"创建容器时出错 (节点: {node_name}): {e}", exc_info=True)
        detail = str(e)
        if "parameter verification failed" in detail:
            raise HTTPException(status_code=400, detail=f"参数验证失败: {detail}")
        if "already exists" in detail:
            raise HTTPException(status_code=409, detail=f"VMID {config.vmid} 可能已存在: {detail}")
        raise HTTPException(status_code=500, detail=f"创建容器时发生内部错误: {detail}")

app.include_router(api_router)

@app.get("/", summary="API 健康检查", tags=["Root"])
def read_root():
    return {"status": "Proxmox VE API Backend is running"}
