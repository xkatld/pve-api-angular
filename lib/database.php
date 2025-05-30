<?php

define('DATABASE_PATH', __DIR__ . '/../data/pve_lxc_web.sqlite'); // SQLite数据库文件路径
define('DATA_DIRECTORY', __DIR__ . '/../data'); // 数据目录

function get_db_connection() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            // 确保数据目录存在且可写
            if (!is_dir(DATA_DIRECTORY)) {
                if (!mkdir(DATA_DIRECTORY, 0755, true)) {
                    throw new Exception("无法创建数据目录: " . DATA_DIRECTORY);
                }
            }
            if (!is_writable(DATA_DIRECTORY)) {
                 // 尝试更改权限，但这可能因服务器配置而失败
                if (!chmod(DATA_DIRECTORY, 0755)) {
                    // 如果chmod失败，并且目录仍然不可写
                    if (!is_writable(DATA_DIRECTORY)) {
                         throw new Exception("数据目录不可写: " . DATA_DIRECTORY);
                    }
                }
            }


            $pdo = new PDO('sqlite:' . DATABASE_PATH);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            // 为 SQLite 启用外键约束 (如果将来使用)
            // $pdo->exec('PRAGMA foreign_keys = ON;');
        } catch (PDOException $e) {
            // 在实际应用中，这里应该记录错误日志，而不是直接输出
            error_log("数据库连接失败: " . $e->getMessage());
            die("数据库连接失败。请检查错误日志。");
        } catch (Exception $e) {
            error_log("数据库设置错误: " . $e->getMessage());
            die("数据库设置错误。请检查错误日志。");
        }
    }
    return $pdo;
}

function initialize_database_schema() {
    $pdo = get_db_connection();
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );");

        $pdo->exec("CREATE TABLE IF NOT EXISTS backend_servers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        server_id_str TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        api_url TEXT NOT NULL,
                        pve_url TEXT,
                        api_key TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );");

        $pdo->exec("CREATE TABLE IF NOT EXISTS app_settings (
                        setting_key TEXT PRIMARY KEY,
                        setting_value TEXT
                    );");
        
        // 插入一个设置来标记数据库结构已初始化 (如果需要更细致的控制)
        // $stmt = $pdo->prepare("INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)");
        // $stmt->execute(['database_schema_version', '1.0']);

        return true;
    } catch (PDOException $e) {
        error_log("数据库表创建失败: " . $e->getMessage());
        return false;
    }
}

?>
