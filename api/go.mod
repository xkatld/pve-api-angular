package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"

    "github.com/gorilla/mux"
    "github.com/Telmate/proxmox-api-go/proxmox"
)

var client *proxmox.Client

func init() {
    var err error
    // 初始化 Proxmox 客户端
    client, err = proxmox.NewClient("https://你的proxmox服务器地址:8006/api2/json", nil, nil)
    if err != nil {
        log.Fatal("初始化 Proxmox 客户端失败:", err)
    }
    // 登录 Proxmox
    err = client.Login("root@pam", "你的密码")
    if err != nil {
        log.Fatal("登录 Proxmox 失败:", err)
    }
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/container/create", 创建容器).Methods("POST")
    r.HandleFunc("/container/{id}/resources", 设置容器资源).Methods("POST")
    r.HandleFunc("/container/{id}/network", 设置容器网络).Methods("POST")

    log.Println("API 服务器正在运行，监听端口 8080...")
    log.Fatal(http.ListenAndServe(":8080", r))
}

func 创建容器(w http.ResponseWriter, r *http.Request) {
    var 请求 struct {
        节点     string `json:"node"`
        存储节点 string `json:"storage"`
        模板     string `json:"template"`
        主机名   string `json:"hostname"`
        内存     int    `json:"memory"`
        CPU      int    `json:"cpu"`
        硬盘     int    `json:"disk"`
    }

    err := json.NewDecoder(r.Body).Decode(&请求)
    if err != nil {
        http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
        return
    }

    // 创建容器配置
    config := map[string]interface{}{
        "hostname": 请求.主机名,
        "memory":   请求.内存,
        "cores":    请求.CPU,
        "storage":  请求.存储节点,
        "ostemplate": fmt.Sprintf("local:vztmpl/%s", 请求.模板),
        "rootfs":     fmt.Sprintf("%s:%d", 请求.存储节点, 请求.硬盘),
    }

    // 创建容器
    vmr := proxmox.NewVmRef(0)
    vmr.SetNode(请求.节点)
    err = client.CreateLxc(vmr, config)
    if err != nil {
        http.Error(w, "创建容器失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "message": "容器创建成功",
        "vmid":    vmr.VmId(),
    })
}

func 设置容器资源(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    var 资源 struct {
        CPU  int `json:"cpu"`
        内存 int `json:"memory"`
        硬盘 int `json:"disk"`
    }

    err := json.NewDecoder(r.Body).Decode(&资源)
    if err != nil {
        http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
        return
    }

    // 设置 CPU 核心数
    _, err = client.SetVmConfig(id, map[string]interface{}{
        "cores": 资源.CPU,
    })
    if err != nil {
        http.Error(w, "设置 CPU 失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // 设置内存
    _, err = client.SetVmConfig(id, map[string]interface{}{
        "memory": 资源.内存,
    })
    if err != nil {
        http.Error(w, "设置内存失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // 设置硬盘大小（这里可能需要根据实际情况调整）
    _, err = client.ResizeVolume(id, "rootfs", fmt.Sprintf("%dG", 资源.硬盘))
    if err != nil {
        http.Error(w, "设置硬盘失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, "资源设置成功")
}

func 设置容器网络(w http.ResponseWriter, r *http.Request) {
    // ... (保持原有的设置容器网络函数不变)
}
