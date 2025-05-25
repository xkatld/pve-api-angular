package main

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
)

type Config struct {
	ProxmoxURL  string `json:"proxmox_url"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	Node        string `json:"node"`
	CSRFToken   string
	Gateway     string `json:"gateway"`
	IPv6Gateway string `json:"ipv6_gateway"`
}

type Container struct {
	ID       int    `json:"id"`
	Hostname string `json:"hostname"`
	Password string `json:"password"`
	IP       string `json:"ip"`
	IPv6     string `json:"ipv6"`
	Memory   int    `json:"memory"`
	CPU      int    `json:"cpu"`
	Disk     int    `json:"disk"`
	Status   string `json:"status"`
}

var config Config
var client *http.Client
var ticket string
var db *sql.DB

func init() {
	loadConfig("config.json")
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client = &http.Client{Transport: tr}
	login()
	initDB()
}

func loadConfig(filename string) {
	data, err := os.ReadFile(filename)
	if err != nil {
		log.Fatal("读取配置文件失败:", err)
	}
	err = json.Unmarshal(data, &config)
	if err != nil {
		log.Fatal("解析配置文件失败:", err)
	}
	log.Printf("配置已加载: %+v", config)
}

func login() {
	data := url.Values{}
	data.Set("username", config.Username)
	data.Set("password", config.Password)

	log.Printf("尝试使用用户名 %s 登录", config.Username)
	resp, err := client.PostForm(config.ProxmoxURL+"/api2/json/access/ticket", data)
	if err != nil {
		log.Fatal("登录失败:", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal("读取登录响应失败:", err)
	}
	log.Printf("登录响应: %s", string(body))

	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		log.Fatal("解析登录响应失败:", err)
	}

	if data, ok := result["data"].(map[string]interface{}); ok {
		if ticketValue, ok := data["ticket"].(string); ok {
			ticket = ticketValue
			log.Printf("登录成功, 票据: %s", ticket)
		} else {
			log.Fatal("登录响应中未找到票据")
		}
		if csrfToken, ok := data["CSRFPreventionToken"].(string); ok {
			config.CSRFToken = csrfToken
			log.Printf("获取到 CSRF 令牌: %s", config.CSRFToken)
		} else {
			log.Fatal("登录响应中未找到 CSRF 令牌")
		}
	} else {
		log.Fatal("登录响应结构异常")
	}
}

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./containers.db")
	if err != nil {
		log.Fatal(err)
	}

	sqlStmt := `
    CREATE TABLE IF NOT EXISTS containers (
        id INTEGER PRIMARY KEY,
        hostname TEXT,
        password TEXT,
        ip TEXT,
        ipv6 TEXT,
        memory INTEGER,
        cpu INTEGER,
        disk INTEGER,
        status TEXT
    );`

	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Printf("%q: %s\n", err, sqlStmt)
		return
	}
	log.Println("数据库初始化成功")
}

func apiRequest(method, path string, data map[string]interface{}) (map[string]interface{}, error) {
	var req *http.Request
	var err error

	fullURL := config.ProxmoxURL + path
	log.Printf("准备 %s 请求至 %s", method, fullURL)

	formValues := url.Values{}
	for k, v := range data {
		formValues.Add(k, fmt.Sprintf("%v", v))
	}

	if method == "GET" || method == "DELETE" {
		req, err = http.NewRequest(method, fullURL, nil)
		if err != nil {
			return nil, err
		}
		req.URL.RawQuery = formValues.Encode()
	} else {
		req, err = http.NewRequest(method, fullURL, strings.NewReader(formValues.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	log.Printf("请求 URL: %s", req.URL.String())
	if method != "GET" && method != "DELETE" {
		log.Printf("请求体: %s", formValues.Encode())
	}

	req.Header.Set("Cookie", "PVEAuthCookie="+ticket)
	req.Header.Set("CSRFPreventionToken", config.CSRFToken)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("发送请求错误: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	log.Printf("响应状态: %s", resp.Status)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("读取响应体错误: %v", err)
		return nil, err
	}

	log.Printf("响应体: %s", string(body))

	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		log.Printf("解析 JSON 响应错误: %v", err)
		return nil, fmt.Errorf("解析 JSON 响应错误: %w (响应体: %s)", err, string(body))
	}

    if resp.StatusCode >= 400 {
        errMsg := fmt.Sprintf("API 请求失败，状态码 %s", resp.Status)
        if dataStr, ok := result["data"].(string); ok && dataStr != "" {
             errMsg = fmt.Sprintf("%s: %s", errMsg, dataStr)
        } else if errors, ok := result["errors"].(map[string]interface{}); ok {
             errMsg = fmt.Sprintf("%s: %v", errMsg, errors)
        } else if string(body) != "" {
             errMsg = fmt.Sprintf("%s: %s", errMsg, string(body))
        }
        return result, fmt.Errorf(errMsg)
    }

	return result, nil
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/container/create", createContainer).Methods("POST")
	r.HandleFunc("/container/{id}/resources", setContainerResources).Methods("POST")
	r.HandleFunc("/container/{id}/swap", setContainerSwap).Methods("POST")
	r.HandleFunc("/container/{id}/start", startContainer).Methods("POST")
	r.HandleFunc("/container/{id}/stop", stopContainer).Methods("POST")
	r.HandleFunc("/container/{id}/restart", restartContainer).Methods("POST")
	r.HandleFunc("/container/{id}/delete", deleteContainer).Methods("DELETE")

	log.Println("API 服务器正在 8080 端口运行...")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func generatePassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	length := 12

	password := make([]byte, length)
	for i := range password {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		password[i] = charset[n.Int64()]
	}

	return string(password)
}

func generateIP(id int) (string, string) {
	ip := net.ParseIP(config.Gateway)
	ip = ip.To4()
	ip[3] = byte(id)
	ipv4 := ip.String()

	ipv6 := net.ParseIP(config.IPv6Gateway)
	ipv6[15] = byte(id)

	return ipv4, ipv6.String()
}

func getNextId() (int, error) {
	result, err := apiRequest("GET", "/api2/json/cluster/nextid", nil)
	if err != nil {
		return 0, err
	}

    if data, ok := result["data"].(string); ok {
        nextId, err := strconv.Atoi(data)
        if err != nil {
            return 0, fmt.Errorf("无法将 nextid 转换为整数: %w", err)
        }
        log.Printf("获取到下一个可用 ID: %d", nextId)
        return nextId, nil
    }

	return 0, fmt.Errorf("未能从响应中获取 nextid: %v", result)
}

func createContainer(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Storage  string `json:"storage"`
		Template string `json:"template"`
		Hostname string `json:"hostname"`
		Memory   int    `json:"memory"`
		CPU      int    `json:"cpu"`
		Disk     int    `json:"disk"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("收到创建容器请求: %+v", request)

	nextId, err := getNextId()
	if err != nil {
		http.Error(w, "获取下一个可用 ID 失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	password := generatePassword()
	ip, ipv6 := generateIP(nextId)

	data := map[string]interface{}{
		"vmid":       nextId,
		"hostname":   request.Hostname,
		"cores":      request.CPU,
		"memory":     request.Memory,
		"ostemplate": fmt.Sprintf("local:vztmpl/%s", request.Template),
		"storage":    request.Storage,
		"rootfs":     fmt.Sprintf("%s:%d", request.Storage, request.Disk),
		"net0":       fmt.Sprintf("name=eth0,bridge=vmbr1,ip=%s/24,gw=%s,ip6=%s/64,gw6=%s", ip, config.Gateway, ipv6, config.IPv6Gateway),
		"password":   password,
		"start":      0,
	}

	result, err := apiRequest("POST", "/api2/json/nodes/"+config.Node+"/lxc", data)
	if err != nil {
		http.Error(w, "创建容器失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = db.Exec(`
        INSERT INTO containers (id, hostname, password, ip, ipv6, memory, cpu, disk, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, nextId, request.Hostname, password, ip, ipv6, request.Memory, request.CPU, request.Disk, "stopped")
	if err != nil {
		log.Printf("保存容器信息到数据库失败: %v", err)
	}

	response := map[string]interface{}{
		"id":       nextId,
		"hostname": request.Hostname,
		"password": password,
		"ip":       ip,
		"ipv6":     ipv6,
		"result":   result,
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func setContainerResources(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var resources struct {
		CPU    int `json:"cpu"`
		Memory int `json:"memory"`
		Disk   int `json:"disk"`
	}

	if err := json.NewDecoder(r.Body).Decode(&resources); err != nil {
		http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("收到为容器 %s 设置资源的请求: %+v", id, resources)

	configData := map[string]interface{}{}
    if resources.CPU > 0 {
        configData["cores"] = resources.CPU
    }
    if resources.Memory > 0 {
        configData["memory"] = resources.Memory
    }

    var finalResult = make(map[string]interface{})
    var err error

    if len(configData) > 0 {
        result, err := apiRequest("PUT", "/api2/json/nodes/"+config.Node+"/lxc/"+id+"/config", configData)
        if err != nil {
            http.Error(w, "设置 CPU 和内存失败: "+err.Error(), http.StatusInternalServerError)
            return
        }
		for k, v := range result { finalResult[k] = v }
    }


	if resources.Disk > 0 {
		resizeData := map[string]interface{}{
			"disk": "rootfs",
			"size": fmt.Sprintf("%dG", resources.Disk),
		}
		result, err := apiRequest("PUT", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/resize", config.Node, id), resizeData)
		if err != nil {
			http.Error(w, "调整磁盘大小失败: "+err.Error(), http.StatusInternalServerError)
			return
        }
        for k, v := range result { finalResult[k] = v }
	}

	_, err = db.Exec("UPDATE containers SET memory = ?, cpu = ?, disk = ? WHERE id = ?",
		resources.Memory, resources.CPU, resources.Disk, id)
	if err != nil {
		log.Printf("更新数据库中的容器信息失败: %v", err)
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(finalResult)
}

func setContainerSwap(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var swap struct {
		Size int `json:"size"`
	}

	if err := json.NewDecoder(r.Body).Decode(&swap); err != nil {
		http.Error(w, "解析请求体失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("收到为容器 %s 设置交换分区的请求: %+v", id, swap)

	data := map[string]interface{}{
		"swap": swap.Size,
	}

	result, err := apiRequest("PUT", "/api2/json/nodes/"+config.Node+"/lxc/"+id+"/config", data)
	if err != nil {
		http.Error(w, "设置交换分区失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

func containerAction(w http.ResponseWriter, r *http.Request, action string) {
    vars := mux.Vars(r)
    id := vars["id"]
    log.Printf("收到为容器 %s 执行 %s 的请求", id, action)

    var endpoint string
    var dbStatus string

    switch action {
    case "start":
        endpoint = "status/start"
        dbStatus = "running"
    case "stop":
        endpoint = "status/stop"
        dbStatus = "stopped"
    case "restart":
        endpoint = "status/reboot"
        dbStatus = "running"
    default:
        http.Error(w, "无效的操作", http.StatusBadRequest)
        return
    }

    result, err := apiRequest("POST", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/%s", config.Node, id, endpoint), nil)
    if err != nil {
        http.Error(w, fmt.Sprintf("执行 %s 操作失败: %s", action, err.Error()), http.StatusInternalServerError)
        return
    }

    _, err = db.Exec("UPDATE containers SET status = ? WHERE id = ?", dbStatus, id)
    if err != nil {
        log.Printf("更新数据库中容器状态失败: %v", err)
    }

    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}


func startContainer(w http.ResponseWriter, r *http.Request) {
	containerAction(w, r, "start")
}

func stopContainer(w http.ResponseWriter, r *http.Request) {
	containerAction(w, r, "stop")
}

func restartContainer(w http.ResponseWriter, r *http.Request) {
	containerAction(w, r, "restart")
}


func deleteContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
    log.Printf("收到删除容器 %s 的请求", id)

	stopData := map[string]interface{}{
		"force": 1,
        "timeout": 30,
	}
	_, err := apiRequest("POST", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/status/stop", config.Node, id), stopData)
	if err != nil {
		log.Printf("警告: 停止容器 %s 失败 (可能已停止): %v", id, err)
	} else {
        log.Printf("容器 %s 停止指令已发送", id)
    }

	time.Sleep(5 * time.Second)

	deleteData := map[string]interface{}{
		"force":    1,
		"purge":    1,
	}
	deleteResult, err := apiRequest("DELETE", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s", config.Node, id), deleteData)
	if err != nil {
		http.Error(w, "删除容器失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("容器 %s 删除结果: %v", id, deleteResult)

	_, err = db.Exec("DELETE FROM containers WHERE id = ?", id)
	if err != nil {
		log.Printf("从数据库移除容器 %s 信息失败: %v", id, err)
	}

    w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": fmt.Sprintf("容器 %s 删除请求已成功发起", id)})
}
