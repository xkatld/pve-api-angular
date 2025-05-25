import { Component, OnInit, ViewChild } from '@angular/core';
import { PveApiService, NodeInfo, ContainerConfig, ApiResponse } from './pve-api.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('lxcForm') lxcForm!: NgForm;

  nodes: NodeInfo[] = [];
  selectedNode: string = '';
  message: string | null = null;
  messageType: 'success' | 'danger' | 'warning' = 'success';
  isLoadingNodes: boolean = false;
  isCreating: boolean = false;

  containerConfig: ContainerConfig = {
    ostemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz',
    vmid: 103,
    hostname: 'my-angular-lxc',
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
        if (data.length > 0) {
            this.selectedNode = data[0].node;
            this.showMessage('节点加载成功!', 'success');
        } else {
            this.showMessage('未找到 PVE 节点。', 'warning');
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
        this.containerConfig.vmid++;
        this.containerConfig.hostname = `my-angular-lxc-${this.containerConfig.vmid}`;
      },
      error: (err: Error) => {
        console.error(err);
        this.showMessage(`创建容器失败: ${err.message}`, 'danger');
        this.isCreating = false;
      }
    });
  }

  showMessage(msg: string, type: 'success' | 'danger' | 'warning') {
      this.message = msg;
      this.messageType = type;
      setTimeout(() => this.message = null, 5000);
  }
}
