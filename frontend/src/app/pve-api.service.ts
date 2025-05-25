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

  createLxc(nodeName: string, config: ContainerConfig): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/nodes/${nodeName}/lxc`, config, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }
}
