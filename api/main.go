package main

import (
    "bytes"
    "crypto/tls"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "net/url"
    "strconv"

    "github.com/gorilla/mux"
)

// Config structure
type Config struct {
    ProxmoxURL string `json:"proxmox_url"`
    Username   string `json:"username"`
    Password   string `json:"password"`
    Node       string `json:"node"`
    CSRFToken  string
}

var config Config
var client *http.Client
var ticket string

func init() {
    loadConfig("config.json")

    tr := &http.Transport{
        TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
    }
    client = &http.Client{Transport: tr}

    login()
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

func apiRequest(method, path string, data map[string]interface{}) (map[string]interface{}, error) {
    var req *http.Request
    var err error

    fullURL := config.ProxmoxURL + path
    log.Printf("Preparing %s request to %s", method, fullURL)

    if method == "GET" {
        req, err = http.NewRequest(method, fullURL, nil)
    } else {
        jsonData, _ := json.Marshal(data)
        req, err = http.NewRequest(method, fullURL, bytes.NewBuffer(jsonData))
        req.Header.Set("Content-Type", "application/json")
        log.Printf("Request body: %s", string(jsonData))
    }

    if err != nil {
        log.Printf("Error creating request: %v", err)
        return nil, err
    }

    req.Header.Set("Cookie", "PVEAuthCookie="+ticket)
    req.Header.Set("CSRFPreventionToken", config.CSRFToken)
    log.Printf("Request headers: %v", req.Header)

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
    r.HandleFunc("/container/{id}/network", setContainerNetwork).Methods("POST")

    log.Println("API server is running on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", r))
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

    data := map[string]interface{}{
        "vmid":       nextId,
        "hostname":   request.Hostname,
        "cores":      request.CPU,
        "memory":     request.Memory,
        "ostemplate": fmt.Sprintf("local:vztmpl/%s", request.Template),
        "storage":    request.Storage,
        "rootfs":     fmt.Sprintf("%s:%d", request.Storage, request.Disk),
    }

    result, err := apiRequest("POST", "/api2/json/nodes/"+config.Node+"/lxc", data)
    if err != nil {
        http.Error(w, "Failed to create container: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
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
        http.Error(w, "Failed to set resources: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}

func setContainerNetwork(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    var network struct {
        Bandwidth int `json:"bandwidth"`
        SSHPort   int `json:"ssh_port"`
        NATStart  int `json:"nat_start"`
        NATEnd    int `json:"nat_end"`
    }

    if err := json.NewDecoder(r.Body).Decode(&network); err != nil {
        http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
        return
    }

    log.Printf("Received set network request for container %s: %+v", id, network)

    data := map[string]interface{}{
        "net0": fmt.Sprintf("name=eth0,bridge=vmbr0,rate=%d", network.Bandwidth),
    }

    result, err := apiRequest("PUT", "/api2/json/nodes/"+config.Node+"/lxc/"+id+"/config", data)
    if err != nil {
        http.Error(w, "Failed to set network: "+err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
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
