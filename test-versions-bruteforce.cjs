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
  console.log('=== 运行版本暴力破解测试 ===\n');
  try {
    const token = await getAccessToken();

    // 常见的版本候选值
    const versionCandidates = [
      '1.0.0',
      '1.0',
      '2.0',
      '2021-01-01',
      '2020-01-01',
      '2018-01-01',
      'notable_1.0',
      'notables_1.0',
      'aitable_1.0',
      'notable_1.0.0',
      'notables_1.0.0',
      'aitable_1.0.0',
    ];

    const bases = [
      {
        name: 'notables',
        urlTemplate: `https://api.dingtalk.com/v1.0/notables/databases/${BASE_ID}/tables/${NEW_STORE_SHEET_ID}/records`
      },
      {
        name: 'aitable',
        urlTemplate: `https://api.dingtalk.com/v1.0/aitable/bases/${BASE_ID}/sheets/${NEW_STORE_SHEET_ID}/records`
      }
    ];

    for (const base of bases) {
      console.log(`\n============================\n测试基础路径: ${base.name}\n============================`);
      
      for (const ver of versionCandidates) {
        // 尝试方式 A: x-acs-version 头部
        {
          const url = `${base.urlTemplate}?maxResults=5`;
          const headers = { 'x-acs-version': ver };
          const res = await httpGet(url, token, headers);
          const resStr = JSON.stringify(res);
          if (!resStr.includes('InvalidVersion')) {
            console.log(`[成功候选] 头部 x-acs-version: "${ver}"`);
            console.log(`   👉 响应:`, resStr.substring(0, 500));
          }
        }

        // 尝试方式 B: Query 参数 Version
        {
          const url = `${base.urlTemplate}?maxResults=5&Version=${ver}`;
          const res = await httpGet(url, token, {});
          const resStr = JSON.stringify(res);
          if (!resStr.includes('InvalidVersion')) {
            console.log(`[成功候选] 参数 Version: "${ver}"`);
            console.log(`   👉 响应:`, resStr.substring(0, 500));
          }
        }

        // 尝试方式 C: Query 参数 version
        {
          const url = `${base.urlTemplate}?maxResults=5&version=${ver}`;
          const res = await httpGet(url, token, {});
          const resStr = JSON.stringify(res);
          if (!resStr.includes('InvalidVersion')) {
            console.log(`[成功候选] 参数 version: "${ver}"`);
            console.log(`   👉 响应:`, resStr.substring(0, 500));
          }
        }
      }
    }

    console.log('\n测试完成！如果上方没有任何 [成功候选] 输出，说明所有常规版本和传参方式均被 InvalidVersion 拒绝，我们需要寻找另外的方案。');

  } catch (err) {
    console.error('❌ 测试异常:', err.message);
  }
}

runTest();
