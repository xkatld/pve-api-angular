<?php
require_once __DIR__ . '/../templates/header.php';

$selected_pve_backend = get_selected_backend();
if (!$selected_pve_backend || empty($selected_pve_backend['pve_url'])) {
    $_SESSION['error_message'] = '当前选择的后端未配置PVE URL，无法打开控制台。请在后端管理中配置。';
    header('Location: containers_list.php');
    exit;
}

$api_handler = get_api_handler(); // This uses api_url for API calls

$node_param = get_query_param('node');
$vmid_param = get_query_param('vmid');

if (empty($node_param) || empty($vmid_param)) {
    echo "<p class='error'>错误：缺少节点或VMID参数。</p>";
    require_once __DIR__ . '/../templates/footer.php';
    exit;
}

$console_api_response = $api_handler->getContainerConsole($node_param, $vmid_param);
$console_url = '';

if (isset($console_api_response['success']) && $console_api_response['success'] && !empty($console_api_response['data'])) {
    $console_data = $console_api_response['data'];
    $pve_base_url = rtrim($selected_pve_backend['pve_url'], '/');
    
    // Construct the Proxmox VE web console URL for LXC
    // Format: https://<PVE_HOST>:8006/?console=lxc&vmid=<VMID>&node=<NODE>&token=<TICKET>
    $console_url = sprintf(
        "%s/?console=lxc&vmid=%s&node=%s&token=%s",
        $pve_base_url,
        eh($vmid_param), // Use vmid_param from GET request
        eh($console_data['node']), // node from API response
        eh($console_data['ticket'])  // ticket from API response
    );

} elseif (isset($console_api_response['success']) && !$console_api_response['success']) {
    $_SESSION['error_message'] = '获取控制台票据失败: ' . eh($console_api_response['message']);
} else {
    $_SESSION['error_message'] = '无法获取容器 ' . eh($vmid_param) . ' 的控制台票据或响应无效。';
}

?>
<div class="container">
    <h2>容器控制台: <?php echo eh($vmid_param); ?> (节点: <?php echo eh($node_param); ?>)</h2>

    <?php if (!empty($console_url)): ?>
        <p>正在尝试加载控制台...</p>
        <div class="console-container">
            <iframe src="<?php echo $console_url; ?>" width="100%" height="600px" style="border: 1px solid #ccc;">
                您的浏览器不支持iframe，或者PVE URL配置、证书等存在问题。
                您可以尝试直接打开链接: <a href="<?php echo $console_url; ?>" target="_blank"><?php echo $console_url; ?></a>
            </iframe>
        </div>
        <p><strong>提示:</strong></p>
        <ul>
            <li>如果控制台无法加载，请检查 PVE URL (<code><?php echo eh($selected_pve_backend['pve_url']); ?></code>) 是否正确，并且您的浏览器可以正常访问该地址。</li>
            <li>确保 Proxmox VE 主机 SSL 证书有效（如果是自签名证书，您可能需要在浏览器中预先接受）。</li>
            <li>控制台票据通常有较短的有效期，如果长时间停留在此页面再尝试打开可能失败，请刷新。</li>
            <li>如果 iframe 提示跨域错误 (X-Frame-Options)，可能需要在 Proxmox VE 的 Web 服务器配置中调整相应头部允许来自此前端域名的嵌入。</li>
        </ul>

    <?php else: ?>
        <p class="error">未能生成控制台链接。<?php echo display_session_messages(); ?></p>
    <?php endif; ?>
    <p><a href="containers_list.php?filter_node=<?php echo eh($node_param); ?>" class="button">返回容器列表</a></p>
</div>
<style>
.console-container {
    width: 100%;
    max-width: 900px; /* Or your preferred max width */
    margin: 20px auto;
}
</style>
<?php require_once __DIR__ . '/../templates/footer.php'; ?>
