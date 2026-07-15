const https = require('https');

// ===== 配置区 =====
const APP_KEY = 'dingtxg3yye3ed4ae1fq';
const APP_SECRET = '3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf';
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
  try {
    const token = await getAccessToken();

    const pathsToTest = [
      'https://api.dingtalk.com/v1.0/notable/databases/123',
      'https://api.dingtalk.com/v1.0/notables/databases/123',
      'https://api.dingtalk.com/v1.0/yida/notable/databases/123',
      'https://api.dingtalk.com/v1.0/yida/notables/databases/123',
      'https://api.dingtalk.com/v1.0/aitable/bases/123',
      'https://api.dingtalk.com/v1.0/contact/users/nonexistent123'
    ];

    console.log('=== 开始测试网关路径匹配响应 ===\n');

    for (const url of pathsToTest) {
      const res = await httpGet(url, token);
      console.log(`URL: ${url}`);
      console.log(`Response: ${JSON.stringify(res)}\n`);
    }

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
