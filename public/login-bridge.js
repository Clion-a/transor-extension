// Transor插件与本地服务器的登录桥接脚本
console.log('Transor login-bridge.js 已加载');

// 检查当前是否在登录页面
const isLoginPage = window.location.pathname.includes('/login');
console.log('当前页面是否为登录页面:', isLoginPage, window.location.pathname);

// 添加调试功能，显示存储状态
function showStorageStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      console.log('=== Transor 存储状态 ===');
      console.log('authToken:', result.authToken ? '已设置' : '未设置');
      console.log('userInfo:', result.userInfo);
      console.log('loginTimestamp:', result.loginTimestamp ? new Date(result.loginTimestamp).toLocaleString() : '未设置');
      console.log('====================');
      resolve(result);
    });
  });
}

// 挂载到window对象上，方便调试
window.showTransorStorage = showStorageStatus;
window.clearTransorStorage = function() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      console.log('已清除所有Transor存储');
      resolve(true);
    });
  });
};

// 在window对象上添加方法，供网页直接调用
window.TransorExtension = {
  // 保存登录凭证到插件
  saveAuth: function(authData) {
    console.log('保存登录凭证:', authData);
    return new Promise((resolve, reject) => {
      if (!authData || !authData.token) {
        console.error('无效的认证数据', authData);
        reject(new Error('无效的认证数据'));
        return;
      }
      
      // 确保userInfo包含username
      if (!authData.user || !authData.user.username) {
        console.warn('用户信息中缺少username，将使用默认值');
        if (!authData.user) authData.user = {};
        authData.user.username = '用户' + Date.now().toString().slice(-4);
      }
      
      // 组装认证数据
      const storageData = {
        authToken: authData.token,
        userInfo: authData.user || {},
        loginTimestamp: Date.now()
      };
      
      console.log('即将保存到存储的数据:', storageData);
      
      // 先尝试直接保存到本地存储
      chrome.storage.local.set(storageData, function() {
        if (chrome.runtime.lastError) {
          console.error('直接保存到本地存储失败:', chrome.runtime.lastError);
          // 失败时回退到通过消息传递
          sendMessageToBackground();
        } else {
          console.log('已直接保存到本地存储');
          showStorageStatus().then(() => {
            resolve(true);
          });
        }
      });
      
      // 通过消息传递保存（作为备选方案）
      function sendMessageToBackground() {
        chrome.runtime.sendMessage({
          action: 'saveUserAuth',
          authData: authData
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('发送saveUserAuth消息失败:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            console.log('登录信息已保存到插件');
            // 验证保存是否成功
            setTimeout(() => {
              showStorageStatus().then(() => {
                resolve(true);
              });
            }, 500);
          } else {
            console.error('保存认证信息失败:', response?.error);
            reject(new Error(response?.error || '保存认证信息失败'));
          }
        });
      }
    });
  },
  
  // 清除插件中的登录凭证
  clearAuth: function() {
    console.log('清除登录凭证');
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'clearUserAuth'
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('发送clearUserAuth消息失败:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          console.log('登录信息已从插件中清除');
          resolve(true);
        } else {
          console.error('清除认证信息失败:', response?.error);
          reject(new Error(response?.error || '清除认证信息失败'));
        }
      });
    });
  },
  
  // 检查当前登录状态
  checkAuthStatus: function() {
    console.log('检查登录状态');
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'checkAuthStatus'
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('发送checkAuthStatus消息失败:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          console.log('获取到登录状态:', response.isLoggedIn, response.userInfo);
          resolve({
            isLoggedIn: response.isLoggedIn,
            userInfo: response.userInfo || {},
            reason: response.reason
          });
        } else {
          console.error('获取认证状态失败:', response?.error);
          reject(new Error(response?.error || '获取认证状态失败'));
        }
      });
    });
  }
};

// 定义处理登录成功的辅助函数
function handleLoginSuccess(e) {
  console.log('处理登录成功事件:', e.detail);
  
  if (e.detail && e.detail.token) {
    console.log('捕获到登录成功事件，token:', e.detail.token);
    window.TransorExtension.saveAuth(e.detail)
      .then(() => {
        console.log('登录信息已保存，准备跳转');
        // 可以在此处添加重定向逻辑，例如返回之前的页面
        if (e.detail.redirectUrl) {
          window.location.href = e.detail.redirectUrl;
        } else {
          window.location.href = '/';
        }
      })
      .catch(error => {
        console.error('保存登录信息失败:', error);
      });
  } else {
    console.error('登录事件缺少token:', e.detail);
  }
}

// 在页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
  console.log('页面加载完成，开始检查登录状态');
  
  // 如果不是登录页面，检查登录状态并重定向
  if (!isLoginPage) {
    window.TransorExtension.checkAuthStatus()
      .then(status => {
        if (!status.isLoggedIn) {
          // 如果未登录且不在登录页面，重定向到登录页
          console.log('未登录，即将重定向到登录页');
          window.location.href = '/login';
        } else {
          console.log('已登录，用户信息：', status.userInfo);
          // 可以在此处触发页面上的登录成功事件
          const loginEvent = new CustomEvent('transor:logged-in', { 
            detail: status.userInfo 
          });
          document.dispatchEvent(loginEvent);
        }
      })
      .catch(error => {
        console.error('检查登录状态出错:', error);
      });
  }
  
  // 如果是登录页面，添加登录成功的监听器
  if (isLoginPage) {
    console.log('在登录页面中，添加登录成功监听器');
    
    // 直接在window上也添加事件监听，避免事件捕获问题
    window.addEventListener('transor:login-success', function(e) {
      console.log('window捕获到登录成功事件:', e.detail);
      handleLoginSuccess(e);
    });
    
    // 监听自定义登录成功事件 - 使用捕获阶段确保先于其他监听器执行
    document.addEventListener('transor:login-success', function(e) {
      console.log('捕获到登录成功事件:', e.detail);
      handleLoginSuccess(e);
    }, true); // 使用捕获阶段
  }
});

// 通过可信资源加载脚本的备选方案
function loadScriptThroughTrustedResource() {
  const scriptUrl = chrome.runtime.getURL('transor-bridge-injection.js');
  
  // 使用fetch加载脚本内容
  fetch(scriptUrl)
    .then(response => response.text())
    .then(scriptContent => {
      // 创建函数并执行
      const executeScript = () => {
        try {
          // 创建函数的方式1：Function构造函数
          const execFunction = new Function(scriptContent);
          execFunction();
          console.log('通过Function构造函数成功执行脚本');
          
          // 发送扩展就绪事件
          const readyEvent = new CustomEvent('transor:extension-ready');
          document.dispatchEvent(readyEvent);
        } catch (error) {
          console.error('执行脚本内容失败:', error);
          // 尝试方式2：创建脚本URL并通过模块执行
          tryExecuteAsModule();
        }
      };
      
      const tryExecuteAsModule = () => {
        try {
          // 先在页面上注册必要的全局变量和函数
          window.triggerTransorLogin = function(authData) {
            console.log('备用触发Transor登录:', authData);
            const event = new CustomEvent('transor:login-success', {
              detail: authData
            });
            document.dispatchEvent(event);
            return true;
          };
          
          window.triggerTransorLogout = function() {
            console.log('备用触发Transor登出');
            const event = new CustomEvent('transor:logout-complete');
            document.dispatchEvent(event);
            return true;
          };
          
          // 创建并触发extension-ready事件
          const readyEvent = new CustomEvent('transor:extension-ready');
          document.dispatchEvent(readyEvent);
          
          console.log('已使用备用方法创建通信函数');
        } catch (error) {
          console.error('备用方法执行失败:', error);
        }
      };
      
      // 执行脚本
      executeScript();
    })
    .catch(err => {
      console.error('获取脚本内容失败:', err);
      // 使用备用的简单方法
      createBasicCommunicationFunctions();
    });
}

// 创建基本通信功能
function createBasicCommunicationFunctions() {
  console.log('使用备用方法创建基本通信功能');
  
  // 创建一个消息传递系统
  window.addEventListener('message', function(event) {
    // 只接受来自同源的消息
    if (event.origin !== window.location.origin) return;
    
    const data = event.data;
    if (data && data.type === 'transor-action') {
      console.log('接收到Transor消息:', data);
      
      if (data.action === 'login' && data.authData) {
        // 触发登录事件
        const loginEvent = new CustomEvent('transor:login-success', { 
          detail: data.authData 
        });
        document.dispatchEvent(loginEvent);
      }
    }
  });
  
  // 发送扩展就绪事件
  setTimeout(function() {
    const readyEvent = new CustomEvent('transor:extension-ready');
    document.dispatchEvent(readyEvent);
    console.log('已发送扩展就绪事件');
  }, 500);
}

// 使用Web扩展API安全地向页面注入交互脚本
function setupWindowFunctions() {
  console.log('开始设置页面通信功能');
  
  // 添加全局事件监听，确保捕获所有可能的事件
  window.addEventListener('transor:login-success', function(event) {
    console.log('Window监听到login-success事件 (在setupWindowFunctions中):', event.detail);
    handleLoginData(event.detail);
  }, true);
  
  document.addEventListener('transor:login-success', function(event) {
    console.log('Document监听到login-success事件 (在setupWindowFunctions中):', event.detail);
    handleLoginData(event.detail);
  }, true);
  
  function handleLoginData(authData) {
    if (!authData || !authData.token) {
      console.error('事件中缺少有效的authData或token', authData);
      return;
    }
    
    console.log('处理登录数据:', authData);
    
    // 使用全局提供的方法保存登录信息
    if (window.TransorExtension && window.TransorExtension.saveAuth) {
      window.TransorExtension.saveAuth(authData)
        .then(() => {
          console.log('登录信息已成功保存到插件，准备跳转');
          
          // 延迟一下确保数据保存完成
          setTimeout(function() {
            try {
              // 可以在此处添加重定向逻辑，例如返回之前的页面
              if (authData.redirectUrl) {
                window.location.href = authData.redirectUrl;
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              console.error('跳转失败:', e);
              alert('登录成功，但跳转失败: ' + e.message);
            }
          }, 100);
        })
        .catch(error => {
          console.error('保存登录信息失败:', error);
          alert('登录失败: ' + error.message);
        });
    } else {
      console.error('TransorExtension对象不可用');
      alert('登录失败: 扩展对象不可用');
    }
  }
  
  // 创建一个脚本元素，引用扩展内的脚本文件
  const scriptTag = document.createElement('script');
  scriptTag.src = chrome.runtime.getURL('transor-bridge-injection.js');
  scriptTag.type = 'text/javascript'; // 明确指定脚本类型
  scriptTag.async = true; // 异步加载脚本
  scriptTag.onload = function() {
    console.log('交互脚本加载完成');
    // 脚本加载后移除
    this.remove();
    
    // 设置自定义事件监听器，处理页面到扩展的通信
    document.addEventListener('transor:page-to-extension', function(event) {
      const data = event.detail;
      console.log('收到页面消息:', data);

      if (data && data.action === 'login' && data.authData) {
        // 触发登录事件
        console.log('触发登录事件，authData:', data.authData);
        const loginEvent = new CustomEvent('transor:login-success', { 
          detail: data.authData 
        });
        document.dispatchEvent(loginEvent);
        
        // 直接处理登录数据，不依赖事件传播
        handleLoginData(data.authData);
      } else if (data && data.action === 'logout') {
        // 处理登出请求
        console.log('处理登出请求');
        window.TransorExtension.clearAuth()
          .then(() => {
            console.log('登出成功，触发登出完成事件');
            const logoutEvent = new CustomEvent('transor:logout-complete');
            document.dispatchEvent(logoutEvent);
          })
          .catch(error => console.error('登出失败', error));
      } else {
        console.warn('收到无法识别的消息:', data);
      }
    });
    
    // 告知页面扩展已准备就绪
    console.log('发送扩展就绪事件');
    const readyEvent = new CustomEvent('transor:extension-ready');
    document.dispatchEvent(readyEvent);
    
    // 如果是登录页面，添加辅助函数
    if (isLoginPage) {
      // 添加一个辅助函数，让注入的脚本能直接调用它
      window.processTransorLogin = function(authData) {
        console.log('从注入脚本直接调用processTransorLogin:', authData);
        handleLoginData(authData);
        return '直接处理登录数据';
      };
    }
  };
  
  scriptTag.onerror = function(error) {
    console.error('加载交互脚本失败:', error);
    console.log('尝试通过其他方式加载交互脚本');
    loadScriptThroughTrustedResource();
  };
  
  // 添加到页面
  (document.head || document.documentElement).appendChild(scriptTag);
  console.log('交互脚本已添加到页面');
}

// 注入交互脚本
setupWindowFunctions(); 