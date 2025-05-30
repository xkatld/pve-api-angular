<?php
require_once __DIR__ . '/../templates/header.php';
$api_handler = get_api_handler();
$nodes_response = $api_handler->getNodes();
?>

<div class="container">
    <h2>节点列表</h2>

    <?php if (isset($nodes_response['success']) && $nodes_response['success'] && !empty($nodes_response['data'])): ?>
        <table>
            <thead>
                <tr>
                    <th>节点名称 (Node)</th>
                    <th>状态 (Status)</th>
                    <th>CPU使用率 (CPU)</th>
                    <th>CPU核心数 (MaxCPU)</th>
                    <th>内存使用量 (Mem)</th>
                    <th>总内存 (MaxMem)</th>
                    <th>磁盘使用量 (Disk)</th>
                    <th>总磁盘 (MaxDisk)</th>
                    <th>在线时长 (Uptime)</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($nodes_response['data'] as $node): ?>
                    <tr>
                        <td><?php echo eh($node['node']); ?></td>
                        <td><?php echo eh($node['status']); ?></td>
                        <td><?php echo isset($node['cpu']) ? round($node['cpu'] * 100, 2) . '%' : 'N/A'; ?></td>
                        <td><?php echo eh($node['maxcpu'] ?? 'N/A'); ?></td>
                        <td><?php echo isset($node['mem']) ? eh(format_bytes($node['mem'])) : 'N/A'; ?></td>
                        <td><?php echo isset($node['maxmem']) ? eh(format_bytes($node['maxmem'])) : 'N/A'; ?></td>
                        <td><?php echo isset($node['disk']) ? eh(format_bytes($node['disk'])) : 'N/A'; ?></td>
                        <td><?php echo isset($node['maxdisk']) ? eh(format_bytes($node['maxdisk'])) : 'N/A'; ?></td>
                        <td><?php echo isset($node['uptime']) ? eh(format_uptime($node['uptime'])) : 'N/A'; ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php elseif (isset($nodes_response['success']) && !$nodes_response['success']): ?>
        <p class="error">获取节点列表失败: <?php echo eh($nodes_response['message']); ?></p>
    <?php else: ?>
        <p>没有可用的节点信息，或者无法连接到后端服务器。</p>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/../templates/footer.php'; ?>
