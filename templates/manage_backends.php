<?php
require_once __DIR__ . '/templates/header.php';

$error_message = '';
$success_message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action_taken = false;
    if (isset($_POST['add_backend'])) {
        $action_taken = true;
        $id = trim($_POST['id']);
        $name = trim($_POST['name']);
        $api_url = trim($_POST['api_url']);
        $pve_url = trim($_POST['pve_url']);
        $api_key = trim($_POST['api_key']);
        if (!empty($id) && !empty($name) && !empty($api_url) && !empty($pve_url) && !empty($api_key)) {
            if (add_backend_server($id, $name, $api_url, $pve_url, $api_key)) {
                $success_message = "后端服务器 '{$name}' 添加成功。";
            } else {
                $error_message = "无法添加后端服务器，ID '{$id}' 可能已存在。";
            }
        } else {
            $error_message = "所有字段（ID, 后端名称, API服务URL, PVE URL, API密钥）均为必填项。";
        }
    } elseif (isset($_POST['update_backend'])) {
        $action_taken = true;
        $original_id = trim($_POST['original_id']);
        $id = trim($_POST['id']);
        $name = trim($_POST['name']);
        $api_url = trim($_POST['api_url']);
        $pve_url = trim($_POST['pve_url']);
        $api_key = trim($_POST['api_key']);
        if (!empty($id) && !empty($name) && !empty($api_url) && !empty($pve_url) && !empty($api_key) && !empty($original_id)) {
            if (update_backend_server($original_id, $id, $name, $api_url, $pve_url, $api_key)) {
                $success_message = "后端服务器 '{$name}' 更新成功。";
            } else {
                $error_message = "无法更新后端服务器 '{$original_id}'。";
            }
        } else {
            $error_message = "所有字段（ID, 后端名称, API服务URL, PVE URL, API密钥）均为必填项。";
        }
    } elseif (isset($_POST['delete_backend'])) {
        $action_taken = true;
        $id = $_POST['id'];
        if (remove_backend_server($id)) {
            $success_message = "后端服务器 '{$id}' 删除成功。";
        } else {
            $error_message = "无法删除后端服务器 '{$id}'。";
        }
    } elseif (isset($_POST['select_backend_and_redirect'])) {
         $action_taken = true;
         $selected_id = $_POST['backend_id_to_select'];
         $_SESSION['selected_backend_id'] = $selected_id;
         header('Location: dashboard.php'); // Redirect to dashboard after selection
         exit;
    }

    if ($action_taken) { // Redirect only if an action was processed to prevent issues with GET params on refresh
        $_SESSION['success_message'] = $success_message; // Store messages in session
        $_SESSION['error_message'] = $error_message;
        header("Location: manage_backends.php");
        exit;
    }
}

// Retrieve messages from session for display
$success_message = $_SESSION['success_message'] ?? '';
$error_message = $_SESSION['error_message'] ?? '';
unset($_SESSION['success_message'], $_SESSION['error_message']); // Clear after displaying

$backend_servers = get_backend_servers();
$editing_backend = null;
if (isset($_GET['edit'])) {
    $edit_id = $_GET['edit'];
    foreach ($backend_servers as $server) {
        if ($server['id'] === $edit_id) {
            $editing_backend = $server;
            break;
        }
    }
}
?>

<div class="container">
    <h2>后端服务器管理</h2>

    <?php if ($success_message): ?>
        <p class="success"><?php echo eh($success_message); ?></p>
    <?php endif; ?>
    <?php if ($error_message): ?>
        <p class="error"><?php echo eh($error_message); ?></p>
    <?php endif; ?>

    <h3><?php echo $editing_backend ? '编辑后端服务器' : '添加新的后端服务器'; ?></h3>
    <form method="POST" action="manage_backends.php">
        <?php if ($editing_backend): ?>
            <input type="hidden" name="original_id" value="<?php echo eh($editing_backend['id']); ?>">
        <?php endif; ?>
        <div>
            <label for="id">唯一ID:</label>
            <input type="text" id="id" name="id" value="<?php echo $editing_backend ? eh($editing_backend['id']) : ''; ?>" required <?php echo $editing_backend ? '' : ''; ?>>
            <small>例如: pve-main, backup-server (请使用英文、数字、下划线或短横线)</small>
        </div>
        <div>
            <label for="name">后端名称:</label>
            <input type="text" id="name" name="name" value="<?php echo $editing_backend ? eh($editing_backend['name']) : ''; ?>" required>
            <small>例如: 主力Proxmox集群, 实验室PVE</small>
        </div>
        <div>
            <label for="api_url">API 服务 URL:</label>
            <input type="url" id="api_url" name="api_url" value="<?php echo $editing_backend ? eh($editing_backend['api_url']) : ''; ?>" placeholder="例如: http://192.168.1.10:8000" required>
            <small>pve-lxc-server的完整访问地址，包含http/https和端口</small>
        </div>
        <div>
            <label for="pve_url">PVE URL:</label>
            <input type="url" id="pve_url" name="pve_url" value="<?php echo $editing_backend ? eh($editing_backend['pve_url'] ?? '') : ''; ?>" placeholder="例如: https://192.168.1.10:8006" required>
            <small>Proxmox VE Web界面的完整访问地址，包含http/https和端口 (用于控制台等功能)</small>
        </div>
        <div>
            <label for="api_key">API密钥:</label>
            <input type="password" id="api_key" name="api_key" value="<?php echo $editing_backend ? eh($editing_backend['api_key']) : ''; ?>" required>
            <small>pve-lxc-server在.env文件中配置的GLOBAL_API_KEY</small>
        </div>
        <?php if ($editing_backend): ?>
            <button type="submit" name="update_backend">更新服务器</button>
            <a href="manage_backends.php" class="button">取消编辑</a>
        <?php else: ?>
            <button type="submit" name="add_backend">添加服务器</button>
        <?php endif; ?>
    </form>

    <h3>已配置的后端服务器</h3>
    <?php if (!empty($backend_servers)): ?>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>后端名称</th>
                <th>API 服务 URL</th>
                <th>PVE URL</th>
                <th>API密钥 (部分显示)</th>
                <th>操作</th>
                <th>选择并跳转至仪表盘</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($backend_servers as $server): ?>
            <tr>
                <td><?php echo eh($server['id']); ?></td>
                <td><?php echo eh($server['name']); ?></td>
                <td><?php echo eh($server['api_url']); ?></td>
                <td><?php echo eh($server['pve_url'] ?? '未设置'); ?></td>
                <td><?php echo substr(eh($server['api_key']), 0, 5) . '...'; ?></td>
                <td>
                    <a href="manage_backends.php?edit=<?php echo eh($server['id']); ?>" class="button">编辑</a>
                    <form method="POST" action="manage_backends.php" style="display:inline;">
                        <input type="hidden" name="id" value="<?php echo eh($server['id']); ?>">
                        <button type="submit" name="delete_backend" onclick="return confirm('确定要删除这个后端服务器配置吗？');" class="button">删除</button>
                    </form>
                </td>
                <td>
                    <form method="POST" action="manage_backends.php" style="display:inline;">
                        <input type="hidden" name="backend_id_to_select" value="<?php echo eh($server['id']); ?>">
                        <button type="submit" name="select_backend_and_redirect" <?php echo ($_SESSION['selected_backend_id'] ?? null) === $server['id'] ? 'disabled' : ''; ?> class="button">
                            <?php echo ($_SESSION['selected_backend_id'] ?? null) === $server['id'] ? '当前选中' : '设为当前'; ?>
                        </button>
                    </form>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php else: ?>
    <p>目前没有配置后端服务器。</p>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/templates/footer.php'; ?>
