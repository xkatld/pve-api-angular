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

$console_response = $api_handler->getContainerConsole($node, $vmid);
?>
<div class="container">
    <h2>容器控制台: <?php echo eh($vmid); ?> (节点: <?php echo eh($node); ?>)</h2>

    <?php if (isset($console_response['success']) && $console_response['success'] && !empty($console_response['data'])): ?>
        <?php $console_data = $console_response['data']; ?>
        <p>控制台票据获取成功。请使用支持VNC的客户端连接，或集成Web VNC（如noVNC）。</p>
        
        <h3>连接信息:</h3>
        <ul>
            <li><strong>Proxmox 主机 (Host):</strong> <?php echo eh($console_data['host']); ?></li>
            <li><strong>端口 (Port):</strong> <?php echo eh($console_data['port']); ?></li>
            <li><strong>票据 (Ticket/Password):</strong> <code><?php echo eh($console_data['ticket']); ?></code></li>
            <li><strong>用户 (User):</strong> <?php echo eh($console_data['user']); ?></li>
            <li><strong>节点 (Node):</strong> <?php echo eh($console_data['node']); ?></li>
        </ul>

        <p><strong>注意:</strong> 票据通常有有效期限制。</p>
        
        <p>
            如果您有本地VNC客户端，可以尝试连接到 <code><?php echo eh($console_data['host']); ?>:<?php echo eh($console_data['port']); ?></code>，
            并在提示输入密码时使用上述票据。
        </p>

        <h4>noVNC 集成 (示例占位符)</h4>
        <p>如果需要Web控制台，可以在下方集成noVNC。您需要将noVNC库文件放置在Web服务器上，并按如下方式配置：</p>
        <div id="noVNC_screen">
             在此处加载 noVNC, 例如: <br>
            <code>
            &lt;iframe src="/path/to/noVNC/vnc_lite.html?host=<?php echo eh($console_data['host']); ?>&port=<?php echo eh($console_data['port']); ?>&password=<?php echo eh($console_data['ticket']); ?>&path=websockify" width="800" height="600"&gt;&lt;/iframe&gt;
            </code>
            <br> (请确保Proxmox VE的websockify代理已正确配置并可访问)
        </div>
        <style>
            #noVNC_screen iframe { border: 1px solid #ccc; }
        </style>
        
    <?php elseif (isset($console_response['success']) && !$console_response['success']): ?>
        <p class="error">获取控制台信息失败: <?php echo eh($console_response['message']); ?></p>
    <?php else: ?>
        <p>无法获取容器 <?php echo eh($vmid); ?> 的控制台信息。</p>
    <?php endif; ?>
    <p><a href="containers_list.php?filter_node=<?php echo eh($node); ?>" class="button">返回容器列表</a></p>
</div>
<?php require_once __DIR__ . '/../templates/footer.php'; ?>
