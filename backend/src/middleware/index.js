/**
 * 中间件层统一导出
 * 封装所有HTTP请求处理相关的中间件
 */

const {
  validateCookieFormat,
  testCookieValidity,
  validateAndTestCookies,
  handleCookieUpdate,
  recordUsageData
} = require('./cookieMiddleware');

module.exports = {
  // Cookie验证相关中间件
  validateCookieFormat,
  testCookieValidity,
  validateAndTestCookies,
  
  // Cookie处理相关函数
  handleCookieUpdate,
  recordUsageData
};