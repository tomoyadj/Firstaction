// netlify/functions/chat.js
// ตัวกลางหลังบ้าน — ซ่อน API Key ไว้ฝั่ง server ไม่ให้ใครเห็น
// ใช้ Google Gemini API (โมเดล gemini-2.5-flash) — ใช้ได้บน Free Tier
// ต้องตั้งค่า Environment Variable ชื่อ GEMINI_API_KEY ใน Netlify

exports.handler = async (event) => {
  // รองรับการทำงานแบบ CORS และดักจับคำสั่ง OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-goog-api-key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // อนุญาตเฉพาะ POST เท่านั้น
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Netlify' }) 
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const messages = body.messages || [];   // [{role:'user'|'assistant', content:'...'}]
    const system = body.system || '';

    // แปลงรูปแบบข้อความให้ตรงกับ Gemini API (user และ model)
    const contents = messages.map(function (m) {
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      };
    });

    // ปรับโครงสร้าง Object ให้ถูกต้องตามสเปกของโครงสร้าง Gemini 2.5 Flash
    const geminiBody = {
      contents: contents,
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7
      }
    };

    // ใส่คำสั่งสไตล์โค้ด (System Instruction) ลงในตัวแปรระบบหลักที่ถูกต้อง
    if (system) {
      geminiBody.systemInstruction = { parts: [{ text: system }] };
    }

    // เรียกข้ามไปที่ URL API ของ Google Gemini โดยใส่ Key ไว้ที่ท้าย URL Parameter (วิธีที่เสถียรที่สุด)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiBody)
    });

    const data = await resp.json();
    
    return {
      statusCode: resp.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }) 
    };
  }
};