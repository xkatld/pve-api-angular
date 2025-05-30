<?php
require_once __DIR__ . '/../templates/header.php';
$api_handler = get_api_handler();

$filter_node = get_query_param('filter_node');
$nodes_response = $api_handler->getNodes();
$nodes_for_filter = [];
if (isset($nodes_response['success']) && $nodes_response['success'] && !empty($nodes_response['data'])) {
    $nodes_for_filter = $nodes_response['data'];
}


$containers_response = $api_handler->getContainers($filter_node);

?>

<div class="container">
    <h2>容器列表</h2>

    <form method="GET" action="containers_list.php">
        <label for="filter_node">按节点筛选:</label>
        <select name="filter_node" id="filter_node">
            <option value="">所有节点</option>
            <?php foreach ($nodes_for_filter as $node_item): ?>
                <option value="<?php echo eh($node_item['node']); ?>" <?php echo ($filter_node === $node_item['node']) ? 'selected' : ''; ?>>
                    <?php echo eh($node_item['node']); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button type="submit">筛选</button>
        <a href="containers_list.php" class="button">清除筛选</a>
    </form>


    <?php if (isset($containers_response['success']) && $containers_response['success'] && isset($containers_response['containers'])): ?>
        <?php if (!empty($containers_response['containers'])): ?>
            <table>
                <thead>
                    <tr>
                        <th>VMID</th>
                        <th>名称</th>
                        <th>状态</th>
                        <th>节点</th>
                        <th>CPU</th>
                        <th>内存</th>
                        <th>总内存</th>
                        <th>在线时长</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($containers_response['containers'] as $ct): ?>
                        <tr>
                            <td><?php echo eh($ct['vmid']); ?></td>
                            <td><?php echo eh($ct['name'] ?? 'N/A'); ?></td>
                            <td><?php echo eh($ct['status']); ?></td>
                            <td><?php echo eh($ct['node']); ?></td>
                            <td><?php echo isset($ct['cpu']) ? round($ct['cpu'] * 100, 2) . '%' : 'N/A'; ?></td>
                            <td><?php echo isset($ct['mem']) ? eh(format_bytes($ct['mem'])) : 'N/A'; ?></td>
                            <td><?php echo isset($ct['maxmem']) ? eh(format_bytes($ct['maxmem'])) : 'N/A'; ?></td>
                            <td><?php echo isset($ct['uptime']) ? eh(format_uptime($ct['uptime'])) : 'N/A'; ?></td>
                            <td class="action-buttons">
                                <a href="view_container_status.php?node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button">状态</a>
                                <a href="view_container_console.php?node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button">控制台</a>
                                <?php if ($ct['status'] !== 'running'): ?>
                                    <a href="../lib/container_actions.php?action=start&node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button" onclick="return confirm('确定要启动容器 <?php echo eh($ct['vmid']); ?> 吗？');">启动</a>
                                <?php else: ?>
                                    <a href="../lib/container_actions.php?action=stop&node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button" onclick="return confirm('确定要强制停止容器 <?php echo eh($ct['vmid']); ?> 吗？此操作可能导致数据丢失！');">停止</a>
                                    <a href="../lib/container_actions.php?action=shutdown&node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button" onclick="return confirm('确定要关闭容器 <?php echo eh($ct['vmid']); ?> 吗？');">关闭</a>
                                    <a href="../lib/container_actions.php?action=reboot&node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button" onclick="return confirm('确定要重启容器 <?php echo eh($ct['vmid']); ?> 吗？');">重启</a>
                                <?php endif; ?>
                                <a href="rebuild_container_form.php?node=<?php echo eh($ct['node']); ?>&vmid=<?php echo eh($ct['vmid']); ?>" class="button">重建</a>
                                <button onclick="confirmDelete('<?php echo eh($ct['node']); ?>', '<?php echo eh($ct['vmid']); ?>')">删除</button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
             <form id="deleteForm" method="POST" action="../lib/container_actions.php?action=delete" style="display: none;">
                <input type="hidden" name="node" id="deleteNode">
                <input type="hidden" name="vmid" id="deleteVmid">
                <input type="hidden" name="confirm_delete" value="yes">
            </form>
        <?php else: ?>
            <p>没有找到容器。</p>
        <?php endif; ?>
    <?php elseif (isset($containers_response['success']) && !$containers_response['success']): ?>
        <p class="error">获取容器列表失败: <?php echo eh($containers_response['message'] ?? '未知错误'); ?></p>
    <?php else: ?>
        <p>无法获取容器列表或服务器未返回有效数据。</p>
    <?php endif; ?>
</div>
<script>
function confirmDelete(node, vmid) {
    if (confirm('警告：删除容器 ' + vmid + ' 是一个不可逆的操作，所有数据都将丢失！\n您确定要继续吗？')) {
        document.getElementById('deleteNode').value = node;
        document.getElementById('deleteVmid').value = vmid;
        document.getElementById('deleteForm').submit();
    }
}
</script>
<?php require_once __DIR__ . '/../templates/footer.php'; ?>
