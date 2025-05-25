import { Component } from '@angular/core';
import { PveApiService, NodeInfo, ContainerConfig } from './pve-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  nodes: NodeInfo[] = [];
  selectedNode: string = '';
  message: string = '';
  messageType: 'success' | 'danger' | 'warning' = 'success';

  containerConfig: ContainerConfig = {
    ostemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz',
    vmid: 102,
    hostname: 'angular-container',
    password: 'your_password',
    net0: 'name=eth0,bridge=vmbr0,ip=dhcp',
    storage: 'local-lvm',
    cores: 1,
    memory: 512,
    swap: 512
  };

  constructor(private pveApi: PveApiService) {}

  loadNodes() {
    this.pveApi.getNodes().subscribe({
      next: (data) => {
        this.nodes = data;
        this.showMessage('节点加载成功!', 'success');
        if (data.length > 0) {
            this.selectedNode = data[0].node; // 默认选中第一个
        }
      },
      error: (err) => {
        console.error(err);
        this.showMessage(`加载节点失败: ${err.error?.detail || err.message}`, 'danger');
      }
    });
  }

  onSubmit() {
    if (!this.selectedNode) {
      this.showMessage('请选择一个节点!', 'warning');
      return;
    }
    this.pveApi.createLxc(this.selectedNode, this.containerConfig).subscribe({
      next: (response) => {
        this.showMessage(`容器创建任务启动: ${response.data || response.message}`, 'success');
      },
      error: (err) => {
        console.error(err);
        this.showMessage(`创建容器失败: ${err.error?.detail || err.message}`, 'danger');
      }
    });
  }

  showMessage(msg: string, type: 'success' | 'danger' | 'warning') {
      this.message = msg;
      this.messageType = type;
      setTimeout(() => this.message = '', 5000);
  }
}
