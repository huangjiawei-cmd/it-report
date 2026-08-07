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

function httpGet(url, token, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 
        'x-acs-dingtalk-access-token': token,
        ...extraHeaders
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getAccessToken() {
  const result = await httpPost('/v1.0/oauth2/accessToken', { appKey: APP_KEY, appSecret: APP_SECRET });
  return result.accessToken;
}

async function runTest() {
  console.log('=== 运行详细 API 版本 / 头部测试 ===\n');
  try {
    const token = await getAccessToken();

    const testCases = [
      // 1. 测试不同 URL 版本前缀
      {
        name: 'v2.0 版本前缀',
        url: `https://api.dingtalk.com/v2.0/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: {}
      },
      {
        name: 'v1 版本前缀',
        url: `https://api.dingtalk.com/v1/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: {}
      },
      // 2. 测试 aitable v2.0
      {
        name: 'aitable v2.0 版本前缀',
        url: `https://api.dingtalk.com/v2.0/aitable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: {}
      },
      // 3. 携带不同的 x-acs-version 头部
      {
        name: 'notables + x-acs-version: 2021-01-01',
        url: `https://api.dingtalk.com/v1.0/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: { 'x-acs-version': '2021-01-01' }
      },
      {
        name: 'aitable + x-acs-version: 2021-01-01',
        url: `https://api.dingtalk.com/v1.0/aitable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: { 'x-acs-version': '2021-01-01' }
      },
      {
        name: 'notables + x-acs-version: 1.0',
        url: `https://api.dingtalk.com/v1.0/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: { 'x-acs-version': '1.0' }
      },
      // 4. 尝试 aitable/databases (之前没试过这个组合)
      {
        name: 'aitable/databases v1.0',
        url: `https://api.dingtalk.com/v1.0/aitable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: {}
      },
      // 5. 尝试 yida/notables (宜搭多维表)
      {
        name: 'yida/notables v1.0',
        url: `https://api.dingtalk.com/v1.0/yida/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
        headers: {}
      }
    ];

    for (const tc of testCases) {
      console.log(`📡 测试: ${tc.name}`);
      console.log(`   URL: ${tc.url}`);
      if (Object.keys(tc.headers).length > 0) {
        console.log(`   Headers:`, JSON.stringify(tc.headers));
      }
      try {
        const res = await httpGet(tc.url, token, tc.headers);
        console.log(`   👉 响应:`, JSON.stringify(res).substring(0, 300));
      } catch (err) {
        console.log(`   ❌ 异常: ${err.message}`);
      }
      console.log('');
    }

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
