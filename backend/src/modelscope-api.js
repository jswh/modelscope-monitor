const axios = require('axios');
const { parse } = require('cookie');

class ModelScopeAPI {
  constructor() {
    this.baseURL = 'https://modelscope.cn/api/v1';
    this.defaultHeaders = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'DNT': '1',
      'Pragma': 'no-cache',
      'Referer': 'https://modelscope.cn/my/myaccesstoken',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
      'bx-v': '2.5.31',
      'sec-ch-ua': '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'x-modelscope-accept-language': 'zh_CN'
    };
  }

  parseCookieString(cookieString) {
    const cookies = {};
    const cookieArray = cookieString.split(';');
    
    for (const cookie of cookieArray) {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    }
    
    return cookies;
  }

  generateTraceId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async getRateLimit(cookies) {
    try {
      const headers = {
        ...this.defaultHeaders,
        'X-Modelscope-Trace-Id': this.generateTraceId()
      };

      if (cookies) {
        headers['Cookie'] = cookies;
      }

      const response = await axios.get(`${this.baseURL}/inference/rate-limit`, {
        headers,
        timeout: 10000
      });

      // 从响应中提取新的cookies
      const updatedCookies = this.extractUpdatedCookies(cookies, response);

      return {
        success: true,
        data: response.data,
        updatedCookies: updatedCookies,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching rate limit:', error.message);
      
      // 即使出错也要检查是否有cookie更新
      let updatedCookies = cookies;
      if (error.response && error.response.headers['set-cookie']) {
        updatedCookies = this.extractUpdatedCookies(cookies, error.response);
      }
      
      let errorDetails = {
        success: false,
        error: error.message,
        updatedCookies: updatedCookies,
        timestamp: new Date().toISOString()
      };

      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.statusText = error.response.statusText;
        
        if (error.response.status === 401) {
          errorDetails.error = 'Authentication failed - cookies may be expired or invalid';
        } else if (error.response.status === 429) {
          errorDetails.error = 'Rate limit exceeded - too many requests';
        }
      } else if (error.code === 'ECONNABORTED') {
        errorDetails.error = 'Request timeout - server may be slow or unavailable';
      } else if (error.code === 'ENOTFOUND') {
        errorDetails.error = 'Network error - unable to reach ModelScope API';
      }

      return errorDetails;
    }
  }

  async testCookies(cookies) {
    const result = await this.getRateLimit(cookies);
    return {
      valid: result.success,
      data: result,
      updatedCookies: result.updatedCookies,
      message: result.success ? 'Cookies are valid' : result.error
    };
  }

  extractUpdatedCookies(currentCookies, response) {
    const setCookieHeader = response.headers['set-cookie'];
    if (!setCookieHeader) {
      return currentCookies;
    }

    // 处理单个或多个Set-Cookie头
    const newCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    
    // 解析现有cookies
    const existingCookies = currentCookies ? this.parseCookieString(currentCookies) : {};
    
    // 更新或添加新cookie
    for (const newCookie of newCookies) {
      // 提取cookie名称和值（忽略属性如expires、path等）
      const cookieParts = newCookie.split(';')[0].trim();
      const [name, value] = cookieParts.split('=');
      
      if (name && value) {
        existingCookies[name.trim()] = value.trim();
      }
    }
    
    // 重新构建cookie字符串
    return Object.entries(existingCookies)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('; ');
  }

  validateCookies(cookies) {
    if (!cookies || typeof cookies !== 'string') {
      return { valid: false, message: 'Cookies must be a non-empty string' };
    }

    const requiredCookies = ['csrf_session', 'csrf_token', 't', 'm_session_id'];
    const parsedCookies = this.parseCookieString(cookies);
    
    const missingCookies = requiredCookies.filter(cookie => !parsedCookies[cookie]);
    
    if (missingCookies.length > 0) {
      return {
        valid: false,
        message: `Missing required cookies: ${missingCookies.join(', ')}`
      };
    }

    return { valid: true, message: 'Cookies format is valid' };
  }
}

module.exports = ModelScopeAPI;
