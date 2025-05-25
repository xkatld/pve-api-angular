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

def list_lxc(api: ProxmoxAPI, node_name: str):
    if not api: return None
    try:
        return api.nodes(node_name).lxc.get()
    except Exception as e:
        logger.error(f"获取节点 '{node_name}' 上的 LXC 列表失败: {e}")
        raise

def create_container(api: ProxmoxAPI, node_name: str, config: dict):
    if not api: return None
    try:
        config['vmid'] = int(config['vmid'])
        config['cores'] = int(config.get('cores', 1))
        config['memory'] = int(config.get('memory', 512))
        config['swap'] = int(config.get('swap', 512))
        
        cpulimit = int(config.get('cpulimit', 0))
        rate = int(config.get('rate', 0))

        if cpulimit > 0:
            config['cpulimit'] = cpulimit
        else:
            config.pop('cpulimit', None)

        if rate > 0:
            config['rate'] = rate
        else:
            config.pop('rate', None)

        config['unprivileged'] = 1 if config.get('unprivileged', True) else 0
        
        features = []
        if config.get('nesting', False):
            features.append("nesting=1")
            
        config.pop('nesting', None) 
        
        if features:
            config['features'] = ",".join(features)
        else:
            config.pop('features', None)

        logger.info(f"正在节点 '{node_name}' 上创建容器，配置: {config}")
        result = api.nodes(node_name).lxc.post(**config)
        logger.info(f"容器创建任务已启动: {result}")
        return result
    except Exception as e:
        logger.error(f"创建 LXC 容器失败: {e}")
        raise

def start_lxc(api: ProxmoxAPI, node_name: str, vmid: int):
    if not api: return None
    try:
        logger.info(f"正在启动节点 '{node_name}' 上的容器 VMID: {vmid}")
        result = api.nodes(node_name).lxc(vmid).status.start.post()
        logger.info(f"启动容器 {vmid} 任务已启动: {result}")
        return result
    except Exception as e:
        logger.error(f"启动 LXC 容器 {vmid} 失败: {e}")
        raise

def stop_lxc(api: ProxmoxAPI, node_name: str, vmid: int):
    if not api: return None
    try:
        logger.info(f"正在停止节点 '{node_name}' 上的容器 VMID: {vmid}")
        result = api.nodes(node_name).lxc(vmid).status.stop.post()
        logger.info(f"停止容器 {vmid} 任务已启动: {result}")
        return result
    except Exception as e:
        logger.error(f"停止 LXC 容器 {vmid} 失败: {e}")
        raise

def delete_lxc(api: ProxmoxAPI, node_name: str, vmid: int):
    if not api: return None
    try:
        logger.info(f"正在删除节点 '{node_name}' 上的容器 VMID: {vmid}")
        result = api.nodes(node_name).lxc(vmid).delete()
        logger.info(f"删除容器 {vmid} 任务已启动: {result}")
        return result
    except Exception as e:
        logger.error(f"删除 LXC 容器 {vmid} 失败: {e}")
        raise

def list_storages(api: ProxmoxAPI, node_name: str):
    if not api: return None
    try:
        all_storages = api.nodes(node_name).storage.get()
        template_storages = [s for s in all_storages if 'vztmpl' in s.get('content', '') and s.get('active', 0) == 1]
        root_storages = [s for s in all_storages if ('rootdir' in s.get('content', '') or 'images' in s.get('content', '')) and s.get('active', 0) == 1]
        return {"templates": template_storages, "root": root_storages}
    except Exception as e:
        logger.error(f"获取节点 '{node_name}' 上的存储列表失败: {e}")
        raise

def list_templates(api: ProxmoxAPI, node_name: str, storage_name: str):
    if not api: return None
    try:
        return api.nodes(node_name).storage(storage_name).content.get(content='vztmpl')
    except Exception as e:
        logger.error(f"获取存储 '{storage_name}' 上的模板列表失败: {e}")
        raise

def list_bridges(api: ProxmoxAPI, node_name: str):
    if not api: return None
    try:
        all_networks = api.nodes(node_name).network.get(type='bridge')
        bridges = [n for n in all_networks if n.get('active') == 1]
        return bridges
    except Exception as e:
        logger.error(f"获取节点 '{node_name}' 上的网桥列表失败: {e}")
        raise
