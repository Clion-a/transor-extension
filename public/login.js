// 登录页面的JavaScript逻辑

// 显示登录错误信息
function showLoginError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // 3秒后自动隐藏错误信息
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  } else {
    console.error('错误信息元素不存在，错误:', message);
  }
}

// 显示登录成功信息
function showLoginSuccess(message) {
  const successElement = document.getElementById('success-message');
  if (successElement) {
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // 3秒后自动隐藏成功信息
    setTimeout(() => {
      successElement.style.display = 'none';
    }, 3000);
  } else {
    console.log('成功信息:', message);
  }
}

// 保存用户数据到本地存储
function saveUserData(userData, token) {
  try {
    // 保存到Chrome存储
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        'userData': userData,
        'token': token,
        'isLoggedIn': true,
        'loginTime': Date.now()
      }, function() {
        console.log('用户数据已保存到Chrome存储');
      });
    } else {
      // 回退到localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loginTime', Date.now());
      localStorage.setItem('provider', userData.provider || 'email');
      console.log('用户数据已保存到localStorage');
    }
  } catch (error) {
    console.error('保存用户数据时出错:', error);
    showLoginError('无法保存用户信息，请重试');
  }
}

// 使用Chrome身份验证API执行Google登录
function initiateGoogleLogin() {
  // 确保在扩展环境中
  if (chrome && chrome.identity) {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2.client_id;
    const scopes = manifest.oauth2.scopes || [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    // 动态获取重定向URL并去掉末尾的斜杠
    let redirectURL = chrome.identity.getRedirectURL();
    // 如果URL末尾有斜杠，则去掉
    if (redirectURL.endsWith('/')) {
      redirectURL = redirectURL.slice(0, -1);
    }
    console.log("动态生成的重定向URL(已去除末尾斜杠):", redirectURL);
    
    // 生成随机nonce以增强安全性
    const nonce = generateNonce();
    
    // 构建OAuth 2.0 URL - 请求id_token和access_token
    let authUrl = 'https://accounts.google.com/o/oauth2/auth';
    authUrl += `?client_id=${clientId}`;
    authUrl += `&response_type=id_token token`; // 同时请求id_token和access_token
    authUrl += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
    authUrl += `&scope=${encodeURIComponent(scopes.join(' '))}`;
    authUrl += `&nonce=${nonce}`; // 添加nonce防止重放攻击
    
    // 启动OAuth流程
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, function(redirectUrl) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        showLoginError('Google登录失败: ' + chrome.runtime.lastError.message);
        return;
      }

      console.log("重定向URL:", redirectUrl);
      
      if (!redirectUrl) {
        showLoginError('Google登录失败: 未收到重定向URL');
        return;
      }
      
      // 从URL提取tokens
      const tokens = extractTokensFromUrl(redirectUrl);
      if (!tokens.idToken) {
        showLoginError('Google登录失败: 未能获取身份令牌');
        return;
      }
      
      console.log("获取到的ID令牌:", tokens.idToken);
      
      // 获取用户信息
      fetchUserInfo(tokens.accessToken, tokens.idToken);
    });
  } else {
    showLoginError('Google登录仅在Chrome扩展中可用');
  }
}

// 生成随机nonce的辅助函数
function generateNonce() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

// 从URL提取token的辅助函数 - 同时提取id_token和access_token
function extractTokensFromUrl(url) {
  const hashParams = url.split('#')[1];
  if (!hashParams) return { idToken: null, accessToken: null };
  
  const params = new URLSearchParams(hashParams);
  return {
    idToken: params.get('id_token'),
    accessToken: params.get('access_token')
  };
}

// 使用令牌获取用户信息
function fetchUserInfo(accessToken, idToken) {
  // 可以使用idToken直接获取用户信息，也可以使用accessToken请求userinfo端点
  fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('获取用户信息失败');
    }
    return response.json();
  })
  .then(userData => {
    // 保存用户数据
    const userInfo = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      imageUrl: userData.picture,
      provider: 'google'
    };
    
    // 保存idToken而不是accessToken
    saveUserData(userInfo, idToken);
    console.log("用户信息:", userInfo);
    console.log("ID令牌:", idToken);
    
    // 发送消息给扩展
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ 
        action: 'login_success', 
        userData: userInfo,
        provider: 'google',
        idToken: idToken
      });
      // 关闭窗口
      setTimeout(() => {
        // window.close();
      }, 1000);
    }
  })
  .catch(error => {
    console.error('获取用户信息错误:', error);
    showLoginError('无法获取用户信息: ' + error.message);
  });
}

// 退出登录函数，由退出按钮调用
function signOut() {
  // 清除本地存储
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove(['user', 'token', 'isLoggedIn', 'loginTime']);
  } else {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('provider');
  }
  
  // 刷新页面或跳转到登录页
  window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  // 获取表单和输入元素
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const loginButton = document.getElementById('login-button');
  const forgotPassword = document.getElementById('forgot-password');
  const signupLink = document.getElementById('signup-link');
  const googleLogin = document.getElementById('google-login');
  const appleLogin = document.getElementById('apple-login');
  const signoutLink = document.getElementById('signout-link');
  
  // 隐藏错误信息
  emailError.style.display = 'none';
  passwordError.style.display = 'none';
  
  // 检查用户是否已登录，显示退出链接
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || 
                     (chrome.storage && chrome.storage.local && chrome.storage.local.get('isLoggedIn'));
  if (isLoggedIn && signoutLink) {
    signoutLink.style.display = 'inline-block';
  }
  
  // 验证邮箱格式
  function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})$/;
    return re.test(String(email).toLowerCase());
  }
  
  // 输入字段验证
  emailInput.addEventListener('input', () => {
    if (validateEmail(emailInput.value)) {
      emailInput.classList.remove('error');
      emailError.style.display = 'none';
    } else {
      emailInput.classList.add('error');
      emailError.style.display = 'block';
    }
    validateForm();
  });
  
  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length >= 6) {
      passwordInput.classList.remove('error');
      passwordError.style.display = 'none';
    } else {
      passwordInput.classList.add('error');
      passwordError.style.display = 'block';
    }
    validateForm();
  });
  
  // 验证表单是否可提交
  function validateForm() {
    if (validateEmail(emailInput.value) && passwordInput.value.length >= 6) {
      loginButton.disabled = false;
    } else {
      loginButton.disabled = true;
    }
  }
  
  // 初始禁用登录按钮
  loginButton.disabled = true;
  
  // 表单提交处理
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 显示加载状态
    loginButton.textContent = '登录中...';
    loginButton.disabled = true;
    
    try {
      // 这里添加实际登录逻辑 - 与后端API交互
      const response = await loginUser(emailInput.value, passwordInput.value);
      
      if (response.success) {
        // 登录成功，保存用户信息和token
        saveUserData(response.userData, response.token);
        
        // 重定向到主应用页面或关闭登录窗口
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'login_success', userData: response.userData });
          window.close();
        } else {
          // 在非扩展环境下，可以使用其他方式处理登录成功
          console.log('登录成功', response.userData);
          showLoginSuccess('登录成功！正在跳转...');
          
          // 示例：保存到sessionStorage并跳转
          sessionStorage.setItem('user', JSON.stringify(response.userData));
          sessionStorage.setItem('token', response.token);
          
          // 延迟后跳转到主页
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        }
      } else {
        // 显示登录失败错误
        showLoginError(response.message || '登录失败，请检查您的凭据');
      }
    } catch (error) {
      showLoginError('登录时发生错误，请稍后再试');
      console.error('登录错误:', error);
    } finally {
      loginButton.textContent = '登录';
      loginButton.disabled = false;
    }
  });
  
  // 模拟登录API请求
  async function loginUser(email, password) {
    // 这里应替换为实际的API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟成功登录响应
        if (email === 'test@example.com' && password === 'password123') {
          resolve({
            success: true,
            userData: {
              id: '12345',
              email: email,
              name: '测试用户',
              plan: 'free'
            },
            token: 'sample-jwt-token-for-testing'
          });
        } else {
          resolve({
            success: false,
            message: '邮箱或密码不正确'
          });
        }
      }, 1500); // 模拟网络延迟
    });
  }
  
  // 忘记密码处理
  forgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    // 检查chrome.tabs API是否可用
    if (chrome.tabs && chrome.tabs.create) {
      // 在扩展环境中打开新标签页
      chrome.tabs.create({ url: 'https://transor.example.com/forgot-password' });
    } else {
      // 在普通网页环境中打开新窗口或标签页
      window.open('https://transor.example.com/forgot-password', '_blank');
    }
  });
  
  // 注册链接处理
  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    // 检查chrome.tabs API是否可用
    if (chrome.tabs && chrome.tabs.create) {
      // 在扩展环境中打开新标签页
      chrome.tabs.create({ url: 'https://transor.example.com/signup' });
    } else {
      // 在普通网页环境中打开新窗口或标签页
      window.open('https://transor.example.com/signup', '_blank');
    }
  });
  
  // Google登录按钮处理
  googleLogin.addEventListener('click', () => {
    initiateGoogleLogin();
  });
  
  // Apple登录处理
  appleLogin.addEventListener('click', () => {
    initiateAppleLogin();
  });
  
  // 如果有退出链接，绑定退出事件
  if (signoutLink) {
    signoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });
  }
});

// 使用Apple Sign In执行登录
function initiateAppleLogin() {
  try {
    console.log('开始Apple登录流程');
    
    // 检查是否在Chrome扩展环境中
    if (!chrome || !chrome.identity) {
      showLoginError('Apple登录需要在Chrome扩展中运行');
      return;
    }
    
    // 添加Apple Sign In脚本（如果尚未加载）
    if (!document.getElementById('applejs')) {
      const script = document.createElement('script');
      script.id = 'applejs';
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        configureAppleSignIn();
      };
      
      script.onerror = () => {
        showLoginError('无法加载Apple登录SDK');
      };
      
      document.head.appendChild(script);
    } else {
      configureAppleSignIn();
    }
  } catch (error) {
    console.error('初始化Apple登录时出错:', error);
    showLoginError('Apple登录初始化失败');
  }
}

// 配置Apple Sign In
function configureAppleSignIn() {
  try {
    // 检查AppleID对象是否已定义
    if (typeof window.AppleID === 'undefined') {
      console.error('AppleID对象未定义，可能是脚本未正确加载');
      showLoginError('Apple登录组件未加载，请重试');
      return;
    }
    
    // 获取重定向URL（与Google登录相同的方式）
    let redirectURL = chrome.identity.getRedirectURL();
    if (redirectURL.endsWith('/')) {
      redirectURL = redirectURL.slice(0, -1);
    }
    
    // 这里需要您在Apple开发者账户中注册的客户端ID
    const clientId = 'com.your.app.id'; // 替换为您实际的Apple客户端ID
    
    // 初始化Apple Sign In
    window.AppleID.auth.init({
      clientId: clientId,
      scope: 'name email',
      redirectURI: redirectURL,
      usePopup: true
    });
    
    // 执行登录
    window.AppleID.auth.signIn()
      .then(handleAppleSignInSuccess)
      .catch(handleAppleSignInError);
      
  } catch (error) {
    console.error('配置Apple登录时出错:', error);
    showLoginError('Apple登录配置失败');
  }
}

// 处理Apple登录成功
function handleAppleSignInSuccess(response) {
  console.log('Apple登录成功:', response);
  
  try {
    // 验证令牌
    if (!response || !response.authorization || !response.authorization.id_token) {
      throw new Error('未收到有效的身份令牌');
    }
    
    const idToken = response.authorization.id_token;
    const user = response.user || {};
    
    // 从ID令牌中解析用户信息
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('无效的ID令牌格式');
    }
    
    // 解码JWT载荷
    const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // 准备用户数据对象
    const userInfo = {
      id: payload.sub,
      email: payload.email || user.email || '',
      name: user.name ? `${user.name.firstName || ''} ${user.name.lastName || ''}`.trim() : '未提供姓名',
      provider: 'apple'
    };
    
    // 显示成功消息
    showLoginSuccess('Apple登录成功!');
    
    // 保存用户数据
    saveUserData(userInfo, idToken);
    
    // 发送消息给扩展
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'login_success',
        userData: userInfo,
        provider: 'apple'
      });
      
      // 关闭窗口
      setTimeout(() => {
        // window.close();
      }, 1000);
    }
  } catch (error) {
    console.error('处理Apple登录响应时出错:', error);
    showLoginError('Apple登录处理失败: ' + error.message);
  }
}

// 处理Apple登录错误
function handleAppleSignInError(error) {
  console.error('Apple登录错误:', error);
  
  // 确定错误类型和消息
  let errorMessage = '登录失败，请重试';
  
  if (error.error === 'popup_closed_by_user') {
    errorMessage = '登录窗口被关闭';
  } else if (error.error === 'invalid_client') {
    errorMessage = '客户端配置错误';
  } else if (error.error) {
    errorMessage = `错误: ${error.error}`;
  }
  
  showLoginError(`Apple登录失败: ${errorMessage}`);
} 