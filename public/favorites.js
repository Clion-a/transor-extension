document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const favoritesContainer = document.getElementById('favorites-container');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  // 存储所有收藏
  let allFavorites = [];
  // 当前筛选条件
  let currentFilter = 'all';
  // 当前搜索关键词
  let searchKeyword = '';
  
  // 加载收藏数据
  function loadFavorites() {
    console.log('开始加载收藏数据...');
    chrome.storage.sync.get('transorFavorites', function(result) {
      console.log('收藏数据:', result);
      const favorites = result.transorFavorites || [];
      allFavorites = favorites.sort((a, b) => b.timestamp - a.timestamp);
      console.log('排序后的收藏数据:', allFavorites);
      renderFavorites();
    });
  }
  
  // 渲染收藏内容
  function renderFavorites() {
    console.log('渲染收藏内容, 共有收藏:', allFavorites.length);
    // 如果没有收藏内容，显示空状态
    if (allFavorites.length === 0) {
      favoritesContainer.innerHTML = `
        <div class="empty-state">
          <h3>暂无收藏内容</h3>
          <p>浏览网页时，选择文本并点击收藏按钮添加到收藏夹</p>
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
          <h3>没有找到匹配的内容</h3>
          <p>尝试更改筛选条件或搜索关键词</p>
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
          <h2>${date}</h2>
          <div class="favorites-list">
            ${grouped[date].map(favorite => createFavoriteCard(favorite)).join('')}
          </div>
        </div>
      `;
    });
    
    favoritesContainer.innerHTML = html;
    
    // 绑定删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const favoriteId = this.closest('.favorite-card').dataset.id;
        deleteFavorite(favoriteId);
      });
    });
  }
  
  // 创建收藏卡片
  function createFavoriteCard(favorite) {
    const id = favorite.timestamp;
    const date = new Date(favorite.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="favorite-card" data-id="${id}">
        <div class="favorite-original">${escapeHtml(favorite.original)}</div>
        <div class="favorite-translation">${escapeHtml(favorite.translation)}</div>
        <div class="favorite-meta">
          <div class="favorite-source" title="${favorite.source || '未知来源'}">
            ${favorite.title ? escapeHtml(favorite.title) : '未知页面'} · ${timeStr}
          </div>
        </div>
        <div class="favorite-actions">
          <button class="action-btn delete-btn delete" title="删除收藏">×</button>
        </div>
      </div>
    `;
  }
  
  // 按日期分组
  function groupByDate(favorites) {
    const groups = {};
    
    favorites.forEach(favorite => {
      const date = new Date(favorite.timestamp);
      const dateStr = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
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
    if (confirm('确定要删除这条收藏吗？')) {
      chrome.storage.sync.get('transorFavorites', function(result) {
        let favorites = result.transorFavorites || [];
        favorites = favorites.filter(f => f.timestamp != id);
        
        chrome.storage.sync.set({ transorFavorites: favorites }, function() {
          allFavorites = favorites;
          renderFavorites();
        });
      });
    }
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
  
  // 初始加载
  loadFavorites();
}); 