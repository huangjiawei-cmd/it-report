const https = require('https');

// ===== 配置区 =====
const APP_KEY = 'dingtxg3yye3ed4ae1fq';
const APP_SECRET = '3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf';
const OPERATOR_ID = '15002087';
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

function httpGet(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'x-acs-dingtalk-access-token': token }
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
  console.log('=== 测试其他 /v1.0 API 以验证版本机制 ===\n');
  try {
    const token = await getAccessToken();
    console.log(`Token obtained: ${token.substring(0, 10)}...\n`);

    // 测试 1: 获取用户通讯录信息 (新版通讯录 v1.0 接口)
    const url1 = `https://api.dingtalk.com/v1.0/contact/users/${OPERATOR_ID}`;
    console.log(`📡 请求通讯录接口: ${url1}`);
    const res1 = await httpGet(url1, token);
    console.log(`   👉 响应:`, JSON.stringify(res1));

    // 测试 2: 获取多维表数据库信息 (新版 notable 接口 - GET)
    // 根据文档，获取多维表元数据的 URL 应当是：
    // https://api.dingtalk.com/v1.0/notables/databases/{databaseId}
    const url2 = `https://api.dingtalk.com/v1.0/notables/databases/NDoBb60VLQvgG6GXSBjXR0zDJlemrZQ3`;
    console.log(`\n📡 请求多维表元数据接口: ${url2}`);
    const res2 = await httpGet(url2, token);
    console.log(`   👉 响应:`, JSON.stringify(res2));

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
