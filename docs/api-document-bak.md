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

**错误码**:

| 错误码 | 描述                   |
|--------|------------------------|
| 400    | 无效的Apple令牌        |
| 403    | 账号已被禁用           |
| 500    | 服务器验证Apple令牌失败 |
