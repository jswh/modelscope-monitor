const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs").promises;

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "../data/monitor.db"));
    this.init().catch(err => {
      console.error("Database initialization failed:", err);
      process.exit(1);
    });
  }

  async init() {
    try {
      console.log("Starting database initialization...");
      
      // 检查是否需要初始化（检查schema_version表是否存在）
      const needsInit = await this.needsInitialization();
      
      if (needsInit) {
        console.log("Database needs initialization, running v1 schema...");
        await this.runMigration("v1_initial_schema.sql");
        console.log("Database initialization completed successfully");
      } else {
        console.log("Database already initialized");
      }
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  }

  async needsInitialization() {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!row); // 如果schema_version表不存在，则需要初始化
          }
        }
      );
    });
  }

  async runMigration(filename) {
    try {
      const migrationPath = path.join(__dirname, "../migrations", filename);
      console.log(`Running migration: ${filename}`);
      
      // 读取SQL文件
      const sql = await fs.readFile(migrationPath, "utf8");
      
      // 执行SQL语句
      await this.executeSqlScript(sql);
      
      console.log(`Migration ${filename} completed successfully`);
    } catch (error) {
      console.error(`Migration ${filename} failed:`, error);
      throw error;
    }
  }

  async executeSqlScript(sqlScript) {
    return new Promise((resolve, reject) => {
      // 将SQL脚本按分号分割成单独的语句
      const statements = sqlScript
        .split(";")
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      let completed = 0;
      
      if (statements.length === 0) {
        resolve();
        return;
      }

      statements.forEach((statement, index) => {
        this.db.run(statement, (err) => {
          if (err) {
            console.error(`Error executing statement ${index + 1}:`, err.message);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
            reject(err);
            return;
          }
          
          completed++;
          
          if (completed === statements.length) {
            resolve();
          }
        });
      });
    });
  }

  addAccount(name, cookies) {
    return new Promise((resolve, reject) => {
      const query = "INSERT INTO accounts (name, cookies) VALUES (?, ?)";
      this.db.run(query, [name, cookies], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, name, cookies });
        }
      });
    });
  }

  getAccounts() {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM accounts WHERE is_active = 1";
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 解析rate_limit_data字段
          resolve(rows.map(row => ({
            ...row,
            rate_limit_data: row.rate_limit_data ? JSON.parse(row.rate_limit_data) : null
          })));
        }
      });
    });
  }

  updateAccount(id, cookies) {
    return new Promise((resolve, reject) => {
      const query = "UPDATE accounts SET cookies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      this.db.run(query, [cookies, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, cookies, updated: this.changes > 0 });
        }
      });
    });
  }

  updateAccountRateLimitData(id, rateLimitData) {
    return new Promise((resolve, reject) => {
      const query = "UPDATE accounts SET rate_limit_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      this.db.run(query, [JSON.stringify(rateLimitData), id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, rateLimitData, updated: this.changes > 0 });
        }
      });
    });
  }

  deleteAccount(id) {
    return new Promise((resolve, reject) => {
      const query = "UPDATE accounts SET is_active = 0 WHERE id = ?";
      this.db.run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, deleted: this.changes > 0 });
        }
      });
    });
  }

  addUsageData(accountId, rateLimitData) {
    console.warn("addUsageData is deprecated. Use updateAccountRateLimitData instead.");
    return this.updateAccountRateLimitData(accountId, rateLimitData);
  }

  getUsageData(accountId, limit = 100) {
    console.warn("getUsageData is deprecated. We only store latest data now.");
    return Promise.resolve([]);
  }

  getAccountRateLimitData(accountId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT rate_limit_data FROM accounts WHERE id = ? AND is_active = 1";
      this.db.get(query, [accountId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row && row.rate_limit_data) {
            resolve(JSON.parse(row.rate_limit_data));
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  getLatestUsageData(accountId) {
    return this.getAccountRateLimitData(accountId).then(data => {
      return data ? { rate_limit_data: data } : null;
    });
  }

  cleanupBackupData() {
    return new Promise((resolve, reject) => {
      this.db.run("DROP TABLE IF EXISTS usage_data_backup", (err) => {
        if (err) {
          reject(err);
        } else {
          console.log("Backup data cleaned up successfully");
          resolve();
        }
      });
    });
  }

  getDatabaseStats() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      // 获取账户数量
      this.db.get("SELECT COUNT(*) as count FROM accounts WHERE is_active = 1", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        stats.accounts = row.count;
        
        // 获取有rate_limit_data的账户数量
        this.db.get("SELECT COUNT(*) as count FROM accounts WHERE is_active = 1 AND rate_limit_data IS NOT NULL", (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          stats.accountsWithRateLimitData = row.count;
          
          // 检查备份表是否存在及其行数
          this.db.get("SELECT COUNT(*) as count FROM usage_data_backup", (err, row) => {
            if (err) {
              // 备份表可能不存在
              stats.backupDataCount = 0;
              resolve(stats);
            } else {
              stats.backupDataCount = row.count;
              resolve(stats);
            }
          });
        });
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
