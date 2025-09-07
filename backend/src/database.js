const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../data/monitor.db'));
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          cookies TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS usage_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          rate_limit_data TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts (id)
        )
      `);
    });
  }

  addAccount(name, cookies) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO accounts (name, cookies) VALUES (?, ?)';
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
      const query = 'SELECT * FROM accounts WHERE is_active = 1';
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  updateAccount(id, cookies) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE accounts SET cookies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(query, [cookies, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, cookies, updated: this.changes > 0 });
        }
      });
    });
  }

  deleteAccount(id) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE accounts SET is_active = 0 WHERE id = ?';
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
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO usage_data (account_id, rate_limit_data) VALUES (?, ?)';
      this.db.run(query, [accountId, JSON.stringify(rateLimitData)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, accountId, rateLimitData });
        }
      });
    });
  }

  getUsageData(accountId, limit = 100) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM usage_data 
        WHERE account_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      this.db.all(query, [accountId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            ...row,
            rate_limit_data: JSON.parse(row.rate_limit_data)
          })));
        }
      });
    });
  }

  getLatestUsageData(accountId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM usage_data 
        WHERE account_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;
      this.db.get(query, [accountId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            resolve({
              ...row,
              rate_limit_data: JSON.parse(row.rate_limit_data)
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;