const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Header = base64UrlEncode(JSON.stringify(header));
  const base64Payload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret)
    .update(base64Header + '.' + base64Payload)
    .digest();
  const base64Signature = base64UrlEncode(signature);
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}

const secret = 'ksubzone_secret_key_2026';
const payload = {
  id: '4c01da04d4752d8ca352e7e0', // SuperAdmin ID
  role: 'admin',
  exp: Math.floor(Date.now() / 1000) + 3600
};
const token = signJwt(payload, secret);

// Create temp subtitle file
const subPath = path.join(__dirname, 'temp-sub.srt');
fs.writeFileSync(subPath, '1\n00:00:01,000 --> 00:00:04,000\nTest Subtitle\n');

// We will use standard FormData from node fetch or custom multi-part construction
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const fields = {
  mediaId: '2ef75a5bc51c0f308b9838e7',
  mediaType: 'Episode',
  language: 'Sinhala',
  version: '1.0',
  releaseNotes: 'test notes',
  seasonNumber: '1',
  episodeNumber: '6',
  seasonStatus: 'Ongoing'
};

let bodyParts = [];
for (const [key, value] of Object.entries(fields)) {
  bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
}

const fileContent = fs.readFileSync(subPath);
bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="subtitle"; filename="temp-sub.srt"\r\nContent-Type: application/x-subrip\r\n\r\n`));
bodyParts.push(fileContent);
bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

const body = Buffer.concat(bodyParts);

console.log('Sending request to local PHP server...');
fetch('http://127.0.0.1:5000/api/admin/subtitles/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Accept': 'application/json'
  },
  body: body
})
.then(async res => {
  console.log('Status Code:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('Response Body:', text);
})
.catch(console.error)
.finally(() => {
  // Clean up
  try {
    fs.unlinkSync(subPath);
  } catch (e) {}
});
