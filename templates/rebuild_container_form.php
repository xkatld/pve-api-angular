<?php
require_once __DIR__ . '/../templates/header.php';
$api_handler = get_api_handler();

$rebuild_node = get_query_param('node');
$rebuild_vmid = get_query_param('vmid');

if (empty($rebuild_node) || empty($rebuild_vmid)) {
    $_SESSION['error_message'] = '缺少节点或VMID参数以进行重建。';
    header('Location: containers_list.php');
    exit;
}

$current_container_status_response = $api_handler->getContainerStatus($rebuild_node, $rebuild_vmid);
if (!isset($current_container_status_response['success']) || !$current_container_status_response['success']) {
     $_SESSION['error_message'] = '无法获取当前容器信息进行重建预填: ' . ($current_container_status_response['message'] ?? '未知错误');
}
$current_config = $current_container_status_response;


$templates = [];
$storages = [];
$networks = [];

$templates_response = $api_handler->getNodeTemplates($rebuild_node);
if (isset($templates_response['success']) && $templates_response['success'] && !empty($templates_response['data'])) {
    $templates = $templates_response['data'];
}

$storages_response = $api_handler->getNodeStorages($rebuild_node);
 if (isset($storages_response['success']) && $storages_response['success'] && !empty($storages_response['data'])) {
    foreach ($storages_response['data'] as $storage) {
        if (strpos($storage['content'], 'rootdir') !== false || strpos($storage['content'], 'images') !== false) {
             $storages[] = $storage;
        }
    }
}

$networks_response = $api_handler->getNodeNetworks($rebuild_node);
if (isset($networks_response['success']) && $networks_response['success'] && !empty($networks_response['data'])) {
    $networks = $networks_response['data'];
}

$form_data = [
    'ostemplate' => get_post_param('ostemplate', ''),
    'hostname' => get_post_param('hostname', $current_config['name'] ?? ''),
    'password' => get_post_param('password', ''),
    'storage' => get_post_param('storage', ''),
    'disk_size' => get_post_param('disk_size', 8),
    'cores' => get_post_param('cores', $current_config['cores'] ?? 1), // Assuming 'cores' might be in status or config. Needs verification with actual API output.
    'cpulimit' => get_post_param('cpulimit', ''),
    'memory' => get_post_param('memory', isset($current_config['maxmem']) ? round($current_config['maxmem'] / (1024*1024)) : 512),
    'swap' => get_post_param('swap', isset($current_config['maxswap']) ? round($current_config['maxswap'] / (1024*1024)) : 512), // Assuming maxswap
    'net_name' => get_post_param('net_name', 'eth0'),
    'net_bridge' => get_post_param('net_bridge', $networks[0]['iface'] ?? 'vmbr0'),
    'net_ip' => get_post_param('net_ip', 'dhcp'),
    'net_gw' => get_post_param('net_gw', ''),
    'net_vlan' => get_post_param('net_vlan', ''),
    'net_rate' => get_post_param('net_rate', ''),
    'nesting' => get_post_param('nesting', 0),
    'unprivileged' => get_post_param('unprivileged', 1),
    'start' => get_post_param('start', 0),
    'features' => get_post_param('features', ''),
    'console_mode' => get_post_param('console_mode', '默认 (tty)')
];


if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rebuild_container'])) {
    $rebuild_data_payload = [
        'ostemplate' => get_post_param('ostemplate'),
        'hostname' => get_post_param('hostname'),
        'password' => get_post_param('password'),
        'storage' => get_post_param('storage'),
        'disk_size' => (int)get_post_param('disk_size'),
        'cores' => (int)get_post_param('cores'),
        'cpulimit' => get_post_param('cpulimit') === '' ? null : (int)get_post_param('cpulimit'),
        'memory' => (int)get_post_param('memory'),
        'swap' => (int)get_post_param('swap'),
        'network' => [
            'name' => get_post_param('net_name', 'eth0'),
            'bridge' => get_post_param('net_bridge'),
            'ip' => get_post_param('net_ip'),
            'gw' => get_post_param('net_gw') === '' ? null : get_post_param('net_gw'),
            'vlan' => get_post_param('net_vlan') === '' ? null : (int)get_post_param('net_vlan'),
            'rate' => get_post_param('net_rate') === '' ? null : (int)get_post_param('net_rate'),
        ],
        'nesting' => (bool)get_post_param('nesting', false),
        'unprivileged' => (bool)get_post_param('unprivileged', true),
        'start' => (bool)get_post_param('start', false),
        'features' => get_post_param('features') === '' ? null : get_post_param('features'),
        'console_mode' => get_post_param('console_mode', '默认 (tty)')
    ];

    $rebuild_response = $api_handler->rebuildContainer($rebuild_node, $rebuild_vmid, $rebuild_data_payload);

    if (isset($rebuild_response['success']) && $rebuild_response['success']) {
        $task_id_info = isset($rebuild_response['data']['task_id']) ? " (任务ID: " . eh($rebuild_response['data']['task_id']) . ")" : "";
        $_SESSION['success_message'] = '重建容器 ' . eh($rebuild_vmid) . ' 的请求已发送。' . $task_id_info . (isset($rebuild_response['message']) ? ' 消息: ' . eh($rebuild_response['message']) : '');
        header('Location: containers_list.php?filter_node=' . eh($rebuild_node));
        exit;
    } else {
        $_SESSION['error_message'] = '重建容器失败: ' . eh($rebuild_response['message'] ?? '未知错误。');
        $form_data = array_merge($form_data, $_POST);
         header('Location: rebuild_container_form.php?node=' . eh($rebuild_node) . '&vmid=' . eh($rebuild_vmid));
         exit;
    }
}
?>

<div class="container">
    <h2>重建LXC容器: <?php echo eh($rebuild_vmid); ?> (节点: <?php echo eh($rebuild_node); ?>)</h2>
    <p class="error">警告：重建容器将删除现有容器及其所有数据，然后使用新配置重新创建一个同名同ID的容器。此操作不可逆！</p>

    <form method="POST" action="rebuild_container_form.php?node=<?php echo eh($rebuild_node); ?>&vmid=<?php echo eh($rebuild_vmid); ?>">
        <input type="hidden" name="rebuild_container" value="1">
        
        <div>
            <label for="hostname">新主机名:</label>
            <input type="text" name="hostname" id="hostname" value="<?php echo eh($form_data['hostname']); ?>" required placeholder="例如: my-rebuilt-ct">
        </div>

        <div>
            <label for="password">新Root密码:</label>
            <input type="password" name="password" id="password" value="<?php echo eh($form_data['password']); ?>" required>
        </div>

        <div>
            <label for="ostemplate">新操作系统模板:</label>
            <select name="ostemplate" id="ostemplate" required>
                <option value="">选择模板</option>
                <?php foreach ($templates as $template): ?>
                    <option value="<?php echo eh($template['volid']); ?>" <?php echo ($form_data['ostemplate'] === $template['volid']) ? 'selected' : ''; ?>>
                        <?php echo eh($template['volid']); ?> (<?php echo eh(format_bytes($template['size'])); ?>)
                    </option>
                <?php endforeach; ?>
            </select>
             <?php if (empty($templates)): ?> <small>此节点上没有找到CT模板或无法加载。</small> <?php endif; ?>
        </div>
        
        <div>
            <label for="storage">新根文件系统存储池:</label>
            <select name="storage" id="storage" required>
                <option value="">选择存储</option>
                <?php foreach ($storages as $storage_item): ?>
                    <option value="<?php echo eh($storage_item['storage']); ?>" <?php echo ($form_data['storage'] === $storage_item['storage']) ? 'selected' : ''; ?>>
                        <?php echo eh($storage_item['storage']); ?> (可用: <?php echo eh(format_bytes($storage_item['avail'])); ?> / 总计: <?php echo eh(format_bytes($storage_item['total'])); ?>)
                    </option>
                <?php endforeach; ?>
            </select>
             <?php if (empty($storages)): ?> <small>此节点上没有找到合适的存储或无法加载。</small> <?php endif; ?>
        </div>

        <div>
            <label for="disk_size">新磁盘大小 (GB):</label>
            <input type="number" name="disk_size" id="disk_size" value="<?php echo eh($form_data['disk_size']); ?>" required min="1">
        </div>

        <div>
            <label for="cores">新CPU核心数:</label>
            <input type="number" name="cores" id="cores" value="<?php echo eh($form_data['cores']); ?>" required min="1">
        </div>
         <div>
            <label for="cpulimit">新CPU限制 (0为无限制):</label>
            <input type="number" name="cpulimit" id="cpulimit" value="<?php echo eh($form_data['cpulimit']); ?>" min="0" placeholder="可选, 例如: 1">
        </div>

        <div>
            <label for="memory">新内存 (MB):</label>
            <input type="number" name="memory" id="memory" value="<?php echo eh($form_data['memory']); ?>" required min="64">
        </div>

        <div>
            <label for="swap">新SWAP (MB):</label>
            <input type="number" name="swap" id="swap" value="<?php echo eh($form_data['swap']); ?>" required min="0">
        </div>

        <fieldset>
            <legend>新网络接口 (eth0)</legend>
            <div>
                <label for="net_name">接口名称:</label>
                <input type="text" name="net_name" id="net_name" value="<?php echo eh($form_data['net_name']); ?>" required>
            </div>
            <div>
                <label for="net_bridge">桥接网卡:</label>
                 <select name="net_bridge" id="net_bridge" required>
                    <option value="">选择网桥</option>
                    <?php foreach ($networks as $network_item): ?>
                         <option value="<?php echo eh($network_item['iface']); ?>" <?php echo ($form_data['net_bridge'] === $network_item['iface']) ? 'selected' : ''; ?>>
                            <?php echo eh($network_item['iface']); ?> <?php if(!empty($network_item['comments'])) echo '('.eh($network_item['comments']).')'; ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                 <?php if (empty($networks)): ?> <small>此节点上没有找到网桥或无法加载。</small> <?php endif; ?>
            </div>
            <div>
                <label for="net_ip">IP地址配置:</label>
                <input type="text" name="net_ip" id="net_ip" value="<?php echo eh($form_data['net_ip']); ?>" required placeholder="例如: dhcp 或 192.168.1.100/24">
            </div>
            <div>
                <label for="net_gw">网关:</label>
                <input type="text" name="net_gw" id="net_gw" value="<?php echo eh($form_data['net_gw']); ?>" placeholder="可选, 例如: 192.168.1.1">
            </div>
             <div>
                <label for="net_vlan">VLAN标签:</label>
                <input type="number" name="net_vlan" id="net_vlan" value="<?php echo eh($form_data['net_vlan']); ?>" min="1" placeholder="可选, 例如: 10">
            </div>
             <div>
                <label for="net_rate">网络速率限制 (MB/s):</label>
                <input type="number" name="net_rate" id="net_rate" value="<?php echo eh($form_data['net_rate']); ?>" min="1" placeholder="可选, 例如: 50">
            </div>
        </fieldset>
        
        <div>
            <label for="nesting">启用嵌套虚拟化:</label>
            <select name="nesting" id="nesting">
                <option value="0" <?php echo ($form_data['nesting'] == 0) ? 'selected' : ''; ?>>否</option>
                <option value="1" <?php echo ($form_data['nesting'] == 1) ? 'selected' : ''; ?>>是</option>
            </select>
        </div>
        <div>
            <label for="unprivileged">非特权容器:</label>
             <select name="unprivileged" id="unprivileged">
                <option value="1" <?php echo ($form_data['unprivileged'] == 1) ? 'selected' : ''; ?>>是</option>
                <option value="0" <?php echo ($form_data['unprivileged'] == 0) ? 'selected' : ''; ?>>否</option>
            </select>
        </div>
         <div>
            <label for="start">创建后立即启动:</label>
             <select name="start" id="start">
                <option value="0" <?php echo ($form_data['start'] == 0) ? 'selected' : ''; ?>>否</option>
                <option value="1" <?php echo ($form_data['start'] == 1) ? 'selected' : ''; ?>>是</option>
            </select>
        </div>
        <div>
            <label for="features">额外特性:</label>
            <input type="text" name="features" id="features" value="<?php echo eh($form_data['features']); ?>" placeholder="可选, 例如: keyctl=1,mount=cifs">
        </div>
        <div>
            <label for="console_mode">控制台模式:</label>
            <select name="console_mode" id="console_mode">
                <option value="默认 (tty)" <?php echo ($form_data['console_mode'] === '默认 (tty)') ? 'selected' : ''; ?>>默认 (tty)</option>
                <option value="shell" <?php echo ($form_data['console_mode'] === 'shell') ? 'selected' : ''; ?>>shell</option>
            </select>
        </div>

        <button type="submit" onclick="return confirm('再次确认：您确定要重建此容器吗？所有当前数据都将丢失。');">确认重建容器</button>
        <a href="containers_list.php?filter_node=<?php echo eh($rebuild_node); ?>" class="button">取消</a>
    </form>
</div>
<?php require_once __DIR__ . '/../templates/footer.php'; ?>
