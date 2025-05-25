import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// 定义接口 (可以单独放到 models.ts 文件)
export interface NodeInfo {
  node: string;
  status: string;
  cpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
}

export interface ContainerConfig {
  ostemplate: string;
  vmid: number;
  hostname: string;
  password: string;
  net0: string;
  storage: string;
  cores?: number;
  memory?: number;
  swap?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PveApiService {

  private apiUrl = 'http://localhost:8000/api'; // 指向你的 FastAPI 后端

  constructor(private http: HttpClient) { }

  getNodes(): Observable<NodeInfo[]> {
    return this.http.get<NodeInfo[]>(`${this.apiUrl}/nodes`);
  }

  createLxc(nodeName: string, config: ContainerConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/nodes/${nodeName}/lxc`, config);
  }
}
