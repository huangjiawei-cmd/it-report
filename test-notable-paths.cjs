const https = require('https');

// ===== 配置区 =====
const APP_KEY = 'dingtxg3yye3ed4ae1fq';
const APP_SECRET = '3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf';
const BASE_ID = 'NDoBb60VLQvgG6GXSBjXR0zDJlemrZQ3';
const NEW_STORE_SHEET_ID = 'Imi6REl';
// ==================

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'api.dingtalk.com',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function makeRequest(url, method, token, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: { 
        'x-acs-dingtalk-access-token': token,
        'Content-Type': 'application/json'
      }
    };
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function getAccessToken() {
  const result = await httpPost('/v1.0/oauth2/accessToken', { appKey: APP_KEY, appSecret: APP_SECRET });
  return result.accessToken;
}

async function runTest() {
  console.log('=== 开始 notable 接口路径网格搜索 ===\n');
  try {
    const token = await getAccessToken();

    // 构建各种路径和方法的组合
    const candidates = [
      // 1. bases / sheets 结构
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/bases` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records` },
      { method: 'POST', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records`, body: {} },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/fields` },

      // 2. databases / tables 结构
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/databases` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}` },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records` },
      { method: 'POST', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records`, body: {} },
      { method: 'GET', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/fields` },

      // 3. 其他可能的方法或结构
      { method: 'POST', url: `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records/query`, body: {} },
      { method: 'POST', url: `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records/query`, body: {} }
    ];

    for (const item of candidates) {
      const res = await makeRequest(item.url, item.method, token, item.body);
      const resStr = JSON.stringify(res);
      // 如果不是 Specified api is not found，说明路径和方法被 gateway 匹配上了！
      if (!resStr.includes('Specified api is not found')) {
        console.log(`🎯 [匹配成功路径] [${item.method}] ${item.url}`);
        console.log(`   👉 响应: ${resStr}\n`);
      } else {
        console.log(`❌ [未匹配] [${item.method}] ${item.url}`);
      }
    }

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
