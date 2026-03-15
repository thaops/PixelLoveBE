const { GoogleGenerativeAI } = require("@google/generative-ai");
const createHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

async function testAI() {
  const apiKey = "AIzaSyAc0qq8ZIfxOuNtonkxey81SjiEbmHYWWM";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
          temperature: 1.0,
          topP: 0.95,
      }
  });

  const ARCHETYPES = [
    { name: 'Sự Kết Nối (The Lovers)', themes: ['sự thấu cảm vượt ngôn từ', 'lựa chọn từ trái tim'], symbols: ['đôi chim bồ câu', 'sợi dây đỏ'] },
    { name: 'Sự Tin Tưởng (The Emperor)', themes: ['điểm tựa vững chãi', 'lời cam kết vàng'], symbols: ['ngai vàng', 'ngọn núi cao'] },
    { name: 'Sự Tươi Mới (The Fool)', themes: ['bước nhảy niềm tin', 'sự hồn nhiên'], symbols: ['vách đá', 'ánh mặt trời'] },
    { name: 'Sự Phát Triển (The Empress)', themes: ['sự màu mỡ', 'nuôi dưỡng tâm hồn'], symbols: ['cánh đồng', 'vòng hoa'] },
    { name: 'Sự Hòa Hợp (Temperance)', themes: ['nghệ thuật hòa giải', 'nhịp điệu dịu dàng'], symbols: ['hai chiếc cốc', 'đôi cánh trắng'] }
  ];

  // Randomly pick an archetype for testing variety
  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const theme = archetype.themes[Math.floor(Math.random() * archetype.themes.length)];

  const systemPrompt = `You are a professional, gentle, and intuitive tarot reader for couples.
Structure: energy, message (4 sentences), advice (2 sentences), question (1 sentence).
Tone: warm, mystical, Vietnamese.
Return ONLY JSON.`;

  const userPrompt = `Input Data:
Energy Archetype: ${archetype.name}
Active Theme: ${theme}
Visual Symbols: ${archetype.symbols.join(', ')}
Names: Minh & Lan

Task: Generate a UNIQUE 4-2-1 structure interpretation. Focus deeply on the "Active Theme" and "Visual Symbols".`;

  try {
    console.log(`Đang gọi Gemini AI với Energy: ${archetype.name}...`);
    const result = await model.generateContent(`${systemPrompt}\n\nInput:\n${userPrompt}`);
    const response = await result.response;
    console.log("Kết quả từ AI:");
    console.log(response.text());
  } catch (error) {
    console.error("Lỗi:", error.message);
  }
}

testAI();
