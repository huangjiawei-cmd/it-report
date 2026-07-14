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

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET'
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
  console.log('=== 测试旧版 oapi 通讯录读取 ===\n');
  try {
    const token = await getAccessToken();

    // 1. 获取部门列表
    const urlDepts = `https://oapi.dingtalk.com/department/list?access_token=${token}`;
    console.log(`📡 请求部门列表: ${urlDepts}`);
    const resDepts = await httpGet(urlDepts);
    console.log(`   👉 部门列表响应:`, JSON.stringify(resDepts));

    // 2. 如果部门列表成功，使用部门ID列表，否则默认使用 1 (根部门)
    let deptIds = [1];
    if (resDepts.errcode === 0 && resDepts.department) {
      deptIds = resDepts.department.map(d => d.id);
    }

    // 3. 测试获取部门用户极简列表 (simplelist)
    for (const deptId of deptIds) {
      const urlSimple = `https://oapi.dingtalk.com/user/simplelist?access_token=${token}&department_id=${deptId}`;
      console.log(`\n📡 请求部门 [${deptId}] 用户极简信息: ${urlSimple}`);
      const resSimple = await httpGet(urlSimple);
      console.log(`   👉 响应:`, JSON.stringify(resSimple));
    }

    // 4. 测试获取部门用户详细信息列表 (listbypage)
    for (const deptId of deptIds) {
      const urlFull = `https://oapi.dingtalk.com/user/listbypage?access_token=${token}&department_id=${deptId}&offset=0&size=50`;
      console.log(`\n📡 请求部门 [${deptId}] 用户详细列表: ${urlFull}`);
      const resFull = await httpGet(urlFull);
      console.log(`   👉 响应:`, JSON.stringify(resFull));
    }

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
