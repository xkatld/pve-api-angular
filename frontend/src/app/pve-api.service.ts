import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

export interface ApiResponse {
  message: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class PveApiService {

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

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
    return this.http.get<NodeInfo[]>(`${this.apiUrl}/nodes`).pipe(
      catchError(this.handleError)
    );
  }

  createLxc(nodeName: string, config: ContainerConfig): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/nodes/${nodeName}/lxc`, config).pipe(
      catchError(this.handleError)
    );
  }
}
