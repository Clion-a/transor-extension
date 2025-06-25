// 页面脚本可以使用这些函数与扩展通信
// 这个文件将通过chrome.runtime.getURL加载，符合CSP要求

(function() {
  console.log('Transor交互脚本已注入');

  // 全局命名空间
  window.Transor = window.Transor || {};

  // 直接执行自检，验证与扩展的通信
  setTimeout(function() {
    if (window.triggerTransorLogin) {
      console.log("Transor交互脚本已准备好，可以开始通信");
      // 通知页面
      const event = new Event('transor:script-loaded');
      document.dispatchEvent(event);
      
      // 触发扩展加载完成事件
      setTimeout(function() {
        console.log("主动触发扩展加载完成事件");
        const readyEvent = new Event('transor:extension-loaded');
        document.dispatchEvent(readyEvent);
      }, 200);
    } else {
      console.warn("Transor交互脚本加载完成，但函数可能未正确定义");
    }
  }, 100);

  // 登录成功后触发事件示例
  window.triggerTransorLogin = function(authData) {
    console.log('触发Transor登录:', authData);
    
    // 验证authData结构
    if (!authData || typeof authData !== 'object') {
      console.error('无效的登录数据格式，必须是对象', authData);
      return false;
    }
    
    if (!authData.token) {
      console.error('缺少必需的token字段', authData);
      return false;
    }
    
    if (!authData.user || typeof authData.user !== 'object') {
      console.warn('缺少用户信息或格式不正确，将使用默认值');
      authData.user = {
        id: Date.now(),
        username: '用户' + Date.now().toString().slice(-4),
        email: 'user@example.com'
      };
    }
    
    try {
      // 创建并分发事件
      const event = new CustomEvent('transor:page-to-extension', {
        detail: {
          action: 'login',
          authData: authData
        }
      });
      
      document.dispatchEvent(event);
      console.log('登录事件已触发 (transor:page-to-extension)');
      
      // 尝试直接调用处理函数
      if (typeof window.processTransorLogin === 'function') {
        try {
          console.log('尝试直接调用processTransorLogin函数');
          window.processTransorLogin(authData);
        } catch (directCallError) {
          console.error('直接调用processTransorLogin失败:', directCallError);
        }
      } else {
        console.log('processTransorLogin函数不可用，只能依赖事件传播');
      }
      
      // 直接触发登录成功事件作为备选方法
      setTimeout(function() {
        console.log('直接触发login-success事件');
        const directEvent = new CustomEvent('transor:login-success', {
          detail: authData
        });
        document.dispatchEvent(directEvent);
        console.log('登录成功事件已直接触发 (transor:login-success)');
        
        // 尝试直接发送消息到父页面
        try {
          window.postMessage({
            type: 'transor-action',
            action: 'login',
            authData: authData
          }, window.location.origin);
          console.log('已通过postMessage发送登录数据');
        } catch (postError) {
          console.error('postMessage发送失败:', postError);
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('触发登录事件失败:', error);
      return false;
    }
  };

  // 登出示例
  window.triggerTransorLogout = function() {
    console.log('触发Transor登出');
    const event = new CustomEvent('transor:page-to-extension', {
      detail: {
        action: 'logout'
      }
    });
    document.dispatchEvent(event);
    return true;
  };

  // 检查Transor扩展状态
  window.checkTransorStatus = function() {
    return new Promise((resolve) => {
      console.log('检查Transor扩展状态');
      
      // 创建一个一次性事件监听器来接收响应
      const responseHandler = function(event) {
        document.removeEventListener('transor:extension-status', responseHandler);
        console.log('收到扩展状态:', event.detail);
        resolve(event.detail);
      };
      
      // 设置监听器
      document.addEventListener('transor:extension-status', responseHandler);
      
      // 触发状态检查请求
      const event = new CustomEvent('transor:page-to-extension', {
        detail: { action: 'checkStatus' }
      });
      document.dispatchEvent(event);
      
      // 设置超时，以防扩展没有响应
      setTimeout(() => {
        document.removeEventListener('transor:extension-status', responseHandler);
        console.warn('检查扩展状态超时');
        resolve({ available: false, reason: 'timeout' });
      }, 2000);
    });
  };

  // 监听扩展准备就绪事件
  document.addEventListener('transor:extension-ready', function() {
    console.log('Transor扩展已准备就绪，可以进行通信');
    
    // 触发自定义事件，通知页面扩展已加载
    const event = new Event('transor:extension-loaded');
    document.dispatchEvent(event);
    
    // 这里可以添加其他初始化逻辑
    window.TransorLoaded = true;
  });

  // 监听登出完成事件
  document.addEventListener('transor:logout-complete', function() {
    console.log('已成功登出Transor');
    
    // 触发用户可以监听的登出事件
    const event = new Event('transor:user-logged-out');
    document.dispatchEvent(event);
  });

  // 登录成功事件的直接监听器
  document.addEventListener('transor:login-success', function(event) {
    console.log('监听到 transor:login-success 事件:', event.detail);
  });

  // 添加全局辅助函数
  window.isTransorAvailable = function() {
    return typeof window.triggerTransorLogin === 'function' && 
           typeof window.triggerTransorLogout === 'function';
  };

  // 初始化就绪
  console.log('Transor注入脚本初始化完成');

  // 触发脚本加载完成事件
  setTimeout(function() {
    const loadEvent = new Event('transor:script-loaded');
    document.dispatchEvent(loadEvent);
  }, 500);
  
  return {
    triggerLogin: window.triggerTransorLogin,
    triggerLogout: window.triggerTransorLogout,
    checkStatus: window.checkTransorStatus
  };
})(); 