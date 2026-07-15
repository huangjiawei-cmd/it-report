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
  console.log('=== 获取企业通讯录部门/用户列表 ===\n');
  try {
    const token = await getAccessToken();

    // 1. 获取子部门列表
    const urlDepts = 'https://api.dingtalk.com/v1.0/contact/departments/sub?deptId=1';
    console.log(`📡 请求子部门列表: ${urlDepts}`);
    const resDepts = await httpGet(urlDepts, token);
    console.log(`   👉 部门列表响应:`, JSON.stringify(resDepts));

    // 2. 获取根部门下的用户极简列表
    const urlUsers = 'https://api.dingtalk.com/v1.0/contact/users/simplelist?deptId=1';
    console.log(`\n📡 请求根部门用户列表: ${urlUsers}`);
    const resUsers = await httpGet(urlUsers, token);
    console.log(`   👉 用户列表响应:`, JSON.stringify(resUsers));

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
