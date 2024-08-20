package main

import (
    "bytes"
    "crypto/rand"
    "crypto/tls"
    "database/sql"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "math/big"
    "net"
    "net/http"
    "net/url"
    "strconv"
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
    data, err := ioutil.ReadFile(filename)
    if err != nil {
        log.Fatal("Failed to read config file:", err)
    }
    err = json.Unmarshal(data, &config)
    if err != nil {
        log.Fatal("Failed to parse config file:", err)
    }
    log.Printf("Loaded config: %+v", config)
}

func login() {
    data := url.Values{}
    data.Set("username", config.Username)
    data.Set("password", config.Password)

    log.Printf("Attempting to login with username: %s", config.Username)
    resp, err := client.PostForm(config.ProxmoxURL+"/api2/json/access/ticket", data)
    if err != nil {
        log.Fatal("Login failed:", err)
    }
    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        log.Fatal("Failed to read login response:", err)
    }
    log.Printf("Login response: %s", string(body))

    var result map[string]interface{}
    err = json.Unmarshal(body, &result)
    if err != nil {
        log.Fatal("Failed to parse login response:", err)
    }

    if data, ok := result["data"].(map[string]interface{}); ok {
        if ticketValue, ok := data["ticket"].(string); ok {
            ticket = ticketValue
            log.Printf("Login successful, got ticket: %s", ticket)
        } else {
            log.Fatal("Ticket not found in login response")
        }
        if csrfToken, ok := data["CSRFPreventionToken"].(string); ok {
            config.CSRFToken = csrfToken
            log.Printf("Got CSRF token: %s", config.CSRFToken)
        } else {
            log.Fatal("CSRF token not found in login response")
        }
    } else {
        log.Fatal("Unexpected login response structure")
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
}

func apiRequest(method, path string, data map[string]interface{}) (map[string]interface{}, error) {
    var req *http.Request
    var err error

    fullURL := config.ProxmoxURL + path
    log.Printf("Preparing %s request to %s", method, fullURL)

    if method == "GET" || method == "DELETE" {
        req, err = http.NewRequest(method, fullURL, nil)
        if err != nil {
            return nil, err
        }
        q := req.URL.Query()
        for k, v := range data {
            q.Add(k, fmt.Sprintf("%v", v))
        }
        req.URL.RawQuery = q.Encode()
    } else {
        jsonData, _ := json.Marshal(data)
        req, err = http.NewRequest(method, fullURL, bytes.NewBuffer(jsonData))
        if err != nil {
            return nil, err
        }
        req.Header.Set("Content-Type", "application/json")
    }

    log.Printf("Request URL: %s", req.URL.String())
    log.Printf("Request headers: %v", req.Header)

    req.Header.Set("Cookie", "PVEAuthCookie="+ticket)
    req.Header.Set("CSRFPreventionToken", config.CSRFToken)

    resp, err := client.Do(req)
    if err != nil {
        log.Printf("Error sending request: %v", err)
        return nil, err
    }
    defer resp.Body.Close()

    log.Printf("Response status: %s", resp.Status)

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        log.Printf("Error reading response body: %v", err)
        return nil, err
    }

    log.Printf("Response body: %s", string(body))

    var result map[string]interface{}
    err = json.Unmarshal(body, &result)
    if err != nil {
        log.Printf("Error parsing JSON response: %v", err)
        return nil, err
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

    log.Println("API server is running on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", r))
}

func generatePassword() string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"
    length := 16

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

    nextId, err := strconv.Atoi(result["data"].(string))
    if err != nil {
        return 0, err
    }

    log.Printf("Got next available ID: %d", nextId)
    return nextId, nil
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
        http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
        return
    }

    log.Printf("Received create container request: %+v", request)

    nextId, err := getNextId()
    if err != nil {
        http.Error(w, "Failed to get next available ID: "+err.Error(), http.StatusInternalServerError)
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
    }

    result, err := apiRequest("POST", "/api2/json/nodes/"+config.Node+"/lxc", data)
    if err != nil {
        http.Error(w, "Failed to create container: "+err.Error(), http.StatusInternalServerError)
        return
    }

    _, err = db.Exec(`
        INSERT INTO containers (id, hostname, password, ip, ipv6, memory, cpu, disk, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, nextId, request.Hostname, password, ip, ipv6, request.Memory, request.CPU, request.Disk, "stopped")
    if err != nil {
        log.Printf("Failed to save container info to database: %v", err)
    }

    response := map[string]interface{}{
        "id":       nextId,
        "hostname": request.Hostname,
        "password": password,
        "ip":       ip,
        "ipv6":     ipv6,
        "result":   result,
    }

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
        http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
        return
    }

    log.Printf("Received set resources request for container %s: %+v", id, resources)

    data := map[string]interface{}{
        "cores":  resources.CPU,
        "memory": resources.Memory,
    }

    result, err := apiRequest("PUT", "/api2/json/nodes/"+config.Node+"/lxc/"+id+"/config", data)
    if err != nil {
        http.Error(w, "Failed to set CPU and Memory: "+err.Error(), http.StatusInternalServerError)
        return
    }

    if resources.Disk > 0 {
        resizeData := map[string]interface{}{
            "disk": "rootfs",
            "size": fmt.Sprintf("%dG", resources.Disk),
        }
        resizeResult, err := apiRequest("PUT", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/resize", config.Node, id), resizeData)
        if err != nil {
            http.Error(w, "Failed to resize disk: "+err.Error(), http.StatusInternalServerError)
            return
        }
        for k, v := range resizeResult {
            result[k] = v
        }
    }

    _, err = db.Exec("UPDATE containers SET memory = ?, cpu = ?, disk = ? WHERE id = ?", 
        resources.Memory, resources.CPU, resources.Disk, id)
    if err != nil {
        log.Printf("Failed to update container info in database: %v", err)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func setContainerSwap(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    var swap struct {
        Size int `json:"size"`
    }

    if err := json.NewDecoder(r.Body).Decode(&swap); err != nil {
        http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
        return
    }

    log.Printf("Received set swap request for container %s: %+v", id, swap)

    data := map[string]interface{}{
        "swap": swap.Size,
    }

    result, err := apiRequest("PUT", "/api2/json/nodes/"+config.Node+"/lxc/"+id+"/config", data)
    if err != nil {
        http.Error(w, "Failed to set swap: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func startContainer(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    result, err := apiRequest("POST", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/status/start", config.Node, id), nil)
    if err != nil {
        http.Error(w, "Failed to start container: "+err.Error(), http.StatusInternalServerError)
        return
    }

    _, err = db.Exec("UPDATE containers SET status = 'running' WHERE id = ?", id)
    if err != nil {
        log.Printf("Failed to update container status in database: %v", err)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func stopContainer(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    result, err := apiRequest("POST", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/status/stop", config.Node, id), nil)
    if err != nil {
        http.Error(w, "Failed to stop container: "+err.Error(), http.StatusInternalServerError)
        return
    }

    _, err = db.Exec("UPDATE containers SET status = 'stopped' WHERE id = ?", id)
    if err != nil {
        log.Printf("Failed to update container status in database: %v", err)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func restartContainer(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    result, err := apiRequest("POST", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/status/restart", config.Node, id), nil)
    if err != nil {
        http.Error(w, "Failed to restart container: "+err.Error(), http.StatusInternalServerError)
        return
    }

    _, err = db.Exec("UPDATE containers SET status = 'running' WHERE id = ?", id)
    if err != nil {
        log.Printf("Failed to update container status in database: %v", err)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func deleteContainer(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    stopData := map[string]interface{}{
        "force": 1,
    }
    stopResult, err := apiRequest("POST", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s/status/stop", config.Node, id), stopData)
    if err != nil {
        log.Printf("Warning: Failed to stop container: %v", err)
    } else {
        log.Printf("Container stop result: %v", stopResult)
    }

    time.Sleep(5 * time.Second)

    deleteData := map[string]interface{}{
        "force": 1,
    }
    deleteResult, err := apiRequest("DELETE", fmt.Sprintf("/api2/json/nodes/%s/lxc/%s", config.Node, id), deleteData)
    if err != nil {
        http.Error(w, "Failed to delete container: "+err.Error(), http.StatusInternalServerError)
        return
    }

    log.Printf("Container delete result: %v", deleteResult)

    if deleteResult["data"] == nil {
        http.Error(w, "Failed to delete container: unexpected response", http.StatusInternalServerError)
        return
    }

    _, err = db.Exec("DELETE FROM containers WHERE id = ?", id)
    if err != nil {
        log.Printf("Failed to remove container info from database: %v", err)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "Container deletion initiated successfully"})
}

func getContainerFromDB(id string) (*Container, error) {
    var container Container
    err := db.QueryRow("SELECT id, hostname, password, ip, ipv6, memory, cpu, disk, status FROM containers WHERE id = ?", id).
        Scan(&container.ID, &container.Hostname, &container.Password, &container.IP, &container.IPv6, 
             &container.Memory, &container.CPU, &container.Disk, &container.Status)
    if err != nil {
        return nil, err
    }
    return &container, nil
}

func updateContainerInDB(container *Container) error {
    _, err := db.Exec("UPDATE containers SET hostname = ?, password = ?, ip = ?, ipv6 = ?, memory = ?, cpu = ?, disk = ?, status = ? WHERE id = ?",
        container.Hostname, container.Password, container.IP, container.IPv6, 
        container.Memory, container.CPU, container.Disk, container.Status, container.ID)
    return err
}

