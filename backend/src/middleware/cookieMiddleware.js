const ModelScopeAPI = require('../modelscope-api');
const Database = require('../database');
const modelscopeAPI = new ModelScopeAPI();
const db = new Database();

/**
 * 验证Cookie格式的中间件
 */
const validateCookieFormat = (req, res, next) => {
  const { cookies } = req.body;
  
  if (!cookies) {
    return res.status(400).json({ error: 'Cookies are required' });
  }

  const validation = modelscopeAPI.validateCookies(cookies);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  next();
};

/**
 * 测试Cookie有效性的中间件
 */
const testCookieValidity = async (req, res, next) => {
  const { cookies } = req.body;
  
  try {
    const testResult = await modelscopeAPI.testCookies(cookies);
    if (!testResult.valid) {
      return res.status(400).json({ error: testResult.message });
    }
    
    // 将测试结果附加到请求对象上，供后续中间件使用
    req.cookieTestResult = testResult;
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Cookie test failed' });
  }
};

/**
 * 完整的Cookie验证和测试中间件
 */
const validateAndTestCookies = async (req, res, next) => {
  const { cookies } = req.body;
  
  if (!cookies) {
    return res.status(400).json({ error: 'Cookies are required' });
  }

  // 验证Cookie格式
  const validation = modelscopeAPI.validateCookies(cookies);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  // 测试Cookie有效性
  try {
    const testResult = await modelscopeAPI.testCookies(cookies);
    if (!testResult.valid) {
      return res.status(400).json({ error: testResult.message });
    }
    
    // 将测试结果附加到请求对象上
    req.cookieTestResult = testResult;
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Cookie test failed' });
  }
};

/**
 * 处理Cookie更新逻辑的函数
 * @param {number} accountId - 账户ID
 * @param {string} originalCookies - 原始Cookies
 * @param {Object} apiResult - API调用结果
 * @returns {Promise<string>} - 返回最终使用的Cookies
 */
const handleCookieUpdate = async (accountId, originalCookies, apiResult) => {
  let finalCookies = originalCookies;
  
  // 如果API调用返回了更新后的cookies，使用更新后的cookies
  if (apiResult.updatedCookies && apiResult.updatedCookies !== originalCookies) {
    finalCookies = apiResult.updatedCookies;
    await db.updateAccount(accountId, finalCookies);
  }
  
  return finalCookies;
};

/**
 * 记录使用数据的函数
 * @param {number} accountId - 账户ID
 * @param {Object} apiResult - API调用结果
 * @returns {Promise<void>}
 */
const recordUsageData = async (accountId, apiResult) => {
  if (apiResult.success) {
    await db.addUsageData(accountId, apiResult);
  }
};

module.exports = {
  validateCookieFormat,
  testCookieValidity,
  validateAndTestCookies,
  handleCookieUpdate,
  recordUsageData
};