const https = require('https');

// ===== 配置区 =====
const APP_KEY = 'dingtxg3yye3ed4ae1fq';
const APP_SECRET = '3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf';
const OPERATOR_ID = '15002087';
const BASE_ID = 'NDoBb60VLQvgG6GXSBjXR0zDJlemrZQ3';
const NEW_STORE_SHEET_ID = 'Imi6REl';
const RENOVATION_SHEET_ID = 'm5nc5By';
const TEST_MONTH = '2026-05'; // 测试月份
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
  console.log('🔄 获取 accessToken...');
  const result = await httpPost('/v1.0/oauth2/accessToken', { appKey: APP_KEY, appSecret: APP_SECRET });
  if (result.code) throw new Error(`Token 失败: ${JSON.stringify(result)}`);
  console.log('✅ Token 获取成功\n');
  return result.accessToken;
}

async function testPath(token, url) {
  console.log(`📡 测试请求 URL: ${url}`);
  try {
    const res = await httpGet(url, token);
    console.log(`   👉 返回结果:`, JSON.stringify(res).substring(0, 300));
    return res;
  } catch (err) {
    console.log(`   ❌ 发生异常: ${err.message}`);
    return null;
  }
}

(async () => {
  console.log('=== 钉钉 AI 表格不同 API 路径测试 ===\n');
  try {
    const token = await getAccessToken();

    const candidateUrls = [
      // 候选路径 1: server.ts 中最常用的 notable/databases/.../tables/.../records
      `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
      // 候选路径 2: user 脚本中的 aitable/bases/.../sheets/.../records 带 operatorId
      `https://api.dingtalk.com/v1.0/aitable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records?operatorId=${OPERATOR_ID}&maxResults=10`,
      // 候选路径 3: user 脚本中的 aitable/bases/.../sheets/.../records 不带 operatorId
      `https://api.dingtalk.com/v1.0/aitable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
      // 候选路径 4: notable/databases/.../sheets/.../records
      `https://api.dingtalk.com/v1.0/notable/databases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records?maxResults=10`,
      // 候选路径 5: notables/databases/.../tables/.../records
      `https://api.dingtalk.com/v1.0/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records?maxResults=10`
    ];

    for (let i = 0; i < candidateUrls.length; i++) {
      console.log(`\n--- 方案 ${i + 1} ---`);
      await testPath(token, candidateUrls[i]);
    }

  } catch (err) {
    console.error('❌ 测试总体失败:', err.message);
  }
})();
