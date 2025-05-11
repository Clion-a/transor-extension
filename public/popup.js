// 检查用户登录状态
function checkLoginStatus() {
  console.log('检查登录状态...');
  
  // 从chrome.storage.local获取authToken和userInfo
  chrome.storage.local.get(['authToken', 'userInfo'], function(result) {
    console.log('获取到的存储数据:', result);
    
    const authToken = result.authToken;
    const userInfo = result.userInfo;

    // 获取必要的DOM元素
    const loginStatus = document.getElementById('login-status');
    const statusIndicator = document.getElementById('status-indicator');
    const loginText = document.getElementById('login-text');
    
    if (loginStatus && statusIndicator && loginText) {
      if (authToken && userInfo) {
        // 已登录状态
        console.log('用户已登录, userInfo:', userInfo);
        
        // 添加登录状态样式
        loginStatus.classList.add('logged-in-status');
        statusIndicator.classList.remove('logged-out');
        statusIndicator.classList.add('logged-in');
        
        // 显示用户名 - 不翻译用户名，直接显示
        try {
          // 根据userInfo的结构解析用户名
          let username = '用户'; // 默认值使用中文，因为这是实际用户名而非需要翻译的UI文本
          
          if (typeof userInfo === 'string') {
            try {
              const parsedUserInfo = JSON.parse(userInfo);
              username = parsedUserInfo.username || parsedUserInfo.name || '用户';
              console.log('从字符串解析的用户信息:', parsedUserInfo);
            } catch (e) {
              console.error('解析userInfo字符串失败:', e);
              username = userInfo;
            }
          } else if (userInfo.username) {
            username = userInfo.username;
          } else if (userInfo.name) {
            username = userInfo.name;
          }
          
          // 直接设置用户名，不翻译
          loginText.textContent = username;
          console.log('显示用户名:', username);
          
        } catch (error) {
          console.error('处理用户信息时出错:', error);
          // 这里使用固定文本'已登录'而不是翻译值，因为这是回退到一个默认状态
          loginText.textContent = '已登录';
        }
        
        // 跳转到个人资料页面
        loginStatus.onclick = function() {
          loginStatus.classList.add('active');
          setTimeout(() => {
            try {
              chrome.tabs.create({ url: 'http://localhost:8080/profile' }, () => {
                if (chrome.runtime.lastError) {
                  console.error('打开个人资料页面失败:', chrome.runtime.lastError);
                }
                window.close(); // 关闭弹出窗口
              });
            } catch (error) {
              console.error('打开个人资料页面时出错:', error);
              window.close(); // 仍然关闭弹出窗口
            }
          }, 150);
        };
      } else {
        // 未登录状态
        console.log('用户未登录');
        
        // 移除登录状态样式
        loginStatus.classList.remove('logged-in-status');
        statusIndicator.classList.remove('logged-in');
        statusIndicator.classList.add('logged-out');
        
        // 使用i18n获取未登录状态的文本 - 这里需要翻译
        loginText.textContent = window.i18n.t('login_status.logged_out');
        
        // 添加登录重定向
        loginStatus.onclick = function() {
          try {
            loginStatus.classList.add('active');
            setTimeout(() => {
              // 打开登录页面
              try {
                chrome.tabs.create({ url: 'http://localhost:8080/login' }, () => {
                  if (chrome.runtime.lastError) {
                    console.error('打开登录页面失败:', chrome.runtime.lastError);
                  }
                  window.close(); // 关闭弹出窗口
                });
              } catch (error) {
                console.error('打开登录页面时出错:', error);
                window.close(); // 仍然关闭弹出窗口
              }
            }, 150);
          } catch (error) {
            console.error('重定向到登录页面失败:', error);
            window.close(); // 仍然关闭弹出窗口
          }
        };
      }
    } else {
      console.error('未找到登录状态相关DOM元素');
    }
  });
}

// 翻译页面上所有带有data-i18n属性的元素
function translatePage() {
  // 确保i18n已加载
  if (!window.i18n || !window.i18n.t) {
    console.error('i18n未加载，无法翻译页面');
    return;
  }
  
  console.log('正在翻译页面，当前语言：', window.i18n.getCurrentLanguage());
  
  // 查找所有带data-i18n属性的元素
  const elementsToTranslate = document.querySelectorAll('[data-i18n]');
  
  elementsToTranslate.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = window.i18n.t(key);
    
    // 根据元素类型设置文本内容
    if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
      element.placeholder = translation;
    } else if (element.tagName === 'INPUT' && element.type === 'button') {
      element.value = translation;
    } else {
      element.textContent = translation;
    }
  });
  
  // 更新页面标题
  document.title = `${window.i18n.t('app_title')} - 沉浸式翻译`;
  
  console.log('页面翻译完成');
}

// 监听存储变化，以实时更新登录状态
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && (changes.authToken || changes.userInfo)) {
    console.log('检测到登录状态变化，更新UI');
    // checkLoginStatus();
  }
  
  // 检测界面语言变化
  if (namespace === 'local' && changes['transor-ui-language']) {
    const newLanguage = changes['transor-ui-language'].newValue;
    console.log('检测到界面语言变化:', newLanguage);
    
    if (window.i18n && window.i18n.setLanguage) {
      window.i18n.setLanguage(newLanguage);
      translatePage();
      // 语言切换后重新检查登录状态
      // checkLoginStatus();
    }
  }
  
  // 监听收藏夹内容变化
  if (namespace === 'sync' && changes.transorFavorites) {
    console.log('检测到收藏夹内容变化，更新计数');
    updateFavoritesCount();
  }
});

// 获取收藏数量并更新UI
function updateFavoritesCount() {
  chrome.storage.sync.get('transorFavorites', function(result) {
    const favorites = result.transorFavorites || [];
    const countElement = document.querySelector('#open-favorites .count');
    if (countElement) {
      countElement.textContent = favorites.length;
    }
  });
}

// 封装获取生词本数据的接口请求方法
function fetchWordsList() {
  const apiUrl = 'http://api-test.transor.ai/priapi1/get_my_words';
  
  // 显示加载状态
  const countElement = document.querySelector('.favorites-btn .count');
  const originalText = countElement.textContent;
  countElement.textContent = '...';
  
  // 从chrome.storage.local获取authToken
  chrome.storage.local.get(['authToken'], function(result) {
    const authToken = result.authToken;
    
    // 如果没有authToken，显示未登录状态
    if (!authToken) {
      console.log('获取生词本：用户未登录');
      countElement.textContent = '0';
      return;
    }
    
    console.log('开始请求生词本数据...');
    
    // 直接发起请求，带上Authorization头部
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      },
      credentials: 'include' // 包含跨域请求的cookies
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('网络请求失败：' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('获取生词本数据成功:', data);
      // 更新生词本数量
      if (data && data.code === 1 && Array.isArray(data.data)) {
        countElement.textContent = data.data.length;
        
        // 存储生词数据，以便稍后使用
        localStorage.setItem('transor-words', JSON.stringify(data.data));
      } else {
        // 如果返回的数据格式不正确，显示0
        countElement.textContent = '0';
      }
    })
    .catch(error => {
      console.error('获取生词本数据失败:', error);
      // 请求失败时恢复原有显示，或显示错误提示
      countElement.textContent = originalText;
    });
  });
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup页面加载完成');
  
  // 更新收藏数量
  updateFavoritesCount();
  
  // 初始化多语言
  const initI18n = () => {
    // 确保i18n脚本已加载
    if (window.i18n) {
      // 从localStorage获取当前语言设置
      const currentLang = localStorage.getItem('transor-ui-language') || 'zh-CN';
      console.log(`当前界面语言: ${currentLang}`);
      
      // 设置当前语言
      if (window.i18n.setLanguage) {
        window.i18n.setLanguage(currentLang);
      }
      
      // 翻译页面
      translatePage();
      
      // 翻译完成后检查登录状态
      // checkLoginStatus();
    } else {
      console.error('i18n脚本未加载，将使用默认语言');
      // 如果i18n尚未加载，设置一个短暂的延迟再次尝试
      setTimeout(initI18n, 100);
    }
  };
  
  // 初始化多语言
  initI18n();
  
  // 添加打开收藏夹功能
  const openFavoritesBtn = document.getElementById('open-favorites');
  
  if (openFavoritesBtn) {
    openFavoritesBtn.addEventListener('click', function() {
      openFavoritesBtn.classList.add('active');
      // 方法1：直接在popup中打开标签页
      try {
        setTimeout(() => {
          try {
            const favoritesURL = chrome.runtime.getURL('favorites.html');
            chrome.tabs.create({ url: favoritesURL }, () => {
              if (chrome.runtime.lastError) {
                console.error('打开收藏夹失败:', chrome.runtime.lastError);
                // 尝试方法2
                sendMessageToBackground();
              } else {
                window.close(); // 关闭弹出窗口
              }
            });
          } catch (error) {
            console.error('打开收藏夹方法1出错:', error);
            // 尝试方法2
            sendMessageToBackground();
          }
        }, 150);
      } catch (error) {
        console.error('打开收藏夹方法1出错:', error);
        
        // 尝试方法2
        sendMessageToBackground();
      }
      
      // 方法2：发送消息给后台脚本打开
      function sendMessageToBackground() {
        try {
          chrome.runtime.sendMessage({ action: "openFavorites" }, () => {
            if (chrome.runtime.lastError) {
              console.error('发送打开收藏夹消息失败:', chrome.runtime.lastError);
            }
            window.close(); // 无论成功与否都关闭弹出窗口
          });
        } catch (error2) {
          console.error('打开收藏夹方法2出错:', error2);
          window.close(); // 仍然关闭弹出窗口
        }
      }
    });
  }
  
  // 添加按钮点击特效
  document.querySelectorAll('.login-status, .favorites-btn').forEach(element => {
    element.addEventListener('mousedown', function() {
      this.classList.add('active');
    });
    
    element.addEventListener('mouseup', function() {
      this.classList.remove('active');
    });
    
    element.addEventListener('mouseleave', function() {
      this.classList.remove('active');
    });
  });
  
  // 调用获取生词本数据的方法
  fetchWordsList();
}); 