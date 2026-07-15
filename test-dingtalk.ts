const credentialsStr = "3xI3rs5SKj-_T-B_GBVSkwB--q9TkUeguuuTEykqMrLl-8Iys8ZwTZqUezw9LrEf";

async function testAll() {
  let appKey = "";
  let appSecret = "";
  if (credentialsStr.includes("--")) {
    const parts = credentialsStr.split("--");
    appKey = parts[0];
    appSecret = parts[1];
  } else {
    appKey = credentialsStr.slice(0, 24);
    appSecret = credentialsStr.slice(24);
  }
  
  console.log("AppKey:", appKey);
  console.log("AppSecret:", appSecret);

  // Endpoint 1: https://api.dingtalk.com/v1.0/oauth2/accessToken
  try {
    const res = await fetch("https://api.dingtalk.com/v1.0/oauth2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appKey, appSecret })
    });
    const data = await res.json();
    console.log("Endpoint 1 (api.dingtalk.com) response:", data);
  } catch (e: any) {
    console.error("Endpoint 1 failed:", e.message);
  }

  // Endpoint 2: https://api.dingtalk.com/v1.0/oauth2/accessToken (as client_id, client_secret)
  try {
    const res = await fetch("https://api.dingtalk.com/v1.0/oauth2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: appKey, clientSecret: appSecret })
    });
    const data = await res.json();
    console.log("Endpoint 2 (clientId/clientSecret) response:", data);
  } catch (e: any) {
    console.error("Endpoint 2 failed:", e.message);
  }

  // Endpoint 3: https://oapi.dingtalk.com/gettoken
  try {
    const res = await fetch(`https://oapi.dingtalk.com/gettoken?appkey=${appKey}&appsecret=${appSecret}`);
    const data = await res.json();
    console.log("Endpoint 3 (oapi.dingtalk.com) response:", data);
  } catch (e: any) {
    console.error("Endpoint 3 failed:", e.message);
  }
}

testAll();
