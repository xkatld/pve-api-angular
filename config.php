<?php
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD_HASH', password_hash('您的安全密码', PASSWORD_DEFAULT));

$_SESSION['backend_servers'] = isset($_SESSION['backend_servers']) ? $_SESSION['backend_servers'] : [
    [
        'id' => 'pve1',
        'name' => 'Proxmox服务器1号',
        'url' => 'http://192.168.1.100:8000',
        'api_key' => '后端服务器1的GLOBAL_API_KEY'
    ]
];

if (!isset($_SESSION['selected_backend_id'])) {
    if (!empty($_SESSION['backend_servers'])) {
        $_SESSION['selected_backend_id'] = $_SESSION['backend_servers'][0]['id'];
    } else {
        $_SESSION['selected_backend_id'] = null;
    }
}

function get_backend_servers() {
    return isset($_SESSION['backend_servers']) ? $_SESSION['backend_servers'] : [];
}

function add_backend_server($id, $name, $url, $api_key) {
    if (!isset($_SESSION['backend_servers'])) {
        $_SESSION['backend_servers'] = [];
    }
    foreach ($_SESSION['backend_servers'] as $server) {
        if ($server['id'] === $id) {
            return false;
        }
    }
    $_SESSION['backend_servers'][] = ['id' => $id, 'name' => $name, 'url' => $url, 'api_key' => $api_key];
    if (count($_SESSION['backend_servers']) === 1) {
        $_SESSION['selected_backend_id'] = $id;
    }
    return true;
}

function update_backend_server($original_id, $new_id, $name, $url, $api_key) {
    if (!isset($_SESSION['backend_servers'])) {
        return false;
    }
    foreach ($_SESSION['backend_servers'] as $key => $server) {
        if ($server['id'] === $original_id) {
            $_SESSION['backend_servers'][$key] = ['id' => $new_id, 'name' => $name, 'url' => $url, 'api_key' => $api_key];
            if ($_SESSION['selected_backend_id'] === $original_id) {
                $_SESSION['selected_backend_id'] = $new_id;
            }
            return true;
        }
    }
    return false;
}


function remove_backend_server($id) {
    if (!isset($_SESSION['backend_servers'])) {
        return false;
    }
    foreach ($_SESSION['backend_servers'] as $key => $server) {
        if ($server['id'] === $id) {
            unset($_SESSION['backend_servers'][$key]);
            $_SESSION['backend_servers'] = array_values($_SESSION['backend_servers']);
            if ($_SESSION['selected_backend_id'] === $id) {
                $_SESSION['selected_backend_id'] = !empty($_SESSION['backend_servers']) ? $_SESSION['backend_servers'][0]['id'] : null;
            }
            return true;
        }
    }
    return false;
}

function get_selected_backend() {
    if (!isset($_SESSION['selected_backend_id']) || !isset($_SESSION['backend_servers'])) {
        return null;
    }
    foreach ($_SESSION['backend_servers'] as $server) {
        if ($server['id'] === $_SESSION['selected_backend_id']) {
            return $server;
        }
    }
    return null;
}
?>
