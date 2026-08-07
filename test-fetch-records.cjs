const https = require('https');

// ===== 配置区 =====
const APP_KEY = 'dingtxg3yye3ed4ae1fq';
const APP_SECRET = '3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf';
const OPERATOR_ID = '15002087';
const BASE_ID = 'NDoBb60VLQvgG6GXSBjXR0zDJlemrZQ3';
const NEW_STORE_SHEET_ID = 'Imi6REl';       // 2026新开门店表
const RENOVATION_SHEET_ID = 'm5nc5By';      // 2026旧改门店表
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
      headers: { 
        'x-acs-dingtalk-access-token': token,
        'Content-Type': 'application/json'
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
  console.log('=== 正在获取并解析多维表数据 ===\n');
  try {
    const token = await getAccessToken();
    console.log(`Access Token: ${token.substring(0, 10)}...`);

    // 1. 获取新开门店表
    const urlNew = `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records?operatorId=${OPERATOR_ID}&maxResults=100`;
    console.log(`📡 请求新开门店表: ${urlNew}`);
    const resNew = await httpGet(urlNew, token);
    console.log(`   👉 响应 (前1000字符):`, JSON.stringify(resNew).substring(0, 1000));

    // 2. 获取旧改门店表
    const urlRen = `https://api.dingtalk.com/v1.0/notable/bases/${BASE_ID}/sheets/${RENOVATION_SHEET_ID}/records?operatorId=${OPERATOR_ID}&maxResults=100`;
    console.log(`\n📡 请求旧改门店表: ${urlRen}`);
    const resRen = await httpGet(urlRen, token);
    console.log(`   👉 响应 (前1000字符):`, JSON.stringify(resRen).substring(0, 1000));

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
