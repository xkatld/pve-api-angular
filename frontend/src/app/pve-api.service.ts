import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface NodeInfo {
  node: string;
  status: string;
  cpu: number;
  mem: number;
  maxmem: number;
  disk: number | null;
  maxdisk: number | null;
  uptime: number;
}

export interface ContainerInfo {
  vmid: number;
  name: string;
  status: string;
  node: string;
  cpu: number;
  mem: number;
  maxmem: number;
  disk: number | null;
  maxdisk: number | null;
  uptime: number;
  type: string;
  isLoading?: boolean;
}

export interface StorageInfo {
  storage: string;
  content: string;
  type: string;
  active: number;
  avail: number;
  total: number;
  used: number;
}

export interface TemplateInfo {
  volid: string;
  size: number;
  format: string;
  content: string;
}

export interface BridgeInfo {
  iface: string;
  type: string;
  active: number;
}

export interface ResourcesInfo {
  storages: {
      templates: StorageInfo[];
      root: StorageInfo[];
  };
  bridges: BridgeInfo[];
  templates: TemplateInfo[];
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
  cpulimit?: number;
  rate?: number;
  unprivileged?: boolean;
  nesting?: boolean;
}

export interface ApiResponse {
  message: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class PveApiService {

  private apiUrl = environment.apiUrl;
  private apiKey = environment.apiKey;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = '发生未知错误!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `客户端错误: ${error.error.message}`;
    } else {
       errorMessage = `服务器错误 (代码: ${error.status}): ${error.error?.detail || error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  getNodes(): Observable<NodeInfo[]> {
    return this.http.get<NodeInfo[]>(`${this.apiUrl}/nodes`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getContainers(nodeName: string): Observable<ContainerInfo[]> {
    return this.http.get<ContainerInfo[]>(`${this.apiUrl}/nodes/${nodeName}/lxc`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getResources(nodeName: string): Observable<ResourcesInfo> {
    return this.http.get<ResourcesInfo>(`${this.apiUrl}/nodes/${nodeName}/resources`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  createLxc(nodeName: string, config: ContainerConfig): Observable<ApiResponse> {
    const payload = {
        ...config,
        unprivileged: config.unprivileged ?? true,
        nesting: config.nesting ?? false
    };
    return this.http.post<ApiResponse>(`${this.apiUrl}/nodes/${nodeName}/lxc`, payload, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  startContainer(nodeName: string, vmid: number): Observable<ApiResponse> {
      return this.http.post<ApiResponse>(`${this.apiUrl}/nodes/${nodeName}/lxc/${vmid}/start`, {}, { headers: this.getHeaders() }).pipe(
        catchError(this.handleError)
      );
  }

  stopContainer(nodeName: string, vmid: number): Observable<ApiResponse> {
      return this.http.post<ApiResponse>(`${this.apiUrl}/nodes/${nodeName}/lxc/${vmid}/stop`, {}, { headers: this.getHeaders() }).pipe(
        catchError(this.handleError)
      );
  }

  deleteContainer(nodeName: string, vmid: number): Observable<ApiResponse> {
      return this.http.delete<ApiResponse>(`${this.apiUrl}/nodes/${nodeName}/lxc/${vmid}`, { headers: this.getHeaders() }).pipe(
        catchError(this.handleError)
      );
  }
}
