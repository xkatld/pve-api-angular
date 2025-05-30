<?php
require_once __DIR__ . '/../lib/auth.php';
require_login();
$current_page = basename($_SERVER['PHP_SELF']);
$selected_backend = get_selected_backend();
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proxmox LXC Web 面板</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header>
        <div class="header-container">
            <h1>Proxmox LXC Web 面板</h1>
            <nav>
                <ul>
                    <li><a href="dashboard.php" class="<?php echo $current_page === 'dashboard.php' ? 'active' : ''; ?>">仪表盘</a></li>
                    <li><a href="manage_backends.php" class="<?php echo $current_page === 'manage_backends.php' ? 'active' : ''; ?>">后端管理</a></li>
                    <?php if ($selected_backend): ?>
                    <li><a href="nodes_list.php" class="<?php echo $current_page === 'nodes_list.php' ? 'active' : ''; ?>">节点列表</a></li>
                    <li><a href="containers_list.php" class="<?php echo $current_page === 'containers_list.php' ? 'active' : ''; ?>">容器列表</a></li>
                    <li><a href="create_container_form.php" class="<?php echo $current_page === 'create_container_form.php' ? 'active' : ''; ?>">创建容器</a></li>
                    <?php endif; ?>
                    <li><a href="logout.php">退出登录</a></li>
                </ul>
            </nav>
        </div>
        <?php if ($selected_backend): ?>
        <div class="current-backend-indicator">
            当前操作后端: <?php echo htmlspecialchars($selected_backend['name']); ?> (<?php echo htmlspecialchars($selected_backend['url']); ?>)
        </div>
        <?php elseif ($current_page !== 'manage_backends.php' && $current_page !== 'login.php'): ?>
        <div class="current-backend-indicator" style="background-color: #ffc107; color: #333;">
            请先在“后端管理”中添加并选择一个后端服务器。
        </div>
        <?php endif; ?>
    </header>
    <main>
