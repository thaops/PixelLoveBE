import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'crypto';
import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';

dayjs.extend(dayOfYear);

@Injectable()
export class TarotAiService {
    private readonly logger = new Logger(TarotAiService.name);
    private genAI: GoogleGenerativeAI;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    private readonly ARCHETYPES = [
        { 
            name: 'Sự Kết Nối', 
            energy: 'Connection', 
            meaning: 'Sự đồng điệu và gắn kết linh hồn', 
            advice: 'Hãy dành thời gian chất lượng bên nhau',
            themes: ['sự hiện diện trọn vẹn', 'kỷ niệm cũ', 'thấu hiểu thầm lặng', 'sức mạnh của cái nắm tay']
        },
        { 
            name: 'Sự Tin Tưởng', 
            energy: 'Trust', 
            meaning: 'Niềm tin và sự an tâm tuyệt đối', 
            advice: 'Hãy buông bỏ những nghi ngờ không đáng có',
            themes: ['sự an toàn cảm xúc', 'buông bỏ quá khứ', 'xây dựng tương lai', 'điểm tựa tinh thần']
        },
        { 
            name: 'Sự Tươi Mới', 
            energy: 'Refresh', 
            meaning: 'Năng lượng mới mẻ cho mối quan hệ', 
            advice: 'Hãy thử cùng nhau làm điều gì đó mới',
            themes: ['trải nghiệm chưa từng có', 'góc nhìn mới', 'bản giao hưởng lạ', 'phá vỡ thói quen']
        },
        { 
            name: 'Sự Phát Triển', 
            energy: 'Growth', 
            meaning: 'Cùng nhau học hỏi và lớn lên', 
            advice: 'Hãy ủng hộ những mục tiêu cá nhân của nhau',
            themes: ['nuôi dưỡng đam mê', 'vượt qua thử thách', 'tương lai chung', 'sự thay đổi tích cực']
        },
        { 
            name: 'Sự Hòa Hợp', 
            energy: 'Harmony', 
            meaning: 'Sự cân bằng và hòa quyện cảm xúc', 
            advice: 'Hãy duy trì sự nhẹ nhàng trong cách đối xử',
            themes: ['vũ điệu cảm xúc', 'nhịp điệu chung', 'sự bù trừ hoàn hảo', 'yên bình bên nhau']
        },
        { 
            name: 'Sự Phản Chiếu', 
            energy: 'Reflection', 
            meaning: 'Nhìn lại hành trình đã qua', 
            advice: 'Hãy cùng chia sẻ về những kỷ niệm đẹp',
            themes: ['gương soi tâm hồn', 'bài học từ quá khứ', 'sự thay đổi của tình yêu', 'trân trọng hiện tại']
        },
        { 
            name: 'Sự Phiêu Lưu', 
            energy: 'Adventure', 
            meaning: 'Khám phá những trải nghiệm mới', 
            advice: 'Lên kế hoạch cho một chuyến đi bất ngờ',
            themes: ['hành trình xa xôi', 'khám phá nội tâm', 'thử thách mạo hiểm', 'niềm vui bất tận']
        },
        { 
            name: 'Sự Kiên Nhẫn', 
            energy: 'Patience', 
            meaning: 'Thấu hiểu và chờ đợi nhau', 
            advice: 'Đừng vội vã trong những quyết định chung',
            themes: ['thời điểm vàng', 'sự dịu dàng', 'lắng nghe sâu sắc', 'nuôi dưỡng từ từ']
        },
        { 
            name: 'Sự Cân Bằng', 
            energy: 'Balance', 
            meaning: 'Công bằng trong cho và nhận', 
            advice: 'Hãy chú ý đến cảm xúc của đối phương nhiều hơn',
            themes: ['cán cân cảm xúc', 'trách nhiệm chung', 'thời gian cho mình và cho nhau', 'sự cho đi vô điều kiện']
        },
        { 
            name: 'Sự Giao Thoa', 
            energy: 'Communication', 
            meaning: 'Giao tiếp chân thành và cởi mở', 
            advice: 'Nói ra những điều thầm kín trong lòng',
            themes: ['ngôn ngữ trái tim', 'phá vỡ im lặng', 'sự thấu cảm', 'lời thì thầm ngọt ngào']
        }
    ];

    private getArchetype(coupleId: string, date: string) {
        const seedString = `${coupleId}-${date}`;
        const hash = createHash('sha256').update(seedString).digest('hex');
        const seed = parseInt(hash.substring(0, 8), 16);
        
        // Seed Rotation: Kết hợp seed cố định với ngày trong năm để phân tán energyIndex
        const dayNum = dayjs(date).dayOfYear();
        const archetypeIdx = (seed + dayNum) % this.ARCHETYPES.length;
        const archetype = this.ARCHETYPES[archetypeIdx];

        // Micro-theme selection: Chọn 1 chủ đề nhỏ trong archetype để AI viết đa dạng hơn
        const themeIdx = seed % archetype.themes.length;
        return {
            ...archetype,
            activeTheme: archetype.themes[themeIdx]
        };
    }

    async generateTarotResult(
        cardA: number,
        cardB: number,
        coupleId: string,
        date: string,
        context: { names: string[]; streak: number; togetherDays: number; pickedFirst: string }
    ): Promise<{ energy: string; message: string; advice: string; question: string } | null> {
        if (!this.genAI) {
            this.logger.warn('GEMINI_API_KEY not configured. Skipping AI generation.');
            return null;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

            const archetype = this.getArchetype(coupleId, date);

            const systemPrompt = `You are a professional, gentle, and intuitive tarot reader for couples.
Generate a short tarot interpretation based on the energy name.

Structure Rules:
- energy: The name of the energy in Vietnamese.
- message: Exactly 4 sentences. Start with phrases like "Năng lượng hôm nay...", "Lá bài cho thấy...", or "Thông điệp từ lá bài...".
- advice: Exactly 2 sentences. Practical and warm advice.
- question: Exactly 1 sentence. A deep reflective question for the couple.

Tone & Style:
- Write in Vietnamese.
- Warm, emotional, reflective, and slightly mystical vibe.
- Focus on the spiritual and emotional connection between the two names provided.
- Personalize based on their streak and how long they've been together.

Return ONLY JSON format:
{
  "energy": "...",
  "message": "...",
  "advice": "...",
  "question": "..."
}

Style Examples:
Example 1:
Energy: Sự Kết Nối
Message: Năng lượng hôm nay cho thấy giữa hai bạn đang tồn tại một sợi dây kết nối rất tự nhiên và ấm áp. Đó là cảm giác quen thuộc khi ở cạnh nhau, nơi mọi thứ dường như trở nên nhẹ nhàng hơn. Có thể gần đây mọi thứ diễn ra khá bình yên, nhưng chính sự bình yên đó lại là dấu hiệu của một mối quan hệ đang được nuôi dưỡng bền vững. Lá bài nhắc rằng đôi khi những điều nhỏ bé và giản dị lại chính là nền tảng của sự gắn kết lâu dài.
Advice: Hãy dành thời gian hiện diện trọn vẹn bên nhau hôm nay. Một cuộc trò chuyện chân thành hoặc một khoảnh khắc đơn giản cũng có thể làm tình cảm trở nên sâu sắc hơn.
Question: Khoảnh khắc nào gần đây khiến bạn cảm thấy thật sự gắn kết với người ấy?

Example 2:
Energy: Sự Tin Tưởng
Message: Lá bài hôm nay mang đến năng lượng của niềm tin trong mối quan hệ. Đôi khi những lo lắng nhỏ có thể xuất hiện, nhưng không phải lúc nào chúng cũng phản ánh sự thật. Nhiều khi đó chỉ là tiếng vọng của những nỗi sợ bên trong mỗi người. Khi hai người chọn tin tưởng và mở lòng với nhau, mối quan hệ sẽ trở nên vững vàng hơn theo thời gian.
Advice: Hãy thả lỏng những nghi ngờ không cần thiết và tin vào cảm xúc của mình. Sự chân thành và tin tưởng luôn là nền tảng giúp tình yêu phát triển bền vững.
Question: Điều gì ở người ấy khiến bạn cảm thấy an tâm nhất?`;

            const userPrompt = `Input Data:
Energy Archetype: ${archetype.name} (${archetype.meaning})
Specific Micro-theme: ${archetype.activeTheme}
Recommended Base Advice: ${archetype.advice}
Couple Names: ${context.names.join(' & ')}
Current Streak: ${context.streak} days
Together for: ${context.togetherDays} days
Who picked card first today: ${context.pickedFirst}

Task: Generate the 4-2-1 structure interpretation focusing deeply on the "Specific Micro-theme". Ensure the tone is warm and personalized.`;

            const result = await Promise.race([
                model.generateContent(`${systemPrompt}\n\nInput:\n${userPrompt}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]) as any;

            const response = await result.response;
            let content = response.text();

            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(content);

            return {
                energy: parsed.energy || archetype.name,
                message: parsed.message || '',
                advice: parsed.advice || archetype.advice,
                question: parsed.question || ''
            };

        } catch (error) {
            this.logger.error(`AI Generation failed: ${error.message}`);
            return null;
        }
    }

    getFallbackResult(cardA: number, cardB: number, coupleId: string, date: string): { energy: string; message: string; advice: string; question: string } {
        const arch = this.getArchetype(coupleId, date);
        
        const fallbackMessages = [
          "Mối quan hệ của bạn đang ở trạng thái ổn định và đầy ấm áp.",
          "Hôm nay là thời điểm tuyệt vời để thấu hiểu nhau sâu sắc hơn.",
          "Sự hiện diện của đối phương chính là món quà lớn nhất lúc này."
        ];
        
        const fallbackQuestions = [
          "Điều gì ở người ấy khiến bạn cảm thấy an tâm nhất?",
          "Bạn muốn cùng người ấy làm điều gì mới mẻ vào cuối tuần này?",
          "Một hành động nhỏ nào hôm nay đã làm bạn mỉm cười?"
        ];

        return {
            energy: arch.name,
            message: fallbackMessages[(cardA + cardB) % fallbackMessages.length],
            advice: arch.advice,
            question: fallbackQuestions[(cardA + cardB) % fallbackQuestions.length]
        };
    }
}
