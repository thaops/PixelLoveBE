import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'crypto';

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
        { name: 'Sự Kết Nối', energy: 'Connection', meaning: 'Sự đồng điệu và gắn kết linh hồn', advice: 'Hãy dành thời gian chất lượng bên nhau' },
        { name: 'Sự Tin Tưởng', energy: 'Trust', meaning: 'Niềm tin và sự an tâm tuyệt đối', advice: 'Hãy buông bỏ những nghi ngờ không đáng có' },
        { name: 'Sự Tươi Mới', energy: 'Refresh', meaning: 'Năng lượng mới mẻ cho mối quan hệ', advice: 'Hãy thử cùng nhau làm điều gì đó mới' },
        { name: 'Sự Phát Triển', energy: 'Growth', meaning: 'Cùng nhau học hỏi và lớn lên', advice: 'Hãy ủng hộ những mục tiêu cá nhân của nhau' },
        { name: 'Sự Hòa Hợp', energy: 'Harmony', meaning: 'Sự cân bằng và hòa quyện cảm xúc', advice: 'Hãy duy trì sự nhẹ nhàng trong cách đối xử' },
        { name: 'Sự Phản Chiếu', energy: 'Reflection', meaning: 'Nhìn lại hành trình đã qua', advice: 'Hãy cùng chia sẻ về những kỷ niệm đẹp' },
        { name: 'Sự Phiêu Lưu', energy: 'Adventure', meaning: 'Khám phá những trải nghiệm mới', advice: 'Lên kế hoạch cho một chuyến đi bất ngờ' },
        { name: 'Sự Kiên Nhẫn', energy: 'Patience', meaning: 'Thấu hiểu và chờ đợi nhau', advice: 'Đừng vội vã trong những quyết định chung' },
        { name: 'Sự Cân Bằng', energy: 'Balance', meaning: 'Công bằng trong cho và nhận', advice: 'Hãy chú ý đến cảm xúc của đối phương nhiều hơn' },
        { name: 'Sự Giao Thoa', energy: 'Communication', meaning: 'Giao tiếp chân thành và cởi mở', advice: 'Nói ra những điều thầm kín trong lòng' }
    ];

    private getArchetype(coupleId: string, date: string) {
        const seedString = `${coupleId}-${date}`;
        const hash = createHash('sha256').update(seedString).digest('hex');
        const seed = parseInt(hash.substring(0, 8), 16);
        return this.ARCHETYPES[seed % this.ARCHETYPES.length];
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
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const archetype = this.getArchetype(coupleId, date);

            const systemPrompt = `You are a gentle tarot reader for couples.
Generate a short tarot interpretation based on the energy name.

Rules:
- Write in Vietnamese
- Warm and emotional tone
- Maximum 2 sentences per section
- Avoid mystical exaggeration
- Focus on relationship reflection
- Personalize based on the provided streak if relevant (e.g. praising their consistency).

Return JSON format:
{
  "energy": "...",
  "message": "...",
  "advice": "...",
  "question": "..."
}`;

            const userPrompt = `Energy: ${archetype.name} (${archetype.meaning})
Recommended Advice: ${archetype.advice}
Context: Couple relationship, Daily Tarot ritual.
Streak: ${context.streak} days consecutive.
Names: ${context.names.join(' & ')}
Together for: ${context.togetherDays} days.
Who picked first today: ${context.pickedFirst}

Generate: energy, message, advice, question.`;

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
