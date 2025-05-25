from proxmoxer import ProxmoxAPI
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_pve_api():
    try:
        proxmox = ProxmoxAPI(
            settings.pve_host,
            user=settings.pve_user,
            password=settings.pve_password,
            verify_ssl=settings.verify_ssl
        )
        proxmox.version.get()
        logger.info(f"成功连接到 Proxmox VE: {settings.pve_host}")
        return proxmox
    except Exception as e:
        logger.error(f"连接 Proxmox 失败 ({settings.pve_host}): {e}")
        return None

def list_nodes(api: ProxmoxAPI):
    if not api: return None
    try:
        return api.nodes.get()
    except Exception as e:
        logger.error(f"获取节点列表失败: {e}")
        raise

def create_container(api: ProxmoxAPI, node_name: str, config: dict):
    if not api: return None
    try:
        config['vmid'] = int(config['vmid'])
        config['cores'] = int(config.get('cores', 1))
        config['memory'] = int(config.get('memory', 512))
        config['swap'] = int(config.get('swap', 512))

        logger.info(f"正在节点 '{node_name}' 上创建容器，配置: {config}")
        result = api.nodes(node_name).lxc.post(**config)
        logger.info(f"容器创建任务已启动: {result}")
        return result
    except Exception as e:
        logger.error(f"创建 LXC 容器失败: {e}")
        raise
