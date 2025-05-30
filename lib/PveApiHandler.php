<?php
class PveApiHandler {
    private $base_url;
    private $api_key;

    public function __construct($base_url, $api_key) {
        $this->base_url = rtrim($base_url, '/');
        $this->api_key = $api_key;
    }

    private function request($method, $endpoint, $data = null) {
        $url = $this->base_url . '/api/v1' . $endpoint;
        $headers = [
            'Authorization: Bearer ' . $this->api_key,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($data !== null && ($method === 'POST' || $method === 'PUT' || $method === 'PATCH')) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($data !== null && $method === 'GET') {
            $url .= '?' . http_build_query($data);
            curl_setopt($ch, CURLOPT_URL, $url);
        }
        
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error_no = curl_errno($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error_no) {
            return ['success' => false, 'message' => "cURL请求错误: " . $curl_error . " (代码: " . $curl_error_no . ")", 'status_code' => 0, 'data' => null];
        }
        
        $decoded_response = json_decode($response, true);

        if ($http_code >= 200 && $http_code < 300) {
             if (is_array($decoded_response) && isset($decoded_response['success']) && $decoded_response['success'] === true) {
                return $decoded_response;
            } elseif (is_array($decoded_response)) {
                return ['success' => true, 'message' => '请求成功但后端未明确指出成功状态。', 'data' => $decoded_response, 'status_code' => $http_code];
            } else {
                return ['success' => true, 'message' => '请求成功，但响应不是预期的JSON格式或不包含success字段。', 'data' => $response, 'status_code' => $http_code];
            }
        } elseif (is_array($decoded_response) && isset($decoded_response['detail'])) {
             return ['success' => false, 'message' => $decoded_response['detail'], 'status_code' => $http_code, 'data' => $decoded_response];
        } else {
            return ['success' => false, 'message' => "API请求失败，HTTP状态码: " . $http_code . ". 响应: " . substr($response, 0, 200), 'status_code' => $http_code, 'data' => null];
        }
    }

    public function getNodes() {
        return $this->request('GET', '/nodes');
    }

    public function getNodeTemplates($node) {
        return $this->request('GET', "/nodes/{$node}/templates");
    }

    public function getNodeStorages($node) {
        return $this->request('GET', "/nodes/{$node}/storages");
    }
    
    public function getNodeNetworks($node) {
        return $this->request('GET', "/nodes/{$node}/networks");
    }

    public function getContainers($node = null) {
        $endpoint = '/containers';
        $params = [];
        if ($node) {
            $params['node'] = $node;
        }
        return $this->request('GET', $endpoint, $params);
    }

    public function createContainer($container_data) {
        return $this->request('POST', '/containers', $container_data);
    }

    public function getContainerStatus($node, $vmid) {
        return $this->request('GET', "/containers/{$node}/{$vmid}/status");
    }

    public function startContainer($node, $vmid) {
        return $this->request('POST', "/containers/{$node}/{$vmid}/start");
    }

    public function stopContainer($node, $vmid) {
        return $this->request('POST', "/containers/{$node}/{$vmid}/stop");
    }

    public function shutdownContainer($node, $vmid) {
        return $this->request('POST', "/containers/{$node}/{$vmid}/shutdown");
    }

    public function rebootContainer($node, $vmid) {
        return $this->request('POST', "/containers/{$node}/{$vmid}/reboot");
    }

    public function deleteContainer($node, $vmid) {
        return $this->request('DELETE', "/containers/{$node}/{$vmid}");
    }
    
    public function rebuildContainer($node, $vmid, $rebuild_data) {
        return $this->request('POST', "/containers/{$node}/{$vmid}/rebuild", $rebuild_data);
    }

    public function getTaskStatus($node, $task_id) {
        return $this->request('GET', "/tasks/{$node}/{$task_id}");
    }
    
    public function getContainerConsole($node, $vmid) {
        return $this->request('POST', "/containers/{$node}/{$vmid}/console");
    }
}
?>
