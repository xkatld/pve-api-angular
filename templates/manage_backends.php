<?php
require_once __DIR__ . '/templates/header.php';

$error_message = '';
$success_message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['add_backend'])) {
        $id = trim($_POST['id']);
        $name = trim($_POST['name']);
        $url = trim($_POST['url']);
        $api_key = trim($_POST['api_key']);
        if (!empty($id) && !empty($name) && !empty($url) && !empty($api_key)) {
            if (add_backend_server($id, $name, $url, $api_key)) {
                $success_message = "后端服务器 '{$name}' 添加成功。";
            } else {
                $error_message = "无法添加后端服务器，ID '{$id}' 可能已存在。";
            }
        } else {
            $error_message = "所有字段均为必填项。";
        }
    } elseif (isset($_POST['update_backend'])) {
        $original_id = trim($_POST['original_id']);
        $id = trim($_POST['id']);
        $name = trim($_POST['name']);
        $url = trim($_POST['url']);
        $api_key = trim($_POST['api_key']);
        if (!empty($id) && !empty($name) && !empty($url) && !empty($api_key) && !empty($original_id)) {
            if (update_backend_server($original_id, $id, $name, $url, $api_key)) {
                $success_message = "后端服务器 '{$name}' 更新成功。";
            } else {
                $error_message = "无法更新后端服务器 '{$original_id}'。";
            }
        } else {
            $error_message = "所有字段均为必填项。";
        }
    } elseif (isset($_POST['delete_backend'])) {
        $id = $_POST['id'];
        if (remove_backend_server($id)) {
            $success_message = "后端服务器 '{$id}' 删除成功。";
        } else {
            $error_message = "无法删除后端服务器 '{$id}'。";
        }
    } elseif (isset($_POST['select_backend_and_redirect'])) {
         $selected_id = $_POST['backend_id_to_select'];
         $_SESSION['selected_backend_id'] = $selected_id;
         header('Location: dashboard.php');
         exit;
    }
     header("Location: manage_backends.php?success=" . urlencode($success_message) . "&error=" . urlencode($error_message));
     exit;
}

$success_message = isset($_GET['success']) ? htmlspecialchars($_GET['success']) : '';
$error_message = isset($_GET['error']) ? htmlspecialchars($_GET['error']) : '';

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
        <p class="success"><?php echo $success_message; ?></p>
    <?php endif; ?>
    <?php if ($error_message): ?>
        <p class="error"><?php echo $error_message; ?></p>
    <?php endif; ?>

    <h3><?php echo $editing_backend ? '编辑后端服务器' : '添加新的后端服务器'; ?></h3>
    <form method="POST" action="manage_backends.php">
        <?php if ($editing_backend): ?>
            <input type="hidden" name="original_id" value="<?php echo htmlspecialchars($editing_backend['id']); ?>">
        <?php endif; ?>
        <div>
            <label for="id">唯一ID:</label>
            <input type="text" id="id" name="id" value="<?php echo $editing_backend ? htmlspecialchars($editing_backend['id']) : ''; ?>" required <?php echo $editing_backend ? '' : ''; ?>>
            <small>例如: pve-cluster1, backup-server (修改ID会影响依赖此ID的设置)</small>
        </div>
        <div>
            <label for="name">服务器名称:</label>
            <input type="text" id="name" name="name" value="<?php echo $editing_backend ? htmlspecialchars($editing_backend['name']) : ''; ?>" required>
            <small>例如: 主力Proxmox集群, 备用节点</small>
        </div>
        <div>
            <label for="url">服务器URL:</label>
            <input type="url" id="url" name="url" value="<?php echo $editing_backend ? htmlspecialchars($editing_backend['url']) : ''; ?>" placeholder="例如: http://192.168.1.10:8000" required>
            <small>pve-lxc-server的访问地址，包含端口</small>
        </div>
        <div>
            <label for="api_key">API密钥:</label>
            <input type="password" id="api_key" name="api_key" value="<?php echo $editing_backend ? htmlspecialchars($editing_backend['api_key']) : ''; ?>" required>
            <small>pve-lxc-server在.env文件中配置的GLOBAL_API_KEY</small>
        </div>
        <?php if ($editing_backend): ?>
            <button type="submit" name="update_backend">更新服务器</button>
            <a href="manage_backends.php">取消编辑</a>
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
                <th>名称</th>
                <th>URL</th>
                <th>API密钥 (部分显示)</th>
                <th>操作</th>
                <th>选择并跳转</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($backend_servers as $server): ?>
            <tr>
                <td><?php echo htmlspecialchars($server['id']); ?></td>
                <td><?php echo htmlspecialchars($server['name']); ?></td>
                <td><?php echo htmlspecialchars($server['url']); ?></td>
                <td><?php echo substr(htmlspecialchars($server['api_key']), 0, 5) . '...'; ?></td>
                <td>
                    <a href="manage_backends.php?edit=<?php echo htmlspecialchars($server['id']); ?>">编辑</a>
                    <form method="POST" action="manage_backends.php" style="display:inline;">
                        <input type="hidden" name="id" value="<?php echo htmlspecialchars($server['id']); ?>">
                        <button type="submit" name="delete_backend" onclick="return confirm('确定要删除这个后端服务器吗？');">删除</button>
                    </form>
                </td>
                <td>
                    <form method="POST" action="manage_backends.php" style="display:inline;">
                        <input type="hidden" name="backend_id_to_select" value="<?php echo htmlspecialchars($server['id']); ?>">
                        <button type="submit" name="select_backend_and_redirect" <?php echo ($_SESSION['selected_backend_id'] ?? null) === $server['id'] ? 'disabled' : ''; ?>>
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
