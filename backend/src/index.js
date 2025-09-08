const express = require('express');
const cors = require('cors');
const Database = require('./database');
const cron = require('node-cron');
const { validateAndTestCookies } = require('./middleware');
const { success, clientError, notFound, asyncHandler } = require('./utils');
const { accountService, scheduleService } = require('./services');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const db = new Database();

// 账户管理路由
app.post('/api/accounts', 
  validateAndTestCookies,
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const { cookieTestResult } = req;

    if (!name) {
      return clientError(res, 'Name is required');
    }

    const account = await accountService.createAccount(name, req.body.cookies, cookieTestResult);
    success(res, { account });
  }, 'adding account')
);

app.get('/api/accounts', 
  asyncHandler(async (req, res) => {
    const accounts = await accountService.getAllAccounts();
    success(res, { accounts });
  }, 'getting accounts')
);

app.put('/api/accounts/:id', 
  validateAndTestCookies,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { cookieTestResult } = req;

    await accountService.updateAccountCookies(parseInt(id), req.body.cookies, cookieTestResult);
    success(res, { message: 'Account updated successfully' });
  }, 'updating account')
);

app.delete('/api/accounts/:id', 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await accountService.deleteAccount(parseInt(id));
    success(res, { message: 'Account deleted successfully' });
  }, 'deleting account')
);

// 使用数据路由 - 简化为只返回最新数据
app.get('/api/accounts/:id/usage', 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // 由于我们只记录最新数据，这里返回空数组
    // 客户端应该使用 /latest-usage 端点获取最新数据
    success(res, { data: [], message: 'Historical usage data is not stored. Use /latest-usage endpoint for current data.' });
  }, 'getting usage data')
);

app.get('/api/accounts/:id/latest-usage', 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const latestData = await accountService.getAccountRateLimitData(parseInt(id));
    if (latestData) {
      res.json(latestData);
    } else {
      notFound(res, 'No usage data found');
    }
  }, 'getting latest usage data')
);

app.post('/api/accounts/:id/refresh', 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const account = await accountService.getAccountById(parseInt(id));
    if (!account) {
      return notFound(res, 'Account not found');
    }

    const result = await accountService.refreshAccountUsage(parseInt(id), account.cookies);
    
    if (result.success) {
      success(res, { data: result });
    } else {
      clientError(res, result.error);
    }
  }, 'refreshing usage data')
);

// 健康检查路由
app.get('/api/health', (req, res) => {
  success(res, { message: 'ModelScope Monitor API is running' });
});

// 创建定时任务
const stopSchedule = scheduleService.createUsageUpdateSchedule();

// 启动服务器
app.listen(PORT, () => {
  console.log('ModelScope Monitor API server running on port ' + PORT);
});

// 优雅关闭处理
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  stopSchedule();
  db.close();
  process.exit(0);
});