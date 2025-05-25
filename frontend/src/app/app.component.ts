import { Component, OnInit, ViewChild } from '@angular/core';
import { PveApiService, NodeInfo, ContainerConfig, ContainerInfo, ApiResponse, ResourcesInfo } from './pve-api.service';
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
  isLoadingResources: boolean = false;

  resources: ResourcesInfo | null = null;
  selectedBridge: string = '';

  containerConfig: ContainerConfig = {
    ostemplate: '',
    vmid: 105,
    hostname: 'my-lxc-105',
    password: '',
    net0: '',
    storage: '',
    cores: 1,
    memory: 512,
    swap: 512,
    cpulimit: 0,
    rate: 0,
    unprivileged: true,
    nesting: false
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
            this.loadResources();
            this.loadContainers();
        } else if (data.length > 0) {
            this.loadResources();
            this.loadContainers();
        } else {
            this.showMessage('未找到 PVE 节点。', 'warning');
            this.containers = [];
            this.resources = null;
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

  loadResources() {
      if (!this.selectedNode) return;
      this.isLoadingResources = true;
      this.pveApi.getResources(this.selectedNode).subscribe({
          next: (data) => {
              this.resources = data;
              if (this.resources?.storages?.root.length > 0 && !this.containerConfig.storage) {
                  this.containerConfig.storage = this.resources.storages.root[0].storage;
              }
              if (this.resources?.templates.length > 0 && !this.containerConfig.ostemplate) {
                  this.containerConfig.ostemplate = this.resources.templates[0].volid;
              }
              if (this.resources?.bridges.length > 0 && !this.selectedBridge) {
                  this.selectedBridge = this.resources.bridges[0].iface;
                  this.updateNet0();
              }
              this.isLoadingResources = false;
          },
          error: (err: Error) => {
              console.error(err);
              this.showMessage(`加载资源失败: ${err.message}`, 'danger');
              this.isLoadingResources = false;
          }
      });
  }

  onNodeChange(node: string) {
      this.selectedNode = node;
      this.resources = null;
      this.containers = [];
      this.loadResources();
      this.loadContainers();
  }

  loadContainers() {
      if (!this.selectedNode) return;
      this.isLoadingContainers = true;
      this.message = null;
      this.containers = [];
      this.pveApi.getContainers(this.selectedNode).subscribe({
          next: (data) => {
              this.containers = data.map(c => ({ ...c, isLoading: false }));
              //this.showMessage(`节点 '${this.selectedNode}' 上的容器加载成功!`, 'success');
              this.isLoadingContainers = false;
          },
          error: (err: Error) => {
              console.error(err);
              this.showMessage(`加载容器失败: ${err.message}`, 'danger');
              this.isLoadingContainers = false;
          }
      });
  }

  updateNet0() {
      this.containerConfig.net0 = `name=eth0,bridge=${this.selectedBridge},ip=dhcp`;
  }

  onSubmit() {
    if (!this.selectedNode || !this.resources) {
      this.showMessage('请选择一个节点并等待资源加载!', 'warning');
      return;
    }
     if (this.lxcForm.invalid || !this.containerConfig.ostemplate || !this.containerConfig.storage || !this.containerConfig.net0) {
        this.showMessage('请填写所有必填字段并选择资源!', 'warning');
        Object.keys(this.lxcForm.controls).forEach(field => {
            const control = this.lxcForm.controls[field];
            control.markAsTouched({ onlySelf: true });
        });
        return;
    }

    this.isCreating = true;
    this.message = null;

    const configToSend = {
        ...this.containerConfig,
        cpulimit: Number(this.containerConfig.cpulimit),
        rate: Number(this.containerConfig.rate)
    };

    this.pveApi.createLxc(this.selectedNode, configToSend).subscribe({
      next: (response: ApiResponse) => {
        this.showMessage(`容器创建任务启动成功: ${response.data || response.message}`, 'success');
        this.isCreating = false;
        this.closeCreateModal();
        this.containerConfig.vmid++;
        this.containerConfig.hostname = `my-lxc-${this.containerConfig.vmid}`;
        this.containerConfig.password = '';
        setTimeout(() => this.loadContainers(), 3000);
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
      setTimeout(() => this.message = null, 7000);
  }

  openCreateModal() {
      if (!this.resources && this.selectedNode) {
          this.loadResources();
      }
      this.showCreateModal = true;
  }

  closeCreateModal() {
      this.showCreateModal = false;
  }
}
