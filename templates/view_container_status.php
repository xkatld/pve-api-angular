<?php
require_once __DIR__ . '/../templates/header.php';
$api_handler = get_api_handler();

$node = get_query_param('node');
$vmid = get_query_param('vmid');

if (empty($node) || empty($vmid)) {
    echo "<p class='error'>错误：缺少节点或VMID参数。</p>";
    require_once __DIR__ . '/../templates/footer.php';
    exit;
}

$status_response = $api_handler->getContainerStatus($node, $vmid);
?>
<div class="container">
    <h2>容器状态: <?php echo eh($vmid); ?> (节点: <?php echo eh($node); ?>)</h2>

    <?php if (isset($status_response['success']) && $status_response['success'] && !empty($status_response)): ?>
        <?php $ct_status = $status_response; ?>
        <table>
            <tr><th>VMID</th><td><?php echo eh($ct_status['vmid']); ?></td></tr>
            <tr><th>名称</th><td><?php echo eh($ct_status['name'] ?? 'N/A'); ?></td></tr>
            <tr><th>状态</th><td><?php echo eh($ct_status['status']); ?></td></tr>
            <tr><th>节点</th><td><?php echo eh($ct_status['node']); ?></td></tr>
            <tr><th>CPU 使用率</th><td><?php echo isset($ct_status['cpu']) ? round($ct_status['cpu'] * 100, 2) . '%' : 'N/A'; ?></td></tr>
            <tr><th>内存使用量</th><td><?php echo isset($ct_status['mem']) ? eh(format_bytes($ct_status['mem'])) : 'N/A'; ?></td></tr>
            <tr><th>总内存</th><td><?php echo isset($ct_status['maxmem']) ? eh(format_bytes($ct_status['maxmem'])) : 'N/A'; ?></td></tr>
            <tr><th>在线时长</th><td><?php echo isset($ct_status['uptime']) ? eh(format_uptime($ct_status['uptime'])) : 'N/A'; ?></td></tr>
            <tr><th>是否为模板</th><td><?php echo isset($ct_status['template']) && $ct_status['template'] ? '是' : '否'; ?></td></tr>
        </table>
        <p><a href="containers_list.php?filter_node=<?php echo eh($node); ?>" class="button">返回容器列表</a></p>
    <?php elseif (isset($status_response['success']) && !$status_response['success']): ?>
        <p class="error">获取容器状态失败: <?php echo eh($status_response['message']); ?></p>
    <?php else: ?>
        <p>无法获取容器 <?php echo eh($vmid); ?> 的状态信息。</p>
    <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../templates/footer.php'; ?>
