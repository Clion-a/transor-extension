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
        
        // 显示用户名
        try {
          // 根据userInfo的结构解析用户名
          let username = '用户';
          
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
          
          loginText.textContent = username;
          console.log('显示用户名:', username);
          
        } catch (error) {
          console.error('处理用户信息时出错:', error);
          loginText.textContent = '已登录';
        }
        
        // 跳转到个人资料页面
        loginStatus.onclick = function() {
          loginStatus.classList.add('active');
          setTimeout(() => {
            chrome.tabs.create({ url: 'http://localhost:8080/profile' });
            window.close(); // 关闭弹出窗口
          }, 150);
        };
      } else {
        // 未登录状态
        console.log('用户未登录');
        
        // 移除登录状态样式
        loginStatus.classList.remove('logged-in-status');
        statusIndicator.classList.remove('logged-in');
        statusIndicator.classList.add('logged-out');
        loginText.textContent = '未登录';
        
        // 添加登录重定向
        loginStatus.onclick = function() {
          try {
            loginStatus.classList.add('active');
            setTimeout(() => {
              // 打开登录页面
              chrome.tabs.create({ url: 'http://localhost:8080/login' });
              window.close(); // 关闭弹出窗口
            }, 150);
          } catch (error) {
            console.error('重定向到登录页面失败:', error);
          }
        };
      }
    } else {
      console.error('未找到登录状态相关DOM元素');
    }
  });
}

// 监听存储变化，以实时更新登录状态
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && (changes.authToken || changes.userInfo)) {
    console.log('检测到登录状态变化，更新UI');
    checkLoginStatus();
  }
});

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup页面加载完成');
  
  // 检查登录状态
  checkLoginStatus();
  
  // 添加打开收藏夹功能
  const openFavoritesBtn = document.getElementById('open-favorites');
  
  if (openFavoritesBtn) {
    openFavoritesBtn.addEventListener('click', function() {
      openFavoritesBtn.classList.add('active');
      // 方法1：直接在popup中打开标签页
      try {
        setTimeout(() => {
          const favoritesURL = chrome.runtime.getURL('favorites.html');
          chrome.tabs.create({ url: favoritesURL });
          window.close(); // 关闭弹出窗口
        }, 150);
      } catch (error) {
        console.error('打开收藏夹方法1出错:', error);
        
        // 方法2：发送消息给后台脚本打开
        try {
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: "openFavorites" }, function() {
              window.close(); // 关闭弹出窗口
            });
          }, 150);
        } catch (error2) {
          console.error('打开收藏夹方法2出错:', error2);
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
}); 