document.addEventListener('DOMContentLoaded', function() {
  console.log("初始化收藏夹JS...");
  
  // 获取DOM元素
  const favoritesContainer = document.getElementById('favorites-container');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-button');
  const filterBtns = document.querySelectorAll('.filter-button');
  const loadingSpinner = document.getElementById('loading-spinner');
  const toastMessage = document.getElementById('toast-message');
  
  // 存储所有收藏
  let allFavorites = [];
  // 当前筛选条件
  let currentFilter = 'all';
  // 当前搜索关键词
  let searchKeyword = '';
  
  // 监听HTML中触发的语言变化事件
  document.addEventListener('language-changed', function(e) {
    console.log('JS检测到语言变化事件:', e.detail.language);
    setTimeout(renderFavorites, 50);
  });
  
  // 加载收藏数据
  function loadFavorites() {
    console.log('开始加载收藏数据...');
    
    if (window.TransorStorageManager) {
      // 使用新的存储管理器
      window.TransorStorageManager.loadFavorites()
        .then(favorites => {
          allFavorites = favorites.sort((a, b) => b.timestamp - a.timestamp);
          console.log(`✅ 通过存储管理器加载了 ${allFavorites.length} 条收藏数据`);
          renderFavorites();
        })
        .catch(error => {
          console.error('加载收藏数据失败:', error);
          // 降级到原有方式
          loadFavoritesLegacy();
        });
    } else {
      // 降级到原有方式
      console.warn('存储管理器不可用，使用原有方式');
      loadFavoritesLegacy();
    }
  }
  
  // 原有的加载方式（作为降级方案）
  function loadFavoritesLegacy() {
    chrome.storage.sync.get('transorFavorites', function(result) {
      console.log('收藏数据:', result);
      const favorites = result.transorFavorites || [];
      allFavorites = favorites.sort((a, b) => b.timestamp - a.timestamp);
      console.log('通过原有方式加载收藏数据:', allFavorites.length, '条');
      renderFavorites();
    });
  }
  
  // 渲染收藏内容
  function renderFavorites() {
    console.log('开始渲染收藏内容, 当前语言:', window.i18n ? window.i18n.currentLanguage : '未设置');
    // 如果没有收藏内容，显示空状态
    if (allFavorites.length === 0) {
      favoritesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="bi bi-bookmark"></i></div>
          <div class="empty-state-title">${window.i18n ? window.i18n.t('empty_favorites') : '暂无收藏内容'}</div>
          <div class="empty-state-description">${window.i18n ? window.i18n.t('empty_description') : '浏览网页时，选择文本并点击收藏按钮添加到收藏夹'}</div>
        </div>
      `;
      return;
    }
    
    // 筛选收藏内容
    let filteredFavorites = filterFavorites(allFavorites, currentFilter);
    
    // 搜索筛选
    if (searchKeyword) {
      filteredFavorites = filteredFavorites.filter(favorite => 
        favorite.original.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        favorite.translation.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    // 如果筛选后没有内容
    if (filteredFavorites.length === 0) {
      favoritesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="bi bi-search"></i></div>
          <div class="empty-state-title">${window.i18n ? window.i18n.t('no_matching_content') : '没有找到匹配的内容'}</div>
          <div class="empty-state-description">${window.i18n ? window.i18n.t('try_change_filter') : '尝试更改筛选条件或搜索关键词'}</div>
        </div>
      `;
      return;
    }
    
    // 按日期分组
    const grouped = groupByDate(filteredFavorites);
    
    // 生成HTML
    let html = '';
    
    Object.keys(grouped).forEach(date => {
      html += `
        <div class="date-group">
          <div class="date-group-title">${date}</div>
          ${grouped[date].map(favorite => createFavoriteCard(favorite)).join('')}
        </div>
      `;
    });
    
    favoritesContainer.innerHTML = html;
    
    // 绑定删除按钮事件
    document.querySelectorAll('.delete-action').forEach(btn => {
      btn.addEventListener('click', function() {
        const favoriteId = this.closest('.favorite-item').dataset.id;
        deleteFavorite(favoriteId);
      });
    });
    
    // 绑定复制按钮事件
    document.querySelectorAll('.copy-action').forEach(btn => {
      btn.addEventListener('click', function() {
        const favoriteItem = this.closest('.favorite-item');
        const text = favoriteItem.querySelector('.favorite-text').textContent;
        copyToClipboard(text);
      });
    });
    
    console.log('收藏内容渲染完成');
  }
  
  // 复制到剪贴板
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
      showToast(window.i18n ? window.i18n.t('copied_message') : '已复制到剪贴板');
    });
  }
  
  // 显示提示消息
  function showToast(message) {
    toastMessage.textContent = message;
    toastMessage.classList.add('show');
    setTimeout(() => {
      toastMessage.classList.remove('show');
    }, 2000);
  }
  
  // 创建收藏卡片
  function createFavoriteCard(favorite) {
    const id = favorite.timestamp;
    const date = new Date(favorite.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="favorite-item" data-id="${id}">
        <div class="favorite-text">${escapeHtml(favorite.original)}</div>
        <div class="favorite-translation">${escapeHtml(favorite.translation)}</div>
        <div class="favorite-meta">
          <div class="favorite-source">
            <a href="${favorite.url || '#'}" target="_blank" title="${favorite.source || (window.i18n ? window.i18n.t('unknown_source') : '未知来源')}">
              ${favorite.title ? escapeHtml(favorite.title) : (window.i18n ? window.i18n.t('unknown_page') : '未知页面')}
            </a> · ${timeStr}
          </div>
          <div class="favorite-actions">
            <button class="action-button copy-action" title="${window.i18n ? window.i18n.t('copy_action') : '复制'}">
              <i class="bi bi-clipboard"></i> ${window.i18n ? window.i18n.t('copy_action') : '复制'}
            </button>
            <button class="action-button delete-action" title="${window.i18n ? window.i18n.t('delete_action') : '删除'}">
              <i class="bi bi-trash"></i> ${window.i18n ? window.i18n.t('delete_action') : '删除'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // 按日期分组
  function groupByDate(favorites) {
    const groups = {};
    const currentLang = window.i18n ? window.i18n.currentLanguage : 'zh-CN';
    console.log('按日期分组，当前语言:', currentLang);
    
    // 根据当前语言选择日期格式
    const dateLocale = {
      'zh-CN': 'zh-CN',
      'en': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR'
    }[currentLang] || 'zh-CN';
    
    favorites.forEach(favorite => {
      const date = new Date(favorite.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateStr;
      
      // 根据日期与当前日期的关系，确定分组标题
      if (date.toDateString() === today.toDateString()) {
        dateStr = window.i18n ? window.i18n.t('date_today') : '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateStr = window.i18n ? window.i18n.t('date_yesterday') : '昨天';
      } else {
        // 使用本地化日期格式
        dateStr = date.toLocaleDateString(dateLocale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push(favorite);
    });
    
    return groups;
  }
  
  // 筛选收藏
  function filterFavorites(favorites, filter) {
    if (filter === 'all') return favorites;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (filter) {
      case 'word':
        return favorites.filter(f => f.original.split(/\s+/).length <= 2);
      case 'sentence':
        return favorites.filter(f => {
          const words = f.original.split(/\s+/).length;
          return words > 2 && words <= 20;
        });
      case 'paragraph':
        return favorites.filter(f => f.original.split(/\s+/).length > 20);
      case 'today':
        return favorites.filter(f => new Date(f.timestamp) >= today);
      case 'week':
        return favorites.filter(f => new Date(f.timestamp) >= weekStart);
      case 'month':
        return favorites.filter(f => new Date(f.timestamp) >= monthStart);
      default:
        return favorites;
    }
  }
  
  // 删除收藏
  function deleteFavorite(id) {
    const confirmMessage = window.i18n ? window.i18n.t('confirm_delete') : '确定要删除这条收藏吗？';
    if (confirm(confirmMessage)) {
      if (window.TransorStorageManager) {
        // 使用新的存储管理器
        window.TransorStorageManager.deleteFavorite(parseInt(id))
          .then(result => {
            if (result.success) {
              console.log('✅ 删除收藏成功');
              // 重新加载数据
              loadFavorites();
            } else {
              console.error('删除收藏失败:', result.error);
              // 降级到原有方式
              deleteFavoriteLegacy(id);
            }
          })
          .catch(error => {
            console.error('删除收藏异常:', error);
            // 降级到原有方式
            deleteFavoriteLegacy(id);
          });
      } else {
        // 降级到原有方式
        console.warn('存储管理器不可用，使用原有方式');
        deleteFavoriteLegacy(id);
      }
    }
  }
  
  // 原有的删除方式（作为降级方案）
  function deleteFavoriteLegacy(id) {
    chrome.storage.sync.get('transorFavorites', function(result) {
      let favorites = result.transorFavorites || [];
      favorites = favorites.filter(f => f.timestamp != id);
      
      chrome.storage.sync.set({ transorFavorites: favorites }, function() {
        allFavorites = favorites;
        renderFavorites();
      });
    });
  }
  
  // HTML转义函数
  function escapeHtml(text) {
    if (text === null || text === undefined) {
      return '';
    }
    
    text = String(text);
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // 搜索事件处理
  searchBtn.addEventListener('click', function() {
    searchKeyword = searchInput.value.trim();
    renderFavorites();
  });
  
  searchInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      searchKeyword = searchInput.value.trim();
      renderFavorites();
    }
  });
  
  // 筛选按钮点击事件
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderFavorites();
    });
  });
  
  // 监听语言变化，在语言变化时重新渲染
  try {
    console.log('设置chrome.storage变化监听器和消息监听器...');
    
    // 监听存储变化
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'local' && changes['transor-ui-language']) {
        const newLanguage = changes['transor-ui-language'].newValue;
        console.log('收藏夹JS检测到界面语言变化:', newLanguage);
        
        // 使用延迟和错误处理
        try {
          // 更长的延迟确保语言设置已完全应用
          setTimeout(() => {
            try {
              console.log('准备重新渲染收藏夹内容...');
              renderFavorites();
            } catch (e) {
              console.error('重新渲染收藏夹内容时出错:', e);
            }
          }, 250);
        } catch (e) {
          console.error('处理语言变更事件时出错:', e);
        }
      }
    });
    
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      try {
        if (message && message.action === 'language-changed') {
          console.log('收到语言变更消息:', message.language);
          
          // 确保页面先应用新语言设置
          setTimeout(() => {
            try {
              console.log('通过消息触发重新渲染收藏夹...');
              renderFavorites();
              sendResponse({ success: true });
            } catch (e) {
              console.error('消息触发重新渲染失败:', e);
              sendResponse({ success: false, error: e.message });
            }
          }, 250);
          
          return true; // 保持消息通道开放以便异步响应
        }
      } catch (e) {
        console.error('处理消息时出错:', e);
      }
    });
    
    // 页面消息事件监听
    document.addEventListener('language-changed', function(e) {
      try {
        if (e && e.detail && e.detail.language) {
          console.log('JS检测到HTML发出的语言变化事件:', e.detail.language);
          
          // 短延迟后渲染
          setTimeout(() => {
            try {
              renderFavorites();
            } catch (innerError) {
              console.error('事件触发渲染时出错:', innerError);
            }
          }, 100);
        }
      } catch (error) {
        console.error('处理语言变更事件时出错:', error);
      }
    });
  } catch (e) {
    console.error('设置chrome.storage监听器失败:', e);
  }
  
  // 初始加载
  loadFavorites();
}); 