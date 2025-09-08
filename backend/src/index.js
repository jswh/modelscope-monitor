const express = require('express');
const cors = require('cors');
const Database = require('./database');
const ModelScopeAPI = require('./modelscope-api');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const db = new Database();
const modelscopeAPI = new ModelScopeAPI();

app.post('/api/accounts', async (req, res) => {
  try {
    const { name, cookies } = req.body;

    if (!name || !cookies) {
      return res.status(400).json({ error: 'Name and cookies are required' });
    }

    const validation = modelscopeAPI.validateCookies(cookies);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const testResult = await modelscopeAPI.testCookies(cookies);
    if (!testResult.valid) {
      return res.status(400).json({ error: testResult.message });
    }

    const account = await db.addAccount(name, cookies);
    
    if (testResult.valid && testResult.data.success) {
      // 如果API调用返回了更新后的cookies，更新到数据库
      if (testResult.data.updatedCookies && testResult.data.updatedCookies !== cookies) {
        await db.updateAccount(account.id, testResult.data.updatedCookies);
      }
      await db.addUsageData(account.id, testResult.data);
    }

    res.json({ success: true, account });
  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await db.getAccounts();
    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cookies } = req.body;

    if (!cookies) {
      return res.status(400).json({ error: 'Cookies are required' });
    }

    const validation = modelscopeAPI.validateCookies(cookies);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const testResult = await modelscopeAPI.testCookies(cookies);
    if (!testResult.valid) {
      return res.status(400).json({ error: testResult.message });
    }

    // 先测试原始cookies
    const testResult = await modelscopeAPI.testCookies(cookies);
    
    if (!testResult.valid) {
      return res.status(400).json({ error: testResult.message });
    }

    // 如果API调用成功且返回了更新后的cookies，使用更新后的cookies
    let finalCookies = cookies;
    if (testResult.valid && testResult.data.success && testResult.data.updatedCookies && testResult.data.updatedCookies !== cookies) {
      finalCookies = testResult.data.updatedCookies;
    }
    
    await db.updateAccount(id, finalCookies);
    
    if (testResult.valid && testResult.data.success) {
      await db.addUsageData(id, testResult.data);
    }

    res.json({ success: true, message: 'Account updated successfully' });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteAccount(id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/accounts/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    const usageData = await db.getUsageData(id, limit ? parseInt(limit) : 100);
    res.json({ success: true, data: usageData });
  } catch (error) {
    console.error('Error getting usage data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/accounts/:id/latest-usage', async (req, res) => {
  try {
    const { id } = req.params;
    const latestData = await db.getLatestUsageData(id);
    if (latestData) {
      res.json(latestData.rate_limit_data);
    } else {
      res.status(404).json({ success: false, error: 'No usage data found' });
    }
  } catch (error) {
    console.error('Error getting latest usage data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/accounts/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await db.getAccounts().then(accounts => 
      accounts.find(acc => acc.id === parseInt(id))
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await modelscopeAPI.getRateLimit(account.cookies);
    
    if (result.success) {
      // 如果API调用返回了更新后的cookies，更新到数据库
      if (result.updatedCookies && result.updatedCookies !== account.cookies) {
        await db.updateAccount(id, result.updatedCookies);
      }
      await db.addUsageData(id, result);
      res.json({ success: true, data: result });
    } else {
      // 即使出错，如果有更新后的cookies也要更新数据库
      if (result.updatedCookies && result.updatedCookies !== account.cookies) {
        await db.updateAccount(id, result.updatedCookies);
      }
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error refreshing usage data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ModelScope Monitor API is running' });
});

cron.schedule('*/5 * * * *', async () => {
  console.log('Running scheduled usage data update...');
  
  try {
    const accounts = await db.getAccounts();
    
    for (const account of accounts) {
      try {
        const result = await modelscopeAPI.getRateLimit(account.cookies);
        
        if (result.success) {
          // 如果API调用返回了更新后的cookies，更新到数据库
          if (result.updatedCookies && result.updatedCookies !== account.cookies) {
            await db.updateAccount(account.id, result.updatedCookies);
            console.log(`Updated cookies for account: ${account.name}`);
          }
          await db.addUsageData(account.id, result);
          console.log(`Updated usage data for account: ${account.name}`);
        } else {
          // 即使出错，如果有更新后的cookies也要更新数据库
          if (result.updatedCookies && result.updatedCookies !== account.cookies) {
            await db.updateAccount(account.id, result.updatedCookies);
            console.log(`Updated cookies for account (with error): ${account.name}`);
          }
          console.error(`Failed to update usage data for account ${account.name}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error updating account ${account.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in scheduled update:', error);
  }
});

app.listen(PORT, () => {
  console.log(`ModelScope Monitor API server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});