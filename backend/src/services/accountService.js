const Database = require('../database');
const ModelScopeAPI = require('../modelscope-api');

const db = new Database();
const modelscopeAPI = new ModelScopeAPI();

/**
 * 账户服务层 - 封装所有账户相关业务逻辑
 * 优化：只保留最新使用量数据，不记录历史数据
 */
class AccountService {
  /**
   * 创建新账户
   * @param {string} name - 账户名称
   * @param {string} cookies - ModelScope cookies
   * @param {Object} cookieTestResult - Cookie测试结果
   * @returns {Promise<Object>} - 创建的账户信息
   */
  async createAccount(name, cookies, cookieTestResult) {
    const account = await db.addAccount(name, cookies);
    
    // 处理Cookie更新和使用数据记录
    await this._handleApiResult(account.id, cookies, cookieTestResult.data);
    
    return account;
  }

  /**
   * 更新账户Cookies
   * @param {number} id - 账户ID
   * @param {string} cookies - 新的cookies
   * @param {Object} cookieTestResult - Cookie测试结果
   * @returns {Promise<void>}
   */
  async updateAccountCookies(id, cookies, cookieTestResult) {
    // 使用API返回的更新后cookies（如果有）
    const finalCookies = await this._handleCookieUpdate(id, cookies, cookieTestResult.data);
    
    // 处理使用数据记录
    await this._handleRateLimitUpdate(id, cookieTestResult.data);
  }

  /**
   * 删除账户
   * @param {number} id - 账户ID
   * @returns {Promise<void>}
   */
  async deleteAccount(id) {
    await db.deleteAccount(id);
  }

  /**
   * 获取所有账户
   * @returns {Promise<Array>} - 账户列表
   */
  async getAllAccounts() {
    return await db.getAccounts();
  }

  /**
   * 根据ID获取账户
   * @param {number} id - 账户ID
   * @returns {Promise<Object|null>} - 账户信息或null
   */
  async getAccountById(id) {
    const accounts = await db.getAccounts();
    return accounts.find(acc => acc.id === parseInt(id)) || null;
  }

  /**
   * 获取账户使用数据 - 已弃用，只返回空数组
   * @deprecated 使用getAccountRateLimitData代替
   * @param {number} id - 账户ID
   * @param {number} limit - 返回记录数量限制
   * @returns {Promise<Array>} - 空数组，因为我们不记录历史数据
   */
  async getAccountUsageData(id, limit = 100) {
    console.warn('getAccountUsageData is deprecated. We only store latest data now.');
    return [];
  }

  /**
   * 获取账户最新使用数据
   * @param {number} id - 账户ID
   * @returns {Promise<Object|null>} - 最新使用数据或null
   */
  async getAccountLatestUsageData(id) {
    return await db.getLatestUsageData(id);
  }

  /**
   * 获取账户使用量数据 - 新方法
   * @param {number} id - 账户ID
   * @returns {Promise<Object|null>} - 使用量数据或null
   */
  async getAccountRateLimitData(id) {
    return await db.getAccountRateLimitData(id);
  }

  /**
   * 刷新账户使用数据
   * @param {number} id - 账户ID
   * @param {string} cookies - 账户cookies
   * @returns {Promise<Object>} - API调用结果
   */
  async refreshAccountUsage(id, cookies) {
    const result = await modelscopeAPI.getRateLimit(cookies);
    
    // 处理Cookie更新和使用数据记录
    await this._handleApiResult(id, cookies, result);
    
    return result;
  }

  /**
   * 处理Cookie更新逻辑
   * @private
   * @param {number} accountId - 账户ID
   * @param {string} originalCookies - 原始cookies
   * @param {Object} apiResult - API调用结果
   * @returns {Promise<string>} - 最终使用的cookies
   */
  async _handleCookieUpdate(accountId, originalCookies, apiResult) {
    let finalCookies = originalCookies;
    
    // 如果API调用返回了更新后的cookies，使用更新后的cookies
    if (apiResult.updatedCookies && apiResult.updatedCookies !== originalCookies) {
      finalCookies = apiResult.updatedCookies;
      await db.updateAccount(accountId, finalCookies);
    }
    
    return finalCookies;
  }

  /**
   * 处理限流数据更新
   * @private
   * @param {number} accountId - 账户ID
   * @param {Object} apiResult - API调用结果
   * @returns {Promise<void>}
   */
  async _handleRateLimitUpdate(accountId, apiResult) {
    // 只有成功时才更新使用数据
    if (apiResult.success) {
      await db.updateAccountRateLimitData(accountId, apiResult);
    }
  }

  /**
   * 处理API结果，包括Cookie更新和使用数据记录
   * @private
   * @param {number} accountId - 账户ID
   * @param {string} originalCookies - 原始cookies
   * @param {Object} apiResult - API调用结果
   * @returns {Promise<void>}
   */
  async _handleApiResult(accountId, originalCookies, apiResult) {
    // 处理Cookie更新
    await this._handleCookieUpdate(accountId, originalCookies, apiResult);
    
    // 处理限流数据更新
    await this._handleRateLimitUpdate(accountId, apiResult);
  }
}

module.exports = new AccountService();