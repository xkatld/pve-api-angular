<?php
require_once __DIR__ . '/templates/header.php';

$backend_servers = get_backend_servers();
$selected_backend_id = $_SESSION['selected_backend_id'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['select_backend'])) {
    $new_selected_id = $_POST['backend_id'];
    $found = false;
    foreach ($backend_servers as $server) {
        if ($server['id'] === $new_selected_id) {
            $_SESSION['selected_backend_id'] = $new_selected_id;
            $selected_backend_id = $new_selected_id; // Update for current page view
            $found = true;
            break;
        }
    }
    if ($found) {
        header("Location: dashboard.php"); // Refresh to apply selection globally via session
        exit;
    }
}

$selected_backend = get_selected_backend(); // Get the updated selected backend

?>

<div class="container">
    <h2>仪表盘</h2>
    <p>欢迎来到 Proxmox LXC Web 面板。</p>

    <h3>选择操作的后端服务器</h3>
    <?php if (!empty($backend_servers)): ?>
    <form method="POST" action="dashboard.php">
        <label for="backend_id">选择后端:</label>
        <select name="backend_id" id="backend_id">
            <?php foreach ($backend_servers as $server): ?>
            <option value="<?php echo eh($server['id']); ?>" <?php echo ($server['id'] === $selected_backend_id) ? 'selected' : ''; ?>>
                <?php echo eh($server['name']); ?> (API: <?php echo eh($server['api_url']); ?> | PVE: <?php echo eh($server['pve_url'] ?? 'N/A'); ?>)
            </option>
            <?php endforeach; ?>
        </select>
        <button type="submit" name="select_backend">切换后端</button>
    </form>
    <?php else: ?>
    <p>没有配置后端服务器。请先前往 <a href="manage_backends.php">后端管理</a> 添加服务器。</p>
    <?php endif; ?>

    <?php if ($selected_backend): ?>
    <h3>当前后端: <?php echo eh($selected_backend['name']); ?></h3>
    <p>API 服务 URL: <?php echo eh($selected_backend['api_url']); ?></p>
    <p>Proxmox VE URL: <?php echo eh($selected_backend['pve_url'] ?? '未设置，部分功能如控制台可能无法使用'); ?></p>
    <p>您现在可以对选定的后端服务器执行操作了。</p>
    <ul>
        <li><a href="nodes_list.php">查看节点列表</a></li>
        <li><a href="containers_list.php">查看容器列表</a></li>
        <li><a href="create_container_form.php">创建新容器</a></li>
    </ul>
    <?php elseif (!empty($backend_servers)): ?>
    <p>请从上方选择一个后端服务器以继续操作。</p>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/templates/footer.php'; ?>
