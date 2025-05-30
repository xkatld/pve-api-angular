<?php
require_once __DIR__ . '/../lib/auth.php';
require_login();
require_once __DIR__ . '/../lib/helpers.php';

$api_handler = get_api_handler();

$action = get_query_param('action');
$node = get_query_param('node');
$vmid = get_query_param('vmid');
$redirect_url = get_query_param('redirect', '../containers_list.php');


if (empty($action) || empty($node) || empty($vmid)) {
    $_SESSION['error_message'] = '缺少必要的操作参数。';
    header('Location: ' . $redirect_url);
    exit;
}

$response = null;
$operation_name = '';

switch ($action) {
    case 'start':
        $operation_name = '启动容器';
        $response = $api_handler->startContainer($node, $vmid);
        break;
    case 'stop':
        $operation_name = '停止容器';
        $response = $api_handler->stopContainer($node, $vmid);
        break;
    case 'shutdown':
        $operation_name = '关闭容器';
        $response = $api_handler->shutdownContainer($node, $vmid);
        break;
    case 'reboot':
        $operation_name = '重启容器';
        $response = $api_handler->rebootContainer($node, $vmid);
        break;
    case 'delete':
        if (get_post_param('confirm_delete') === 'yes') {
            $operation_name = '删除容器';
            $response = $api_handler->deleteContainer($node, $vmid);
        } else {
            $_SESSION['error_message'] = '删除操作未确认。';
            header('Location: ' . $redirect_url . '?node=' . eh($node) . '&vmid=' . eh($vmid));
            exit;
        }
        break;
    default:
        $_SESSION['error_message'] = '未知的操作。';
        header('Location: ' . $redirect_url);
        exit;
}

if ($response && isset($response['success'])) {
    if ($response['success']) {
        $task_id_info = isset($response['data']['task_id']) ? " (任务ID: " . eh($response['data']['task_id']) . ")" : "";
        $_SESSION['success_message'] = $operation_name . ' ' . eh($vmid) . ' 命令已发送。' . $task_id_info . (isset($response['message']) ? ' 消息: ' . eh($response['message']) : '');
    } else {
        $_SESSION['error_message'] = $operation_name . ' ' . eh($vmid) . ' 失败: ' . eh($response['message'] ?? '未知错误');
    }
} else {
    $_SESSION['error_message'] = $operation_name . ' ' . eh($vmid) . ' 时发生通讯错误或未知响应。';
}

header('Location: ' . $redirect_url);
exit;
?>
