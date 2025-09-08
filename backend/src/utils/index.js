/**
 * 工具层统一导出
 * 封装所有通用工具函数和助手类
 */

const {
  success,
  clientError,
  notFound,
  serverError,
  asyncHandler,
  routeErrorHandler
} = require('./responseHelper');

module.exports = {
  // 响应处理工具
  success,
  clientError,
  notFound,
  serverError,
  
  // 异步处理工具
  asyncHandler,
  routeErrorHandler
};