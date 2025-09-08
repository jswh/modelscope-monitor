/**
 * 响应助手工具 - 统一错误处理和响应格式
 */

/**
 * 统一成功响应格式
 * @param {Object} res - Express响应对象
 * @param {Object} data - 要返回的数据
 * @param {string} [message] - 可选的成功消息
 * @returns {void}
 */
const success = (res, data = null, message = null) => {
  const response = { success: true };
  
  if (data !== null) {
    // 根据数据类型决定如何添加到响应中
    if (typeof data === 'object' && data !== null) {
      // 如果是对象，展开其属性
      Object.assign(response, data);
    } else {
      // 如果是其他类型，作为data属性
      response.data = data;
    }
  }
  
  if (message) {
    response.message = message;
  }
  
  res.json(response);
};

/**
 * 统一客户端错误响应格式 (400)
 * @param {Object} res - Express响应对象
 * @param {string} error - 错误消息
 * @returns {void}
 */
const clientError = (res, error) => {
  res.status(400).json({ success: false, error });
};

/**
 * 统一未找到错误响应格式 (404)
 * @param {Object} res - Express响应对象
 * @param {string} error - 错误消息
 * @returns {void}
 */
const notFound = (res, error = 'Resource not found') => {
  res.status(404).json({ success: false, error });
};

/**
 * 统一服务器错误响应格式 (500)
 * @param {Object} res - Express响应对象
 * @param {string} operation - 操作名称，用于日志记录
 * @param {Error} error - 错误对象
 * @returns {void}
 */
const serverError = (res, operation, error) => {
  console.error(`Error ${operation}:`, error);
  res.status(500).json({ error: 'Internal server error' });
};

/**
 * 异步错误处理包装器
 * @param {Function} fn - 异步函数
 * @param {string} operation - 操作名称，用于错误日志
 * @returns {Function} - 包装后的中间件函数
 */
const asyncHandler = (fn, operation) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      serverError(res, operation, error);
    }
  };
};

/**
 * 路由级别的错误处理中间件
 * @param {string} operation - 操作名称，用于错误日志
 * @returns {Function} - Express错误处理中间件
 */
const routeErrorHandler = (operation) => {
  return (error, req, res, next) => {
    serverError(res, operation, error);
  };
};

module.exports = {
  success,
  clientError,
  notFound,
  serverError,
  asyncHandler,
  routeErrorHandler
};