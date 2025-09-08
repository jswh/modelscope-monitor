-- ModelScope Free Tier Monitor Database Schema v1
-- 初始数据库架构，包含accounts表及其完整结构

-- 删除已存在的表（如果存在），确保干净的环境
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS schema_version;

-- 创建accounts表
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cookies TEXT NOT NULL,
    rate_limit_data TEXT,  -- JSON格式存储最新的速率限制数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- 创建schema_version表用于跟踪数据库版本
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    upgraded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始版本记录
INSERT INTO schema_version (version) VALUES (1);

-- 为accounts表创建索引以提高查询性能
CREATE INDEX idx_accounts_name ON accounts(name);
CREATE INDEX idx_accounts_active ON accounts(is_active);
CREATE INDEX idx_accounts_created ON accounts(created_at);