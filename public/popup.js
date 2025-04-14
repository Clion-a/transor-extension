// 添加打开收藏夹的功能
document.addEventListener('DOMContentLoaded', function() {
  const openFavoritesBtn = document.getElementById('open-favorites');
  
  if (openFavoritesBtn) {
    openFavoritesBtn.addEventListener('click', function() {
      // 方法1：直接在popup中打开标签页
      try {
        const favoritesURL = chrome.runtime.getURL('favorites.html');
        chrome.tabs.create({ url: favoritesURL });
        window.close(); // 关闭弹出窗口
      } catch (error) {
        console.error('打开收藏夹方法1出错:', error);
        
        // 方法2：发消息给background脚本打开
        try {
          chrome.runtime.sendMessage({ action: "openFavorites" }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('发送消息出错:', chrome.runtime.lastError);
            } else {
              console.log('通过background脚本打开收藏夹:', response);
              window.close(); // 关闭弹出窗口
            }
          });
        } catch (msgError) {
          console.error('发送消息尝试出错:', msgError);
          alert('无法打开收藏夹，请查看控制台日志获取详细信息');
        }
      }
    });
    console.log('收藏夹按钮事件已绑定');
  } else {
    console.error('未找到收藏夹按钮元素');
  }
}); 