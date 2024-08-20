package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/Telmate/proxmox-api-go/proxmox"
)

var client *proxmox.Client

// 配置结构体
type Config struct {
	ProxmoxURL string `json:"proxmox_url"`
	Username   string `json:"username"`
	Password   string `json:"password"`
}

func init() {
	// 读取配置文件
	config, err := loadConfig("config.json")
	if err != nil {
		log.Fatal("加载配置文件失败:", err)
	}

	// 初始化 Proxmox 客户端
	client, err = proxmox.NewClient(config.ProxmoxURL, nil, nil)
	if err != nil {
		log.Fatal("初始化 Proxmox 客户端失败:", err)
	}

	// 登录 Proxmox
	err = client.Login(config.Username, config.Password)
	if err != nil {
		log.Fatal("登录 Proxmox 失败:", err)
	}
}

// 加载配置文件
func loadConfig(filename string) (*Config, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var config Config
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&config)
	if err != nil {
		return nil, err
	}

	return &config, nil
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

	if err := json.NewDecoder(r.Body).Decode(&请求); err != nil {
		http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 创建容器配置
	config := map[string]interface{}{
		"hostname":   请求.主机名,
		"memory":     请求.内存,
		"cores":      请求.CPU,
		"storage":    请求.存储节点,
		"ostemplate": fmt.Sprintf("local:vztmpl/%s", 请求.模板),
		"rootfs":     fmt.Sprintf("%s:%d", 请求.存储节点, 请求.硬盘),
	}

	// 创建容器
	vmr := proxmox.NewVmRef(0)
	vmr.SetNode(请求.节点)
	if err := client.CreateLxc(vmr, config); err != nil {
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

	if err := json.NewDecoder(r.Body).Decode(&资源); err != nil {
		http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 设置 CPU 核心数
	if _, err := client.SetVmConfig(id, map[string]interface{}{"cores": 资源.CPU}); err != nil {
		http.Error(w, "设置 CPU 失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 设置内存
	if _, err := client.SetVmConfig(id, map[string]interface{}{"memory": 资源.内存}); err != nil {
		http.Error(w, "设置内存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 设置硬盘大小
	if _, err := client.ResizeVolume(id, "rootfs", fmt.Sprintf("%dG", 资源.硬盘)); err != nil {
		http.Error(w, "设置硬盘失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "资源设置成功")
}

func 设置容器网络(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var 网络 struct {
		带宽    int `json:"bandwidth"`
		SSH端口 int `json:"ssh_port"`
		NAT开始 int `json:"nat_start"`
		NAT结束 int `json:"nat_end"`
	}

	if err := json.NewDecoder(r.Body).Decode(&网络); err != nil {
		http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 设置网络带宽
	if _, err := client.SetVmConfig(id, map[string]interface{}{
		"net0": fmt.Sprintf("virtio,bridge=vmbr0,rate=%d", 网络.带宽),
	}); err != nil {
		http.Error(w, "设置网络带宽失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	/* 
	设置 NAT 和端口转发
	注意：这部分需要在 Proxmox 主机上执行额外的命令
	以下是概念性的占位代码：
	*/
	ssh命令 := fmt.Sprintf("iptables -t nat -A PREROUTING -p tcp --dport %d -j DNAT --to-destination ${VM_IP}:22", 网络.SSH端口)
	nat命令 := fmt.Sprintf("iptables -t nat -A PREROUTING -p tcp --dport %d:%d -j DNAT --to-destination ${VM_IP}", 网络.NAT开始, 网络.NAT结束)

	// TODO: 需要实现在 Proxmox 主机上执行这些命令的功能

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "网络设置应用成功")
}
