import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    async generateTarotResult(
        cardA: number,
        cardB: number,
        context: { names: string[]; streak: number; togetherDays: number; pickedFirst: string }
    ): Promise<{ text: string; question: string } | null> {
        if (!this.genAI) {
            this.logger.warn('GEMINI_API_KEY not configured. Skipping AI generation.');
            return null;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const systemPrompt = `You write short emotional reflections for couples based on their daily tarot cards.
Not fortune telling. No future prediction.
Personalize using names, streak, togetherDays, and pickedFirst.
Warm, modern, and gentle tone. Vietnamese language.
Constraints: 
- Exactly 1 message for both.
- Exactly 1 gentle question.
- Total length under 40 words.
- Format: JSON { "text": "...", "question": "..." }`;

            const userPrompt = JSON.stringify({
                cardA,
                cardB,
                names: context.names,
                streak: context.streak,
                togetherDays: context.togetherDays,
                pickedFirst: context.pickedFirst
            });

            const result = await Promise.race([
                model.generateContent(`${systemPrompt}\n\nUser Data: ${userPrompt}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]) as any;

            const response = await result.response;
            let content = response.text();

            // Basic JSON cleanup
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(content);

            return {
                text: parsed.text || '',
                question: parsed.question || ''
            };

        } catch (error) {
            this.logger.error(`AI Generation failed: ${error.message}`);
            return null;
        }
    }

    getFallbackResult(cardA: number, cardB: number): { text: string; question: string } {
        const messages = [
            "Hôm nay là một ngày tuyệt vời để hai bạn cùng nhau xây dựng những kỷ niệm mới.",
            "Sự đồng điệu giữa hai bạn đang ở mức cao nhất, hãy tận dụng điều này.",
            "Một chút bất ngờ nhỏ sẽ làm tình yêu thêm nồng cháy vào tối nay.",
            "Lắng nghe đối phương nhiều hơn sẽ giúp thấu hiểu những tâm tư chưa nói.",
            "Hai bạn như hai mảnh ghép hoàn hảo, hôm nay sự gắn kết ấy càng thêm bền chặt."
        ];
        const questions = [
            "Điều gì làm bạn trân trọng nhất ở đối phương lúc này?",
            "Lần cuối hai bạn cùng làm một việc mới mẻ là khi nào?",
            "Bạn muốn cùng người ấy đi đâu trong kỳ nghỉ sắp tới?",
            "Một hành động nhỏ nào của đối phương khiến bạn cảm thấy hạnh phúc?",
            "Nếu được chọn một siêu năng lực cho cả hai, bạn sẽ chọn gì?"
        ];

        const idx = (cardA + cardB) % messages.length;
        return {
            text: messages[idx],
            question: questions[idx]
        };
    }
}
