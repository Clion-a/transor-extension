/**
 * Transor 存储管理器
 * 用于智能管理收藏数据的存储，优化存储空间和性能
 */

(function() {
  console.log('初始化存储管理器...');

  // 常量定义
  const SYNC_QUOTA_BYTES = 8192; // Chrome sync存储限制 (8KB)
  const LOCAL_QUOTA_BYTES = 5242880; // Chrome local存储限制 (5MB)
  const FAVORITES_KEY = 'transorFavorites'; // 存储key
  const AUTO_MIGRATE_THRESHOLD = 0.8; // 超过sync空间80%时自动迁移到local

  // 存储管理器对象
  const TransorStorageManager = {
    // 加载收藏数据
    async loadFavorites() {
      console.log('加载收藏数据...');
      
      try {
        // 首先尝试从local存储获取数据
        const localData = await this._getLocalData(FAVORITES_KEY);
        if (localData && Array.isArray(localData) && localData.length > 0) {
          console.log(`从local存储加载了 ${localData.length} 条收藏`);
          return localData;
        }
        
        // 如果local没有数据，从sync获取
        const syncData = await this._getSyncData(FAVORITES_KEY);
        if (syncData && Array.isArray(syncData)) {
          console.log(`从sync存储加载了 ${syncData.length} 条收藏`);
          return syncData;
        }
        
        // 两个存储都没有数据
        console.log('没有找到收藏数据');
        return [];
      } catch (error) {
        console.error('加载收藏数据出错:', error);
        throw error;
      }
    },
    
    // 保存收藏数据
    async saveFavorites(favorites) {
      if (!Array.isArray(favorites)) {
        return { success: false, error: '无效的收藏数据' };
      }
      
      console.log(`准备保存 ${favorites.length} 条收藏数据`);
      
      try {
        // 获取当前存储状态
        const status = await this.getStorageStatus();
        
        // 检查当前数据大小
        const dataSize = this._getDataSize(favorites);
        console.log(`数据大小: ${dataSize} 字节`);
        
        // 根据数据大小决定使用哪个存储
        let storageType = 'sync';
        
        // 如果数据已经超过sync存储限制的80%，使用local存储
        if (dataSize > SYNC_QUOTA_BYTES * AUTO_MIGRATE_THRESHOLD) {
          storageType = 'local';
          console.log(`数据大小超过sync阈值(${Math.round(AUTO_MIGRATE_THRESHOLD*100)}%)，使用local存储`);
        }
        
        // 如果sync存储接近配额限制，自动迁移到local
        if (storageType === 'sync' && status.syncQuota.percentage > AUTO_MIGRATE_THRESHOLD * 100) {
          storageType = 'local';
          console.log(`Sync存储使用率(${status.syncQuota.percentage}%)超过阈值，自动迁移到local存储`);
        }
        
        // 实际保存数据
        if (storageType === 'local') {
          await this._setLocalData(FAVORITES_KEY, favorites);
          // 清理sync存储中的数据以释放空间
          await this._clearSyncData(FAVORITES_KEY);
          console.log('数据已保存到local存储');
        } else {
          // 检查是否能够保存到sync
          if (dataSize > SYNC_QUOTA_BYTES) {
            // 数据太大，无法保存到sync
            console.warn(`数据大小(${dataSize}字节)超过sync限制(${SYNC_QUOTA_BYTES}字节)，强制使用local存储`);
            await this._setLocalData(FAVORITES_KEY, favorites);
            await this._clearSyncData(FAVORITES_KEY);
            storageType = 'local';
          } else {
            // 保存到sync
            await this._setSyncData(FAVORITES_KEY, favorites);
            console.log('数据已保存到sync存储');
          }
        }
        
        return { 
          success: true, 
          storageType,
          dataSize,
          totalCount: favorites.length
        };
      } catch (error) {
        console.error('保存收藏数据出错:', error);
        
        // 检查是否是配额错误
        const isQuotaError = error.message && (
          error.message.includes('QUOTA_BYTES') || 
          error.message.includes('quota') ||
          error.message.includes('空间不足')
        );
        
        if (isQuotaError) {
          console.log('检测到配额错误，尝试自动迁移到本地存储');
          try {
            // 如果是配额错误，尝试保存到local
            await this._setLocalData(FAVORITES_KEY, favorites);
            await this._clearSyncData(FAVORITES_KEY);
            return { 
              success: true, 
              storageType: 'local',
              dataSize: this._getDataSize(favorites),
              totalCount: favorites.length,
              wasQuotaError: true
            };
          } catch (localError) {
            console.error('迁移到本地存储失败:', localError);
            return { 
              success: false, 
              error: localError.message,
              isQuotaError: true
            };
          }
        }
        
        return { success: false, error: error.message };
      }
    },
    
    // 添加单个收藏项
    async addFavorite(favorite) {
      if (!favorite || !favorite.original) {
        return { success: false, reason: 'invalid_data', error: '无效的收藏数据' };
      }
      
      try {
        // 加载当前收藏
        const favorites = await this.loadFavorites();
        
        // 检查是否已存在相同内容
        const exists = favorites.some(f => 
          f.original === favorite.original && f.translation === favorite.translation
        );
        
        if (exists) {
          return { success: false, reason: 'already_exists', error: '该内容已收藏' };
        }
        
        // 添加到收藏列表
        favorites.push(favorite);
        
        // 保存
        const result = await this.saveFavorites(favorites);
        
        return {
          success: result.success,
          totalCount: favorites.length,
          storageType: result.storageType,
          isQuotaError: result.isQuotaError,
          error: result.error
        };
      } catch (error) {
        console.error('添加收藏出错:', error);
        return { success: false, error: error.message };
      }
    },
    
    // 删除单个收藏项
    async deleteFavorite(id) {
      if (!id) {
        return { success: false, error: '无效的收藏ID' };
      }
      
      try {
        // 加载当前收藏
        let favorites = await this.loadFavorites();
        
        // 删除指定ID的收藏
        const originalCount = favorites.length;
        favorites = favorites.filter(f => f.timestamp != id);
        
        // 如果没有变化，说明未找到要删除的收藏
        if (favorites.length === originalCount) {
          return { success: false, error: '未找到指定收藏' };
        }
        
        // 保存
        const result = await this.saveFavorites(favorites);
        
        return {
          success: result.success,
          totalCount: favorites.length,
          storageType: result.storageType,
          deletedCount: originalCount - favorites.length,
          error: result.error
        };
      } catch (error) {
        console.error('删除收藏出错:', error);
        return { success: false, error: error.message };
      }
    },
    
    // 清理旧收藏数据，保留最新的N条
    async cleanupOldFavorites(keepCount = 50) {
      if (keepCount < 1) {
        return { success: false, error: '保留数量必须大于0' };
      }
      
      try {
        // 加载当前收藏
        const favorites = await this.loadFavorites();
        
        // 如果收藏总数小于等于要保留的数量，不需要清理
        if (favorites.length <= keepCount) {
          return { success: true, cleaned: 0, totalCount: favorites.length };
        }
        
        // 按时间戳排序（新到旧）
        favorites.sort((a, b) => b.timestamp - a.timestamp);
        
        // 只保留最新的keepCount条
        const newFavorites = favorites.slice(0, keepCount);
        const cleanedCount = favorites.length - newFavorites.length;
        
        // 保存
        const result = await this.saveFavorites(newFavorites);
        
        return {
          success: result.success,
          cleaned: cleanedCount,
          totalCount: newFavorites.length,
          storageType: result.storageType,
          error: result.error
        };
      } catch (error) {
        console.error('清理旧收藏出错:', error);
        return { success: false, error: error.message };
      }
    },
    
    // 获取存储状态信息
    async getStorageStatus() {
      try {
        // 获取当前收藏数据
        const favorites = await this.loadFavorites();
        const dataSize = this._getDataSize(favorites);
        
        // 获取sync存储使用情况
        const syncUsage = await this._getStorageUsage('sync');
        
        // 获取local存储使用情况
        const localUsage = await this._getStorageUsage('local');
        
        // 计算sync存储配额百分比
        const syncPercentage = (syncUsage / SYNC_QUOTA_BYTES * 100).toFixed(2);
        
        // 计算local存储配额百分比
        const localPercentage = (localUsage / LOCAL_QUOTA_BYTES * 100).toFixed(2);
        
        // 推荐的存储类型
        let recommendedStorage = 'sync';
        if (dataSize > SYNC_QUOTA_BYTES * AUTO_MIGRATE_THRESHOLD || 
            syncPercentage > AUTO_MIGRATE_THRESHOLD * 100) {
          recommendedStorage = 'local';
        }
        
        return {
          totalFavorites: favorites.length,
          dataSize,
          syncQuota: {
            size: syncUsage,
            limit: SYNC_QUOTA_BYTES,
            percentage: syncPercentage
          },
          localQuota: {
            size: localUsage,
            limit: LOCAL_QUOTA_BYTES,
            percentage: localPercentage
          },
          recommendedStorage
        };
      } catch (error) {
        console.error('获取存储状态出错:', error);
        throw error;
      }
    },
    
    // 获取指定存储的使用情况
    async _getStorageUsage(storageType) {
      return new Promise((resolve) => {
        const storage = chrome.storage[storageType];
        
        if (!storage) {
          resolve(0);
          return;
        }
        
        storage.getBytesInUse(null, (bytesInUse) => {
          if (chrome.runtime.lastError) {
            console.warn(`获取${storageType}存储使用情况出错:`, chrome.runtime.lastError);
            resolve(0);
          } else {
            resolve(bytesInUse);
          }
        });
      });
    },
    
    // 从sync存储获取数据
    async _getSyncData(key) {
      return new Promise((resolve) => {
        chrome.storage.sync.get(key, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('从sync获取数据出错:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result[key]);
          }
        });
      });
    },
    
    // 从local存储获取数据
    async _getLocalData(key) {
      return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('从local获取数据出错:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result[key]);
          }
        });
      });
    },
    
    // 保存数据到sync存储
    async _setSyncData(key, data) {
      return new Promise((resolve, reject) => {
        const obj = {};
        obj[key] = data;
        
        chrome.storage.sync.set(obj, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`保存到sync出错: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      });
    },
    
    // 保存数据到local存储
    async _setLocalData(key, data) {
      return new Promise((resolve, reject) => {
        const obj = {};
        obj[key] = data;
        
        chrome.storage.local.set(obj, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`保存到local出错: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      });
    },
    
    // 清除sync存储中的数据
    async _clearSyncData(key) {
      return new Promise((resolve) => {
        chrome.storage.sync.remove(key, () => {
          if (chrome.runtime.lastError) {
            console.warn('清除sync数据出错:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    },
    
    // 获取数据大小（字节）
    _getDataSize(data) {
      try {
        const jsonString = JSON.stringify(data);
        // 使用TextEncoder可以准确计算UTF-8字符串的字节大小
        return new TextEncoder().encode(jsonString).length;
      } catch (error) {
        console.warn('计算数据大小出错:', error);
        // 降级方案，粗略估计
        return JSON.stringify(data).length * 2;
      }
    }
  };

  // 暴露给全局使用
  window.TransorStorageManager = TransorStorageManager;
  console.log('存储管理器初始化完成');
})(); 