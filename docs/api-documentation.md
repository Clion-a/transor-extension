# Transor扩展 - 前端接口文档

## 基本信息

- 基础URL: `https://api.transor.com/`
- 请求格式: JSON
- 响应格式: JSON
- 认证方式: Bearer Token
- Language: Header

## 认证相关接口

### 1. 用户登录

**接口描述**: 用户使用账号密码登录系统，获取访问令牌

**请求URL**: `/pubapi1/email_login`

**请求方法**: POST

测试的时候可以GET
http://api-test.transor.ai/pubapi1/email_login/?email=test1@gmail.com&psw=dadfsasdfasd

测试的时候，这个URL也是可以注册账号的，直接改email即可注册。

**请求参数**:

| 参数名     | 类型   | 必填 | 描述     |
|------------|--------|------|----------|
| email      | String | 是   | 用户邮箱 |
| psw   | String | 是   | 用户密码 |

**请求示例**:
```json
{
  "email": "user@example.com",
  "psw": "password123",
}
```

**响应参数**:

| 参数名      | 类型   | 描述                     |
|-------------|--------|--------------------------|
| code     | Boolean|  请求是否成功  1成功，-1失败            |
| data.SESSID       | String | 访问令牌,这个先沿用以前的字段 SESSID                 |
| expires_in   | Number | 令牌有效期(秒)，现在这个是个假数据           |

**响应示例**:
```json
{
  "code": 1,
  
  "data": {
    "SESSID": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
  }
}
```

**错误码**:
暂时没有这个

| 错误码 | 描述                   |
|--------|------------------------|
| 401    | 邮箱或密码错误         |
| 403    | 账号已被禁用           |
| 429    | 登录尝试次数过多，请稍后再试 |

### 2. 谷歌登录

**接口描述**: 使用谷歌账号登录系统

**请求URL**: `/pubapi1/google_login`

**请求方法**: POST

http://api-test.transor.ai/pubapi1/google_login
现在返回数据是假数据

**请求参数**:

| 参数名     | 类型   | 必填 | 描述     |
|------------|--------|------|----------|
| idToken    | String | 是   | 谷歌身份令牌 |

**请求示例**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFiZDY4NWY1...",
}
```

**响应参数**:

| 参数名      | 类型   | 描述                     |
|-------------|--------|--------------------------|
| success     | Boolean| 请求是否成功             |
| data.SESSID       | String | 访问令牌                 |
| data.expires_in   | Number | 令牌有效期(秒)           |

**响应示例**:
```json
{
  "success": true,
  "user": {
    "SESSID": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
  }
  
}
```

**错误码**:

| 错误码 | 描述                   |
|--------|------------------------|
| 400    | 无效的谷歌令牌         |
| 403    | 账号已被禁用           |
| 500    | 服务器验证谷歌令牌失败 |

### 3. Apple登录

**接口描述**: 使用Apple账号登录系统

**请求URL**: `/pubapi1/apple_login`

**请求方法**: POST

现在没有

**请求参数**:

| 参数名      | 类型   | 必填 | 描述     |
|-------------|--------|------|----------|
| idToken     | String | 是   | Apple身份令牌 |
| fullName    | Object | 否   | 用户全名（首次登录时需要） |
| fullName.firstName | String | 否   | 用户名 |
| fullName.lastName  | String | 否   | 用户姓 |

**请求示例**:
```json
{
  "idToken": "eyJraWQiOiJXNldjT0tCIiwiYWxnIjoiUlMyNTYifQ...",
  "fullName": {
    "firstName": "John",
    "lastName": "Doe"
  },
}
```

**响应参数**:

| 参数名      | 类型   | 描述                     |
|-------------|--------|--------------------------|
| success     | Boolean| 请求是否成功             |
| data.SESSID       | String | 访问令牌                 |
| data.expires_in   | Number | 令牌有效期(秒)           |

**响应示例**:
```json
{
  "code": 1,
  
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
}
```

**错误码**:

| 错误码 | 描述                   |
|--------|------------------------|
| 400    | 无效的Apple令牌        |
| 403    | 账号已被禁用           |
| 500    | 服务器验证Apple令牌失败 |

### 4. 用户注册

**接口描述**: 新用户注册账号

**请求URL**: `/auth/register`

**请求方法**: POST

**请求参数**:

| 参数名     | 类型   | 必填 | 描述     |
|------------|--------|------|----------|
| email      | String | 是   | 用户邮箱 |
| password   | String | 是   | 用户密码 |

**请求示例**:
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
}
```

**响应参数**:

| 参数名      | 类型   | 描述                     |
|-------------|--------|--------------------------|
| success     | Boolean| 请求是否成功             |
| message     | String | 操作结果描述             |
| userId      | String | 新创建的用户ID           |

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功，请验证您的邮箱",
  "userId": "usr_987654321"
}
```

**错误码**:

| 错误码 | 描述                   |
|--------|------------------------|
| 400    | 请求参数不完整或无效   |
| 409    | 邮箱已被注册           |
| 429    | 注册请求过于频繁，请稍后再试 |

### 5. 刷新令牌

**接口描述**: 使用刷新令牌获取新的访问令牌

**请求URL**: `/auth/refresh-token`

**请求方法**: POST

**请求参数**:

| 参数名       | 类型   | 必填 | 描述     |
|--------------|--------|------|----------|
| refreshToken | String | 是   | 刷新令牌 |

**请求示例**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应参数**:

| 参数名      | 类型   | 描述                     |
|-------------|--------|--------------------------|
| success     | Boolean| 请求是否成功             |
| token       | String | 新的访问令牌             |
| expiresIn   | Number | 令牌有效期(秒)           |

**响应示例**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**错误码**:

| 错误码 | 描述                   |
|--------|------------------------|
| 401    | 无效的刷新令牌         |
| 403    | 刷新令牌已过期         |


## 翻译相关接口

### 1. 文本翻译

**接口描述**: 翻译单条或多条文本

**请求URL**: `/translate/text`

**请求方法**: POST

**请求头**:
- Authorization: Bearer {token}

为了不必要的空格的问题，后端传输全部都用-连接各种翻译engine

| 翻译引擎          | 代码     | 备注 |
|-----------------|----------|------|
|谷歌翻译|Google||
|微软翻译|Microsoft||
|ChatGPT 4o|ChatGPT-4o||
|ChatGPT 4o mini| ChatGPT-4o-mini||
|DeepSeek V3|DeepSeek-V3||
|Gemini 2.0 flash|Gemini-2.0-flash||
|DeepL|DeepL||

**请求参数**:

| 参数名          | 类型     | 必填 | 描述                    |
|-----------------|----------|------|-------------------------|
| source_text     | Array/String| 是   | 待翻译的文本数组，如果只传一个字符串，返回值也会是一个数组        |
| source_lang     | String   | 否   | 源语言代码(默认"auto")  |
| target_lang     | String   | 是   | 目标语言代码,i18n,zh-CN,zh-HK,en,en-US |
| engine          | String   | 否   | 翻译引擎(/openai/deepseek)，参看上面的表，区分大小写和版本|

http://api-test.transor.ai/translate/text?source_text=[%22%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C%22,%22%E4%BD%A0%E5%A5%BD%E5%90%97%EF%BC%9F%22]&souce_lang=auto&target_lang=en&engine=DeepSeek-V3
测试的时候可以GET，线上POST
**请求示例**:
```json
{
  "source_text": ["Hello world", "How are you?"],
  "source_lang": "en",
  "target_lang": "zh-CN",
  "engine": "DeepSeek-V3"
}
```

**响应参数**:

| 参数名        | 类型    | 描述                     |
|---------------|---------|--------------------------|
| code       | Boolean | 请求是否成功 1成功，-1失败            |
| data.translations  | Array   | 翻译结果数组             |
| data.engine        | String  | 实际使用的翻译引擎 DeepSeek-V3      |
| usage         | Object  | 使用量统计               |
| usage.total_tokens   | Number  | 消耗的token数量               |

**响应示例**:
```json
{
  "code": 1,
  "translations": ["你好世界", "你好吗？"],
  "engine": "DeepSeek-V3",
  "usage": {
    "total_tokens": 30
  }
}
```

**错误码**:
这个暂时没提供

| 错误码 | 描述                   |
|--------|------------------------|
| 400    | 请求参数不完整或无效   |
| 401    | 未授权或令牌无效       |
| 402    | 已超出使用限制         |
| 429    | 请求频率过高           |

## 用户配置接口

### 1. 获取用户配置

**接口描述**: 获取用户的翻译配置

**请求URL**: `/user/settings`

**请求方法**: GET

**请求头**:
- Authorization: Bearer {token}

**响应参数**:

| 参数名               | 类型     | 描述                     |
|----------------------|----------|--------------------------|
| success              | Boolean  | 请求是否成功             |
| settings             | Object   | 用户配置对象             |
| settings.targetLanguage | String | 目标语言代码             |
| settings.sourceLanguage | String | 源语言代码               |
| settings.translationEngine | String | 首选翻译引擎          |
| settings.translationStyle | String | 翻译样式(inline/popup) |
| settings.excludedTags | Array   | 不翻译的HTML标签         |
| settings.excludedClasses | Array | 不翻译的CSS类           |
| settings.excludedUrls | Array   | 不翻译的网址规则         |
| settings.customCss   | String   | 自定义CSS                |

**响应示例**:
```json
{
  "success": true,
  "settings": {
    "targetLanguage": "zh-CN",
    "sourceLanguage": "auto",
    "translationEngine": "google",
    "translationStyle": "inline",
    "excludedTags": ["code", "pre", "script", "style"],
    "excludedClasses": ["no-translate"],
    "excludedUrls": [],
    "customCss": ""
  }
}
```

### 2. 更新用户配置

**接口描述**: 更新用户的翻译配置

**请求URL**: `/user/settings`

**请求方法**: post

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名          | 类型    | 必填 | 描述                     |
|-----------------|---------|------|--------------------------|
| targetLanguage  | String  | 否   | 目标语言代码             |
| sourceLanguage  | String  | 否   | 源语言代码               |
| translationEngine | String | 否  | 首选翻译引擎             |
| translationStyle | String | 否   | 翻译样式(inline/popup)   |
| excludedTags    | Array   | 否   | 不翻译的HTML标签         |
| excludedClasses | Array   | 否   | 不翻译的CSS类            |
| excludedUrls    | Array   | 否   | 不翻译的网址规则         |
| customCss       | String  | 否   | 自定义CSS                |

**请求示例**:
```json
{
  "targetLanguage": "ja",
  "translationEngine": "deepl"
}
```

**响应参数**:

| 参数名          | 类型    | 描述                     |
|-----------------|---------|--------------------------|
| success         | Boolean | 请求是否成功             |
| message         | String  | 操作结果描述             |
| settings        | Object  | 更新后的完整配置         |

**响应示例**:
```json
{
  "success": true,
  "message": "设置已更新",
  "settings": {
    "targetLanguage": "ja",
    "sourceLanguage": "auto",
    "translationEngine": "deepl",
    "translationStyle": "inline",
    "excludedTags": ["code", "pre", "script", "style"],
    "excludedClasses": ["no-translate"],
    "excludedUrls": [],
    "customCss": ""
  }
}
```

## 用户账户接口

### 1. 获取用户信息

**接口描述**: 获取当前用户的详细信息

**请求URL**: `/user/profile`

**请求方法**: GET

**请求头**:
- Authorization: Bearer {token}

**响应参数**:

| 参数名             | 类型    | 描述                     |
|--------------------|---------|--------------------------|
| success            | Boolean | 请求是否成功             |
| profile            | Object  | 用户资料对象             |
| profile.id         | String  | 用户ID                   |
| profile.name       | String  | 用户名称                 |
| profile.email      | String  | 用户邮箱                 |
| profile.avatar     | String  | 用户头像URL              |
| profile.plan       | String  | 用户套餐类型             |
| profile.usageStats | Object  | 使用统计信息             |
| profile.createdAt  | String  | 账号创建时间             |

**响应示例**:
```json
{
  "success": true,
  "profile": {
    "id": "usr_123456789",
    "name": "John Doe",
    "email": "user@example.com",
    "avatar": "https://api.transor.com/avatars/default.png",
    "plan": "free",
    "usageStats": {
      "charactersTranslated": 3547,
      "imagesProcessed": 5,
      "subtitlesTranslated": 245,
      "charactersLimit": 500000,
      "remainingCharacters": 496453
    },
    "createdAt": "2023-01-15T08:30:00Z"
  }
}
```

## 订阅与支付接口

### 1. 获取可用套餐

**接口描述**: 获取所有可订阅的套餐信息

**请求URL**: `/subscriptions/plans`

**请求方法**: GET

**请求头**:
- Authorization: Bearer {token}

**响应参数**:

| 参数名     | 类型    | 描述                 |
|------------|---------|----------------------|
| success    | Boolean | 请求是否成功         |
| plans      | Array   | 套餐信息数组         |

**响应示例**:
```json
{
  "success": true,
  "plans": [
    {
      "id": "plan_free",
      "name": "免费版",
      "description": "基础翻译功能",
      "price": 0,
      "currency": "CNY",
      "features": [
        "每月500,000字符翻译量",
        "基础OCR功能",
        "标准翻译引擎"
      ],
      "limits": {
        "charactersPerMonth": 500000,
        "imagesPerDay": 20,
        "engines": ["google", "baidu"]
      }
    },
    {
      "id": "plan_pro",
      "name": "专业版",
      "description": "高级翻译功能",
      "price": 19.99,
      "currency": "CNY",
      "interval": "month",
      "features": [
        "每月5,000,000字符翻译量",
        "高级OCR功能",
        "所有翻译引擎",
        "优先客户支持"
      ],
      "limits": {
        "charactersPerMonth": 5000000,
        "imagesPerDay": 200,
        "engines": ["google", "baidu", "deepl", "openai"]
      }
    }
  ]
}
```

### 2. 创建订阅

**接口描述**: 订阅指定套餐

**请求URL**: `/subscriptions/create`

**请求方法**: POST

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| planId   | String | 是   | 套餐ID                     |
| paymentMethod | String | 是 | 支付方式(alipay/wechat/creditcard) |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| success     | Boolean | 请求是否成功                 |
| redirectUrl | String  | 支付页面URL                  |
| orderId     | String  | 订单ID                       |

**响应示例**:
```json
{
  "success": true,
  "redirectUrl": "https://payment.transor.com/checkout?session=xyz123",
  "orderId": "ord_987654321"
}
```

## 错误码说明

| 错误码 | 描述                            |
|--------|--------------------------------|
| 400    | 请求参数错误或缺失              |
| 401    | 未授权访问，令牌无效或已过期    |
| 402    | 需要付款，免费额度已用完        |
| 403    | 禁止访问，无权执行该操作        |
| 404    | 请求的资源不存在                |
| 429    | 请求频率超限，请稍后再试        |
| 500    | 服务器内部错误                  |
| 503    | 服务暂时不可用，请稍后再试      |
