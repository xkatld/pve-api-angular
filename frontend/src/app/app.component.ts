import { Component, OnInit, ViewChild } from '@angular/core';
import { PveApiService, NodeInfo, ContainerConfig, ContainerInfo, ApiResponse } from './pve-api.service';
import { NgForm } from '@angular/forms';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('lxcForm') lxcForm!: NgForm;

  nodes: NodeInfo[] = [];
  containers: ContainerInfo[] = [];
  selectedNode: string = '';
  message: string | null = null;
  messageType: 'success' | 'danger' | 'warning' = 'success';
  isLoadingNodes: boolean = false;
  isLoadingContainers: boolean = false;
  isCreating: boolean = false;
  showCreateModal: boolean = false;
  actionType: 'start' | 'stop' | 'delete' | null = null;


  containerConfig: ContainerConfig = {
    ostemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz',
    vmid: 105,
    hostname: 'my-lxc-105',
    password: '',
    net0: 'name=eth0,bridge=vmbr0,ip=dhcp',
    storage: 'local-lvm',
    cores: 1,
    memory: 512,
    swap: 512
  };

  constructor(private pveApi: PveApiService) {}

  ngOnInit() {
    this.loadNodes();
  }

  loadNodes() {
    this.isLoadingNodes = true;
    this.message = null;
    this.pveApi.getNodes().subscribe({
      next: (data) => {
        this.nodes = data;
        if (data.length > 0 && !this.selectedNode) {
            this.selectedNode = data[0].node;
            this.loadContainers();
        } else if (data.length > 0) {
            this.loadContainers(); // 刷新时也加载
        } else {
            this.showMessage('未找到 PVE 节点。', 'warning');
            this.containers = [];
        }
        this.isLoadingNodes = false;
      },
      error: (err: Error) => {
        console.error(err);
        this.showMessage(`加载节点失败: ${err.message}`, 'danger');
        this.isLoadingNodes = false;
      }
    });
  }

  onNodeChange(node: string) {
      this.selectedNode = node;
      this.loadContainers();
  }

  loadContainers() {
      if (!this.selectedNode) return;
      this.isLoadingContainers = true;
      this.message = null;
      this.containers = []; // 清空现有列表
      this.pveApi.getContainers(this.selectedNode).subscribe({
          next: (data) => {
              this.containers = data.map(c => ({ ...c, isLoading: false }));
              this.showMessage(`节点 '${this.selectedNode}' 上的容器加载成功!`, 'success');
              this.isLoadingContainers = false;
          },
          error: (err: Error) => {
              console.error(err);
              this.showMessage(`加载容器失败: ${err.message}`, 'danger');
              this.isLoadingContainers = false;
          }
      });
  }

  onSubmit() {
    if (!this.selectedNode) {
      this.showMessage('请选择一个节点!', 'warning');
      return;
    }
    if (this.lxcForm.invalid) {
        this.showMessage('请填写所有必填字段!', 'warning');
        return;
    }

    this.isCreating = true;
    this.message = null;
    this.pveApi.createLxc(this.selectedNode, this.containerConfig).subscribe({
      next: (response: ApiResponse) => {
        this.showMessage(`容器创建任务启动成功: ${response.data || response.message}`, 'success');
        this.isCreating = false;
        this.closeCreateModal();
        this.containerConfig.vmid++; // 自动增加 vmid
        this.containerConfig.hostname = `my-lxc-${this.containerConfig.vmid}`;
        this.containerConfig.password = ''; // 清空密码
        setTimeout(() => this.loadContainers(), 2000); // 等待一会再刷新列表
      },
      error: (err: Error) => {
        console.error(err);
        this.showMessage(`创建容器失败: ${err.message}`, 'danger');
        this.isCreating = false;
      }
    });
  }

  startContainer(container: ContainerInfo) {
      this.performAction(container, 'start', this.pveApi.startContainer(container.node, container.vmid));
  }

  stopContainer(container: ContainerInfo) {
      this.performAction(container, 'stop', this.pveApi.stopContainer(container.node, container.vmid));
  }

  deleteContainer(container: ContainerInfo) {
      if (confirm(`确定要删除容器 ${container.vmid} (${container.name}) 吗？此操作不可逆！`)) {
          this.performAction(container, 'delete', this.pveApi.deleteContainer(container.node, container.vmid));
      }
  }

  performAction(container: ContainerInfo, type: 'start' | 'stop' | 'delete', apiCall: any) {
      container.isLoading = true;
      this.actionType = type;
      this.message = null;
      apiCall.pipe(
          finalize(() => {
              container.isLoading = false;
              this.actionType = null;
              // 稍后刷新列表以获取最新状态
              setTimeout(() => this.loadContainers(), 3000);
          })
      ).subscribe({
          next: (response: ApiResponse) => {
              this.showMessage(`操作成功: ${response.message}`, 'success');
          },
          error: (err: Error) => {
              this.showMessage(`操作失败: ${err.message}`, 'danger');
          }
      });
  }


  showMessage(msg: string, type: 'success' | 'danger' | 'warning') {
      this.message = msg;
      this.messageType = type;
      setTimeout(() => this.message = null, 7000); // 延长显示时间
  }

  openCreateModal() {
      this.showCreateModal = true;
  }

  closeCreateModal() {
      this.showCreateModal = false;
  }
}
