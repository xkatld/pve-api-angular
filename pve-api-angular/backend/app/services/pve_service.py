from proxmoxer import ProxmoxAPI
from app.core.config import settings

def get_pve_api():
    try:
        proxmox = ProxmoxAPI(
            settings.pve_host,
            user=settings.pve_user,
            password=settings.pve_password,
            verify_ssl=settings.verify_ssl
        )
        return proxmox
    except Exception as e:
        print(f"连接 Proxmox 失败: {e}")
        return None

# 你可以在这里添加更多封装好的函数，例如：
def list_nodes(api):
    if not api: return None
    return api.nodes.get()

def create_container(api, node_name, config):
    if not api: return None
    return api.nodes(node_name).lxc.post(**config)
