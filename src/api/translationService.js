/**
 * 翻译服务API封装
 */

import axios from 'axios';

/**
 * 请求翻译 - 批量文本
 * @param {Array<string>} texts - 待翻译的文本数组
 * @param {string} targetLang - 目标语言
 * @param {string} sourceLang - 源语言
 * @param {string} engine - 翻译引擎
 * @returns {Promise<Array<string>>} - 翻译结果数组
 */
export async function translateTexts(texts, targetLang, sourceLang = 'auto', engine = 'google') {
  if (!texts || texts.length === 0) {
    return [];
  }

  // 分批处理，避免请求过大
  const batchSize = 20;
  const results = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await _translateBatch(batch, targetLang, sourceLang, engine);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 翻译单个文本
 * @param {string} text - 待翻译的文本
 * @param {string} targetLang - 目标语言
 * @param {string} sourceLang - 源语言
 * @param {string} engine - 翻译引擎
 * @returns {Promise<string>} - 翻译结果
 */
export async function translateText(text, targetLang, sourceLang = 'auto', engine = 'google') {
  if (!text || text.trim() === '') {
    return '';
  }
  
  const result = await _translateBatch([text], targetLang, sourceLang, engine);
  return result[0] || '';
}

/**
 * 内部方法：批量翻译
 * @param {Array<string>} texts - 待翻译的文本数组
 * @param {string} targetLang - 目标语言
 * @param {string} sourceLang - 源语言 
 * @param {string} engine - 翻译引擎
 * @returns {Promise<Array<string>>} - 翻译结果数组
 */
async function _translateBatch(texts, targetLang, sourceLang, engine) {
  switch (engine) {
    case 'google':
      return await _googleTranslate(texts, targetLang, sourceLang);
    case 'deepl':
      return await _deeplTranslate(texts, targetLang, sourceLang);
    case 'baidu':
      return await _baiduTranslate(texts, targetLang, sourceLang);
    default:
      return await _googleTranslate(texts, targetLang, sourceLang);
  }
}

/**
 * Google翻译API
 */
async function _googleTranslate(texts, targetLang, sourceLang) {
  try {
    // 注意：这里使用的是非官方API
    const url = 'https://translate.googleapis.com/translate_a/t';
    
    const results = [];
    
    for (const text of texts) {
      const response = await axios.get(url, {
        params: {
          client: 'gtx',
          sl: sourceLang,
          tl: targetLang,
          dt: 't',
          q: text
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        results.push(response.data[0]);
      } else {
        results.push(text); // 如果翻译失败，返回原文
      }
    }
    
    return results;
  } catch (error) {
    console.error('Google翻译出错:', error);
    return texts; // 翻译失败时返回原文
  }
}

/**
 * DeepL翻译API
 */
async function _deeplTranslate(texts, targetLang, sourceLang) {
  // 注意：DeepL需要API密钥，这里仅作为演示
  // 实际使用时需要替换为你自己的API密钥或找到替代方案
  try {
    // 这里仅作示例
    console.warn('DeepL翻译需要API密钥，当前使用模拟数据');
    return texts.map(text => `[DeepL翻译] ${text}`);
  } catch (error) {
    console.error('DeepL翻译出错:', error);
    return texts;
  }
}

/**
 * 百度翻译API
 */
async function _baiduTranslate(texts, targetLang, sourceLang) {
  // 注意：百度翻译需要API密钥，这里仅作为演示
  try {
    // 这里仅作示例
    console.warn('百度翻译需要API密钥，当前使用模拟数据');
    return texts.map(text => `[百度翻译] ${text}`);
  } catch (error) {
    console.error('百度翻译出错:', error);
    return texts;
  }
}

/**
 * 检测语言
 * @param {string} text - 待检测的文本
 * @returns {Promise<string>} - 检测到的语言代码
 */
export async function detectLanguage(text) {
  try {
    // 使用Google语言检测API
    const url = 'https://translate.googleapis.com/translate_a/single';
    const response = await axios.get(url, {
      params: {
        client: 'gtx',
        sl: 'auto',
        tl: 'en', // 目标语言不重要
        dt: 't',
        q: text
      }
    });
    
    if (response.data && response.data[2]) {
      return response.data[2];
    }
    
    return 'en'; // 默认返回英语
  } catch (error) {
    console.error('语言检测出错:', error);
    return 'en'; // 默认返回英语
  }
} 