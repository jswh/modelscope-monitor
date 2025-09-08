const accountService = require('./accountService');

/**
 * 定时任务服务层 - 封装所有定时任务相关逻辑
 */
class ScheduleService {
  /**
   * 执行定时更新所有账户的使用数据
   * @returns {Promise<void>}
   */
  async updateAllAccountsUsage() {
    console.log('Running scheduled usage data update...');
    
    try {
      const accounts = await accountService.getAllAccounts();
      
      for (const account of accounts) {
        try {
          const result = await accountService.refreshAccountUsage(account.id, account.cookies);
          
          if (result.success) {
            console.log(`Updated usage data for account: ${account.name}`);
          } else {
            console.error(`Failed to update usage data for account ${account.name}: ${result.error}`);
          }
        } catch (error) {
          console.error(`Error updating account ${account.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in scheduled update:', error);
    }
  }

  /**
   * 创建定时任务调度器
   * @param {string} schedule - Cron表达式，默认每5分钟执行一次
   * @returns {Function} - 取消定时任务的函数
   */
  createUsageUpdateSchedule(schedule = '*/5 * * * *') {
    const cron = require('node-cron');
    
    const scheduledTask = cron.schedule(schedule, async () => {
      await this.updateAllAccountsUsage();
    }, {
      scheduled: false
    });

    // 启动定时任务
    scheduledTask.start();
    console.log(`Scheduled usage data update created with schedule: ${schedule}`);

    // 返回取消函数
    return () => {
      scheduledTask.stop();
      console.log('Scheduled usage data update stopped');
    };
  }

  /**
   * 获取定时任务状态
   * @param {Object} scheduledTask - cron任务对象
   * @returns {Object} - 任务状态信息
   */
  getScheduleStatus(scheduledTask) {
    return {
      running: scheduledTask && scheduledTask.running,
      scheduled: scheduledTask && scheduledTask.scheduled
    };
  }
}

module.exports = new ScheduleService();