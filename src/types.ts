export enum ConsoleMode {
  DEFAULT_TTY = "默认 (tty)",
  SHELL = "shell",
}

export interface ContainerStatus {
  vmid: string;
  name?: string | null;
  status: string;
  uptime?: number | null;
  cpu?: number | null;
  mem?: number | null;
  maxmem?: number | null;
  node: string;
  template?: boolean;
}

export interface OperationResponse<T = Record<string, any> | null> {
  success: boolean;
  message: string;
  data?: T;
}

export interface NodeResource {
  [key: string]: any;
}

export interface NodeResourceResponse {
  success: boolean;
  message: string;
  data?: NodeResource[] | null;
}

export interface ContainerListResponse {
  containers: ContainerStatus[];
  total: number;
}

export interface NetworkInterface {
  name: string;
  bridge: string;
  ip: string;
  gw?: string | null;
  vlan?: number | null;
  rate?: number | null;
}

export interface ContainerCreatePayload {
  node: string;
  vmid: number;
  hostname: string;
  password: string;
  ostemplate: string;
  storage: string;
  disk_size: number;
  cores: number;
  cpulimit?: number | null;
  memory: number;
  swap: number;
  network: NetworkInterface;
  nesting?: boolean | null;
  unprivileged?: boolean | null;
  start?: boolean | null;
  features?: string | null;
  console_mode?: ConsoleMode | null;
}

export interface ContainerRebuildPayload {
  ostemplate: string;
  hostname: string;
  password: string;
  storage: string;
  disk_size: number;
  cores: number;
  cpulimit?: number | null;
  memory: number;
  swap: number;
  network: NetworkInterface;
  nesting?: boolean | null;
  unprivileged?: boolean | null;
  start?: boolean | null;
  features?: string | null;
  console_mode?: ConsoleMode | null;
}

export interface ConsoleTicket {
  ticket: string;
  port: number;
  user: string;
  node: string;
  host: string;
}

export interface ConsoleApiResponse {
  success: boolean;
  message: string;
  data?: ConsoleTicket | null;
}

export interface NodeInfo {
  node: string;
  status: string;
  uptime: number;
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
}

export interface NodeListApiResponse {
  success: boolean;
  message: string;
  data?: NodeInfo[] | null;
}

export interface TaskStatusInfo {
  status?: string;
  exitstatus?: string;
  type?: string;
  id?: string;
  starttime?: number;
  endtime?: number;
  message?: string; // For errors from our API wrapper
}
