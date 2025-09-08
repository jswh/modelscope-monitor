/**
 * 服务层统一导出
 * 封装所有业务逻辑相关的服务
 */

const accountService = require('./accountService');
const scheduleService = require('./scheduleService');

module.exports = {
  // 账户管理服务
  accountService,
  
  // 定时任务服务
  scheduleService
};