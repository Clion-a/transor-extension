# Transor扩展 - 前端接口文档

## 基本信息

- 基础URL: `https://api.transor.ai/`
- 测试基础URL: `http://api-test.transor.ai`
- 请求格式: GET or POST
- 响应格式: JSON
- 认证方式: Token
- Language: Header
**通用数据返回格式**
  
| 参数名     | 类型   | 必填 | 描述     |
|------------|--------|------|----------|
| code      | Int | 是   | 1表示成功，-1表示失败 |
| data   | String | 是   | 一般是数组或者字符串 |
| info   | String | 是   | 错误信息，有时候成功的时候没有数据返回，这个会根据用户的语言进行切换 |

## 认证相关接口

### 1. 用户登录 【已确定】

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
| data.token       | String | 访问令牌,这个是全局的，所有的都用这个token                 |
| data.SESSID       | String | 访问令牌,这个先沿用以前的字段 SESSID                 |
| data.expires_in   | Number | 令牌有效期(秒)，现在这个是个假数据           |
| info   | String | 错误提示信息          |

**响应示例**:
```json
{
  "code": 1,
  "info": "Login Successfully.",
  "data": {
     "SESSID": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
     "expires_in": 86400,
  }
}
```

**错误码**:
暂时没有这个

| 错误码 | 描述                   |
|--------|------------------------|
| -1    | 所有的错误都返回-1，错误信息在info里         |

### 2. 谷歌登录 【URL地址是对的，这个等上线前接入】

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
| code     | Int| 1 -1           |
| data.SESSID       | String | 访问令牌                 |
| data.token       | String | 访问令牌                 |
| data.expires_in   | Number | 令牌有效期(秒)           |

**响应示例**:
```json
{
  "success": true,
  "user": {
    "SESSID": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
  }
  
}
```

**错误码**:

| 错误码 | 描述                   |
|--------|------------------------|
| -1   | 无效的谷歌令牌         |



### 4. 用户注册 [暂时还没有】

**接口描述**: 新用户注册账号

**请求URL**: `/pubapi1/email_regist`

**请求方法**: POST

**请求参数**:

| 参数名     | 类型   | 必填 | 描述     |
|------------|--------|------|----------|
| email      | String | 是   | 用户邮箱 |
| psw   | String | 是   | 用户密码 |

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
| -1    | 请求参数不完整或无效   |



## 翻译相关接口

### 1. 文本翻译 【大概能用】

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
| -1    | 目前所有错误code都是-1   |

## 用户配置接口 【已调整】

### 1. 获取用户Chrome配置 【已确定】

**接口描述**: 获取用户的翻译配置

**请求URL**: `/priapi1/get_chrome_settings`

**请求方法**: GET

**请求头**:
- Authorization: Bearer {token}

**响应参数**:

| 参数名               | 类型     | 描述                     |
|----------------------|----------|--------------------------|
| code              | Boolean  | 请求是否成功             |
| data             | Object   | 用户配置对象             |

|你传的啥就是啥|||
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
  "code": 1,
  "data": {
    //存啥放出来就是啥
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

### 2. 更新用户配置【已确定】

**接口描述**: 更新用户的翻译配置 

**请求URL**: `/priapi1/update_chrome_settings`

**请求方法**: post

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名          | 类型    | 必填 | 描述                     |
|-----------------|---------|------|--------------------------|
| settings  | String  | 否   | 传一个json上来          |

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
| code         | Boolean | 请求是否成功       1成功， -1 失败       |
| data         | String  | 操作结果描述     空        |
| info        | Object  | 错误提示     |

**响应示例**:
```json
{
  "code": 1,
  "info": "成功",
  "data":''
}
```

## 用户账户接口 [已确定】

### 1. 获取用户信息

**接口描述**: 获取当前用户的详细信息

**请求URL**: `/priapi1/my_info`

**请求方法**: GET

**请求头**:
- Authorization: Bearer {token}

**响应参数**:

| 参数名             | 类型    | 描述                     |
|--------------------|---------|--------------------------|
| code            | int | 请求是否成功  1 -1            |
| data            | Array  | 用户资料对象             |
| data.id         | String  | 用户昵称，应该没有       |
| data.name        | String  | 用户ID                   |
| data.email       | String  | 用户邮箱                 |
| data.status      | Int  | 用户状态，1正常，-1被锁定                 |
| data.add_time     | Int  | Timestamp 用户加入时间            |
| data.plan     | String  | 用户套餐，默认free, 还有pro,max               |
| data.TOKENS     | String  | 用户的TOKENS剩余量               |
| data.plan_endtime     | Int| Timestamp 计划套餐结束时间              |


**响应示例**:
```json
{
	"code": 1,
	"data": {
		"id": "8",
		"email": "test@gmail.com",
		"status": "0",
		"name": "",
		"plan": "free",
		"add_time": 1745298993,
		"TOKENS": "0.00000000",
		"plan_endtime": "2025-06-07 20:39:45"
	},
	"info": ""
}
```

## 订阅与支付接口

### 1. 获取可用套餐

**接口描述**: 获取所有可订阅的套餐信息

**请求URL**: `/pubapi1/get_plan_config`
http://api-test.transor.ai/pubapi1/get_plan_config

**请求方法**: GET

**请求头**:
- Authorization: Bearer {token}

**响应参数**:

| 参数名     | 类型    | 描述                 |
|------------|---------|----------------------|
| code    | Int | 请求是否成功         |
| data      | Array   | 套餐信息数组         |
| info      | String   | 错误信息        |

这里的多国语言还没想好怎么处理 !!!!

**响应示例**:
```json
{
	"code": 1,
	"data": [{
		"id": "1",
		"type": "free", // free, pro, max
		"token_monthly": "0.0000", //每月赠送token量
		"img_monthly": "0", //每月可以翻译的图片数量
		"doc_monthly": "0", //每月可以翻译的文档的页数
		"collections_amount": "0", //收藏上限
		"usd_price_monthly": "0.0000", //按月支付每月USD价格
		"usd_price_monthly_original": "0.0000", //每月USD原价
		"usd_price_yearly": "0.0000", //按年支付每年价格
		"usd_price_yearly_original": "0.0000", //按年支付原价多少
		"stripe_monthly": "", //Stripe 按月支付的链接
		"stripe_yearly": "", //Stripe 按年支付的链接
		"ctime": "2025-04-09 13:53:55",
		"uptime": "2025-04-08 19:21:09",
		"status": "1"
	}, {
		"id": "2",
		"type": "pro",
		"token_monthly": "1000000.0000",
		"img_monthly": "100",
		"doc_monthly": "500",
		"collections_amount": "1000",
		"usd_price_monthly": "3.0000",
		"usd_price_monthly_original": "5.0000",
		"usd_price_yearly": "30.0000",
		"usd_price_yearly_original": "60.0000",
		"stripe_monthly": "https:\/\/buy.stripe.com\/cNifZi2FY6uT21xfpa1kA00",
		"stripe_yearly": "https:\/\/buy.stripe.com\/4gMaEY2FY9H521x90M1kA03",
		"ctime": "2025-04-09 13:54:33",
		"uptime": "2025-04-08 19:25:09",
		"status": "1"
	}, {
		"id": "3",
		"type": "max",
		"token_monthly": "10000000.0000",
		"img_monthly": "1000",
		"doc_monthly": "5000",
		"collections_amount": "10000",
		"usd_price_monthly": "10.0000",
		"usd_price_monthly_original": "12.0000",
		"usd_price_yearly": "100.0000",
		"usd_price_yearly_original": "144.0000",
		"stripe_monthly": "https:\/\/buy.stripe.com\/6oU14ofsK8D1eOjel61kA01",
		"stripe_yearly": "https:\/\/buy.stripe.com\/bJedRafsKaL935B7WI1kA02",
		"ctime": "2025-04-09 13:54:39",
		"uptime": "2025-04-08 19:25:09",
		"status": "1"
	}],
	"info": ""
}

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
| code     | Boolean | 1 删除成功 -1 删除失败                |
| data.id | Int  | 数组 返回收藏id               |
| info     | String  | info                       |

**响应示例**:
```json
{
	"code": -1,
	"data": {
		"id": 34
	},
	"info": "删除失败"
}
```

### 2. 收藏单词 【已确定】

**接口描述**: 收藏单词

**请求URL**: `/priapi1/collect_my_words`

**请求方法**: POST

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| source_text   | String | 是   | 源词                    |
| source_lang | String | 是 |源语言 zh-CN,zh-TW, en |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| code     | Boolean | 1 or -1                 |
| data.id | String or Int  | 收藏之后的id               |
| info     | String  | 成功 失败                    |

**响应示例**:
```json
{
	"code": 1,
	"data": {
		"id": "43"
	},
	"info": "Collection success"
}
```

### 2. 删除收藏单词 【 已确定】

**接口描述**: 删除收藏收藏单词

**请求URL**: `/priapi1/del_my_words`

**请求方法**: POST

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| id   | Int | 是   | 收藏的id                    |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| code     | Boolean | 1 成功 or -1失败                 |
| data.id | String or Int  | 收藏之后的id               |
| info     | String  | 成功 失败                    |

**响应示例**:
```json
{
	"code": -1,
	"data": {
		"id": 34
	},
	"info": "删除失败"
}
```

### 2. 获取我收藏的单词 【已确定】

**接口描述**: 订阅指定套餐

**请求URL**: `/priapi1/get_my_words`

**请求方法**: GET

**请求头**:
- Authorization:  {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| page_size   | Int | 否   | 每页多少，默认100，不穿就是取所有                    |
| page   | Int | 否   | 当前多少页， 默认1                    |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| code     | Boolean | 请求是否成功                 |
| data.id | Int  | 收藏ID                 |
| data.user_id | Int  | 用户ID                  |
| data.source_text | String  | 收藏的文字                |
| data.source_md5 | String  | 排重MD5，这个是md5(user_id-word)来计算的                  |
| data.source_lang | String  | 源语言 zh-CN, zh-TW, en                  |
| data.trans_times | Int  | 查询次数，每次查询之后，都会增加一次          |
| data.ctime | Int  | 创建时间  Timestamp，需要根据前端时间进行转换               |
| data.uptime | Int  | 更新时间，Timestamp                 |
| data.status | Int  | 现在都是1，如果删除，就直接删除数据了                  |
| info     | String  |                        |

**响应示例**:
```json
{
	"code": 1,
	"data": [{
		"id": "23",
		"user_id": "8",
		"source_text": "nice",
		"source_md5": "461946c73121692b36e8fa2824d8cabd",
		"source_lang": "en",
		"target_lang": "",
		"trans_times": "8",
		"ctime": 1749289339,
		"uptime": 1749290010,
		"status": "0"
	}, {
		"id": "24",
		"user_id": "8",
		"source_text": "mark",
		"source_md5": "f0692dc2b5b2ebe529078f86c7b92482",
		"source_lang": "en",
		"target_lang": "zh-CN",
		"trans_times": "5",
		"ctime": 1749290013,
		"uptime": 1749290148,
		"status": "1"
	}],
	"info": ""
}
```

### 2. 收藏句子 【已确定】

**接口描述**: 收藏单词

**请求URL**: `/priapi1/collect_my_sentence`

**请求方法**: POST

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| source_text   | String | 是   | 源词                    |
| source_lang | String | 是 |源语言 zh-CN,zh-TW, en |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| code     | Boolean | 1 or -1                 |
| data.id | String or Int  | 收藏之后的id               |
| info     | String  | 成功 失败                    |

**响应示例**:
```json
{
	"code": 1,
	"data": {
		"id": "43"
	},
	"info": "Collection success"
}
```

### 2. 删除收藏句子【已确定】

**接口描述**: 删除收藏收藏单词

**请求URL**: `/priapi1/del_my_sentence`

**请求方法**: POST

**请求头**:
- Authorization: Bearer {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| id   | Int | 是   | 收藏的id                    |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| code     | Boolean | 1 成功 or -1失败                 |
| data.id | String or Int  | 收藏之后的id               |
| info     | String  | 成功 失败                    |

**响应示例**:
```json
{
	"code": -1,
	"data": {
		"id": 34
	},
	"info": "删除失败"
}
```

### 2. 获取我收藏的句子【已确定】

**接口描述**: 订阅指定套餐

**请求URL**: `/priapi1/get_my_sentence`

**请求方法**: GET

**请求头**:
- Authorization:  {token}

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                        |
|----------|--------|------|----------------------------|
| page_size   | Int | 否   | 每页多少，默认100，不穿就是取所有                    |
| page   | Int | 否   | 当前多少页， 默认1                    |

**响应参数**:

| 参数名      | 类型    | 描述                         |
|-------------|---------|------------------------------|
| code     | Boolean | 请求是否成功                 |
| data.id | Int  | 收藏ID                 |
| data.user_id | Int  | 用户ID                  |
| data.source_text | String  | 收藏的文字                |
| data.source_md5 | String  | 排重MD5，这个是md5(user_id-word)来计算的                  |
| data.source_lang | String  | 源语言 zh-CN, zh-TW, en                  |
| data.trans_times | Int  | 查询次数，每次查询之后，都会增加一次          |
| data.ctime | Int  | 创建时间  Timestamp，需要根据前端时间进行转换               |
| data.uptime | Int  | 更新时间，Timestamp                 |
| data.status | Int  | 现在都是1，如果删除，就直接删除数据了                  |
| info     | String  |                        |

**响应示例**:
```json
{
	"code": 1,
	"data": [{
		"id": "23",
		"user_id": "8",
		"source_text": "nice",
		"source_md5": "461946c73121692b36e8fa2824d8cabd",
		"source_lang": "en",
		"target_lang": "",
		"trans_times": "8",
		"ctime": 1749289339,
		"uptime": 1749290010,
		"status": "0"
	}, {
		"id": "24",
		"user_id": "8",
		"source_text": "mark",
		"source_md5": "f0692dc2b5b2ebe529078f86c7b92482",
		"source_lang": "en",
		"target_lang": "zh-CN",
		"trans_times": "5",
		"ctime": 1749290013,
		"uptime": 1749290148,
		"status": "1"
	}],
	"info": ""
}
```

