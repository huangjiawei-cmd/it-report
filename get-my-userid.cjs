const https = require('https');

const APP_KEY = 'dingtxg3yye3ed4ae1fq';
const APP_SECRET = '3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf';

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ appKey: APP_KEY, appSecret: APP_SECRET });
    const options = {
      hostname: 'api.dingtalk.com',
      path: '/v1.0/oauth2/accessToken',
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

function getMe(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.dingtalk.com',
      path: '/v1.0/contact/users/me',
      method: 'GET',
      headers: { 'x-acs-dingtalk-access-token': accessToken }
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

(async () => {
  console.log('=== 获取当前用户的真实 userId ===\n');
  try {
    const auth = await getAccessToken();
    if (auth.code) { console.error('❌ Token 失败:', auth); process.exit(1); }
    console.log('✅ Token 获取成功\n');
    
    const user = await getMe(auth.accessToken);
    if (user.code) { console.error('❌ 查询失败:', user); process.exit(1); }
    
    console.log('你的真实钉钉用户信息:');
    console.log(`  userId:    ${user.userId}`);
    console.log(`  unionId:   ${user.unionId}`);
    console.log(`  name:      ${user.name}`);
    console.log(`  nick:      ${user.nick}`);
    console.log(`  mobile:    ${user.mobile}`);
    console.log('\n📋 请复制上面的 userId 作为 operatorId 使用');
  } catch (err) {
    console.error('❌ 异常:', err.message);
  }
})();
