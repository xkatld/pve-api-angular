import { Component, OnInit, ViewChild } from '@angular/core';
import { PveApiService, NodeInfo, ContainerConfig, ContainerInfo, ApiResponse, ResourcesInfo, ContainerConfigDetails } from './pve-api.service';
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

  showDetailsModal: boolean = false;
  isLoadingDetails: boolean = false;
  selectedContainerDetails: ContainerInfo | null = null;
  containerDetails: ContainerConfigDetails | null = null;
  pveHost: string | null = null;

  constructor(private pveApi: PveApiService) {}

  ngOnInit() {
    this.loadNodes();
    this.pveApi.getPveHost().subscribe({
        next: (data) => {
            this.pveHost = data.pve_host;
        },
        error: (err) => {
            console.error("无法获取 PVE 主机地址:", err);
            this.showMessage('无法获取 PVE 主机地址，控制台功能可能受限。', 'warning');
        }
    });
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
      const confirmMessage = `您确定要删除容器 ${container.vmid} (${container.name}) 吗？\n\n此操作将首先尝试停止容器（如果正在运行），然后永久删除它。此操作不可逆！`;
      if (confirm(confirmMessage)) {
          container.isLoading = true;
          this.actionType = 'delete';
          this.message = null;

          const performDelete = () => {
              this.pveApi.deleteContainer(container.node, container.vmid).pipe(
                  finalize(() => {
                      container.isLoading = false;
                      this.actionType = null;
                      setTimeout(() => this.loadContainers(), 3000);
                  })
              ).subscribe({
                  next: (response: ApiResponse) => {
                      this.showMessage(`删除操作成功: ${response.message}`, 'success');
                  },
                  error: (err: Error) => {
                      this.showMessage(`删除操作失败: ${err.message}`, 'danger');
                  }
              });
          };

          if (container.status === 'running') {
              this.showMessage(`正在停止容器 ${container.vmid}...`, 'warning');
              this.pveApi.stopContainer(container.node, container.vmid).subscribe({
                  next: () => {
                      this.showMessage(`容器 ${container.vmid} 已停止，正在删除...`, 'success');
                      setTimeout(() => performDelete(), 2000);
                  },
                  error: (err: Error) => {
                      this.showMessage(`停止容器失败: ${err.message}. 尝试直接删除...`, 'danger');
                      performDelete();
                  }
              });
          } else {
              performDelete();
          }
      }
  }

  reinstallContainer(container: ContainerInfo) {
       const confirmMessage = `您确定要重装容器 ${container.vmid} (${container.name}) 吗？\n\n此操作将停止、删除现有容器，然后打开创建对话框以使用相似配置重建。\n\n您需要重新输入密码并确认设置。`;
       if (confirm(confirmMessage)) {
            container.isLoading = true;
            this.actionType = 'delete';

            const performDeleteForReinstall = () => {
                this.pveApi.deleteContainer(container.node, container.vmid).subscribe({
                    next: () => {
                        this.showMessage(`容器 ${container.vmid} 已删除，请重新创建。`, 'success');
                        container.isLoading = false;
                        this.actionType = null;
                        this.loadContainers();

                        this.containerConfig.vmid = container.vmid;
                        this.containerConfig.hostname = container.name;
                        this.containerConfig.password = '';
                        this.containerConfig.ostemplate = '';
                        this.containerConfig.storage = '';
                        this.selectedBridge = '';
                        this.containerConfig.cores = 1;
                        this.containerConfig.memory = 512;
                        this.containerConfig.swap = 512;
                        this.openCreateModal();
                    },
                    error: (err: Error) => {
                        this.showMessage(`重装失败 (删除阶段): ${err.message}`, 'danger');
                        container.isLoading = false;
                        this.actionType = null;
                    }
                });
            };

            if (container.status === 'running') {
                this.pveApi.stopContainer(container.node, container.vmid).subscribe({
                    next: () => setTimeout(() => performDeleteForReinstall(), 2000),
                    error: () => performDeleteForReinstall()
                });
            } else {
                performDeleteForReinstall();
            }
       }
  }

  performAction(container: ContainerInfo, type: 'start' | 'stop', apiCall: any) {
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

  showDetails(container: ContainerInfo) {
      this.selectedContainerDetails = container;
      this.containerDetails = null;
      this.isLoadingDetails = true;
      this.showDetailsModal = true;
      this.pveApi.getContainerDetails(container.node, container.vmid).subscribe({
          next: (data) => {
              this.containerDetails = data;
              this.isLoadingDetails = false;
          },
          error: (err: Error) => {
              this.showMessage(`加载详情失败: ${err.message}`, 'danger');
              this.isLoadingDetails = false;
              this.closeDetailsModal();
          }
      });
  }

  closeDetailsModal() {
      this.showDetailsModal = false;
      this.selectedContainerDetails = null;
      this.containerDetails = null;
  }

  openConsole(container: ContainerInfo) {
      if (!this.pveHost) {
          this.showMessage('PVE 主机地址未配置，无法打开控制台。', 'warning');
          return;
      }
      const consoleUrl = `https://${this.pveHost}:8006/#v1:0:lxc/${container.vmid}:${container.node}:lxc::`;
      window.open(consoleUrl, '_blank');
      this.showMessage('正在新窗口中打开 PVE 控制台，您可能需要登录。', 'success');
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
