-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    steam_id VARCHAR(100),
    discord_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    subscription_tier ENUM('free', 'basic', 'pro') DEFAULT 'free'
);

-- Subscriptions Table
CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan VARCHAR(20) NOT NULL,  -- 'free', 'basic', 'pro'
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL,  -- 'active', 'canceled', 'past_due'
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Protected Servers Table
CREATE TABLE protected_servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    server_name VARCHAR(100) NOT NULL,
    server_ip VARCHAR(50),
    port INT NOT NULL,
    server_key VARCHAR(255) NOT NULL,
    last_connected TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Anti-Cheat Configuration Table
CREATE TABLE anticheat_config (
    user_id INT PRIMARY KEY,
    max_violation_points INT DEFAULT 10,
    violation_decay_time INT DEFAULT 60,
    blacklisted_weapons JSON,
    enabled_checks JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Anti-Cheat Logs Table
CREATE TABLE anticheat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    server_id INT NOT NULL,
    violation_type ENUM(
        'godmode', 
        'speedhack', 
        'noclip', 
        'weapon_spawn', 
        'model_spawn', 
        'resource_injection'
    ) NOT NULL,
    details JSON,
    severity INT DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (server_id) REFERENCES protected_servers(id)
);

-- Player Bans Table
CREATE TABLE player_bans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    server_id INT NOT NULL,
    banned_by INT NOT NULL,
    reason TEXT,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unbanned_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (server_id) REFERENCES protected_servers(id),
    FOREIGN KEY (banned_by) REFERENCES users(id)
);

-- Violation Points Tracking
CREATE TABLE player_violation_points (
    player_id VARCHAR(100) NOT NULL,
    server_id INT NOT NULL,
    current_points INT DEFAULT 0,
    last_violation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, server_id),
    FOREIGN KEY (server_id) REFERENCES protected_servers(id)
);

-- Indexes for Performance
CREATE INDEX idx_anticheat_logs_server ON anticheat_logs(server_id);
CREATE INDEX idx_anticheat_logs_timestamp ON anticheat_logs(timestamp);
CREATE INDEX idx_player_bans_active ON player_bans(is_active);
