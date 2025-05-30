<?php
function eh($string) {
    return htmlspecialchars((string)$string, ENT_QUOTES, 'UTF-8');
}

function display_session_messages() {
    $output = '';
    if (isset($_SESSION['success_message']) && !empty($_SESSION['success_message'])) {
        $output .= '<p class="success">' . eh($_SESSION['success_message']) . '</p>';
        unset($_SESSION['success_message']);
    }
    if (isset($_SESSION['error_message']) && !empty($_SESSION['error_message'])) {
        $output .= '<p class="error">' . eh($_SESSION['error_message']) . '</p>';
        unset($_SESSION['error_message']);
    }
    return $output;
}

function format_bytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= (1 << (10 * $pow));
    return round($bytes, $precision) . ' ' . $units[$pow];
}

function format_uptime($seconds) {
    if ($seconds <= 0) {
        return '0 秒';
    }
    $days = floor($seconds / (60 * 60 * 24));
    $seconds -= $days * (60 * 60 * 24);
    $hours = floor($seconds / (60 * 60));
    $seconds -= $hours * (60 * 60);
    $minutes = floor($seconds / 60);
    $seconds -= $minutes * 60;

    $result = '';
    if ($days > 0) {
        $result .= $days . ' 天 ';
    }
    if ($hours > 0) {
        $result .= $hours . ' 小时 ';
    }
    if ($minutes > 0) {
        $result .= $minutes . ' 分钟 ';
    }
    if ($seconds > 0 || empty($result)) {
        $result .= $seconds . ' 秒';
    }
    return trim($result);
}

function get_api_handler() {
    $selected_backend = get_selected_backend();
    if (!$selected_backend) {
        $_SESSION['error_message'] = '请先选择一个后端服务器。';
        header('Location: manage_backends.php');
        exit;
    }
    require_once __DIR__ . '/PveApiHandler.php';
    return new PveApiHandler($selected_backend['url'], $selected_backend['api_key']);
}

function get_query_param($name, $default = null) {
    return isset($_GET[$name]) ? $_GET[$name] : $default;
}

function get_post_param($name, $default = null) {
    return isset($_POST[$name]) ? $_POST[$name] : $default;
}

?>
