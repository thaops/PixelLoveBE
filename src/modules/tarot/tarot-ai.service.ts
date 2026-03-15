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
            name: 'Sự Kết Nối (The Lovers)', 
            energy: 'Connection', 
            meaning: 'Sự hòa quyện giữa lý trí và con tim, sự lựa chọn đồng hành cùng nhau', 
            advice: 'Hãy trân trọng những giá trị chung mà hai bạn đang cùng hướng tới',
            themes: ['sự thấu cảm vượt ngôn từ', 'lựa chọn từ trái tim', 'sự bù trừ hoàn hảo', 'ngọn lửa đam mê âm ỉ'],
            symbols: ['đôi chim bồ câu', 'sợi dây đỏ', 'ánh sáng bình minh']
        },
        { 
            name: 'Sự Tin Tưởng (The Emperor)', 
            energy: 'Trust', 
            meaning: 'Sự bảo hộ, tính kỷ luật và cam kết lâu bền', 
            advice: 'Hãy xây dựng niềm tin dựa trên những hành động thực tế',
            themes: ['điểm tựa vững chãi', 'lời cam kết vàng', 'vượt qua những nghi ngại', 'xây dựng tương lai chung'],
            symbols: ['ngai vàng', 'ngọn núi cao', 'chiếc khiên bạc']
        },
        { 
            name: 'Sự Tươi Mới (The Fool)', 
            energy: 'Refresh', 
            meaning: 'Sự khởi đầu mới, tinh thần lạc quan và không sợ hãi', 
            advice: 'Đừng ngại cùng nhau thử những điều mới mẻ',
            themes: ['bước nhảy niềm tin', 'sự hồn nhiên trong tình yêu', 'khám phá những vùng đất mới', 'phá bỏ rào cản'],
            symbols: ['hành lý nhỏ', 'vách đá', 'ánh mặt trời rực rỡ']
        },
        { 
            name: 'Sự Phát Triển (The Empress)', 
            energy: 'Growth', 
            meaning: 'Sự nuôi dưỡng, sinh sôi và tình yêu mẫu tử ấm áp', 
            advice: 'Hãy để tình yêu của hai bạn được phát triển một cách tự nhiên nhất',
            themes: ['sự màu mỡ của cảm xúc', 'nuôi dưỡng tâm hồn nhau', 'thời điểm nở hoa của tình yêu', 'sự trù phú và sung túc'],
            symbols: ['cánh đồng lúa chín', 'vòng hoa', 'dòng suối trong']
        },
        { 
            name: 'Sự Hòa Hợp (Temperance)', 
            energy: 'Harmony', 
            meaning: 'Sự kiên nhẫn, trung dung và pha trộn các yếu tố để tạo ra sự cân bằng', 
            advice: 'Hãy tìm điểm giao thoa giữa cái tôi cá nhân và chúng ta',
            themes: ['nghệ thuật hòa giải', 'nhịp điệu dịu dàng', 'sự kiên nhẫn ngọt ngào', 'chữa lành bằng tình yêu'],
            symbols: ['hai chiếc cốc', 'nước chảy', 'đôi cánh trắng']
        },
        { 
            name: 'Sự Phản Chiếu (The High Priestess)', 
            energy: 'Reflection', 
            meaning: 'Sự huyền bí, trực giác và kiến thức ẩn giấu', 
            advice: 'Hãy lắng nghe tiếng nói bên trong của mình về mối quan hệ này',
            themes: ['trực giác thầm lặng', 'nhìn thấu tâm hồn', 'bí mật của sự gắn kết', 'sự kết nối tâm linh'],
            symbols: ['mặt trăng', 'cuộn giấy', 'màn che huyền bí']
        },
        { 
            name: 'Sự Phiêu Lưu (The Chariot)', 
            energy: 'Adventure', 
            meaning: 'Sự chiến thắng, quyết tâm và làm chủ hướng đi', 
            advice: 'Hãy cùng nhau tiến về phía trước với mục tiêu chung rõ ràng',
            themes: ['hành trình chinh phục', 'vượt qua các xung đột', 'sự đồng lòng hướng về mục tiêu', 'đam mê dẫn lối'],
            symbols: ['xe kéo', 'ngôi sao dẫn đường', 'đôi nhân sư']
        },
        { 
            name: 'Sự Kiên Nhẫn (Strength)', 
            energy: 'Patience', 
            meaning: 'Sức mạnh nội tâm, lòng dũng cảm và sự dịu dàng khuất phục cái ác', 
            advice: 'Hãy dùng sự dịu dàng để hóa giải những mâu thuẫn',
            themes: ['sức mạnh của sự mềm mỏng', 'làm chủ cảm xúc', 'lòng trắc ẩn', 'sự kiên định âm thầm'],
            symbols: ['sư tử', 'vô cực', 'đóa hoa hồng']
        },
        { 
            name: 'Sự Cân Bằng (Justice)', 
            energy: 'Balance', 
            meaning: 'Sự công bằng, sự thật và nhân quả', 
            advice: 'Hãy trung thực với nhau và với chính cảm xúc của mình',
            themes: ['trách nhiệm chung', 'sự rõ ràng trong giao tiếp', 'cân bằng giữa cho và nhận', 'sự thật được phơi bày'],
            symbols: ['cái cân', 'thanh kiếm', 'trụ cột đá']
        },
        { 
            name: 'Sự Giao Thoa (The Magician)', 
            energy: 'Communication', 
            meaning: 'Khả năng hiện thực hóa, giao tiếp và kỹ năng', 
            advice: 'Hãy sử dụng sức mạnh của ngôn từ để truyền cảm hứng cho nhau',
            themes: ['ngôn ngữ của đam mê', 'kiến tạo hiện thực mới', 'biến ý tưởng thành hành động', 'sự thấu hiểu đa chiều'],
            symbols: ['bốn nguyên tố', 'chiếc gậy thần', 'biểu tượng vô cực']
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
            const model = this.genAI.getGenerativeModel({ 
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 1.0,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            });

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
Energy Archetype: ${archetype.name}
Core Meaning: ${archetype.meaning}
Active Theme to focus: ${archetype.activeTheme}
Visual Symbols to weave in: ${archetype.symbols?.join(', ')}
Recommended Base Advice: ${archetype.advice}
Couple Names: ${context.names.join(' & ')}
Current Streak: ${context.streak} days
Together for: ${context.togetherDays} days
Whose turn it was to lead: ${context.pickedFirst}

Task: Generate a UNIQUE 4-2-1 structure interpretation. Focus deeply on the "Active Theme" and weave in the "Visual Symbols" to avoid clichés. Ensure the tone is warm, professional, and slightly mystical. Use diverse vocabulary to avoid repeating common phrases.`;

            const result = await Promise.race([
                model.generateContent(`${systemPrompt}\n\nInput:\n${userPrompt}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
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
          "Năng lượng hôm nay cho thấy mối quan hệ của bạn đang ở trạng thái ổn định và đầy ấm áp. Đây là lúc cả hai cùng trân trọng những khoảnh khắc bình dị bên nhau để thấu hiểu nhau hơn. Mọi thứ đang diễn ra rất nhẹ nhàng và thuận lợi cho những dự định chung sắp tới. Hãy cứ tin tưởng vào hành trình mà hai bạn đang cùng nhau xây dựng mỗi ngày.",
          "Lá bài hôm nay mang đến thông điệp về sự đồng điệu sâu sắc trong tâm hồn của cả hai. Có những điều không cần nói ra nhưng đối phương vẫn có thể thấu cảm và sẻ chia một cách trọn vẹn. Sự gắn kết này chính là nền tảng vững chắc nhất để tình yêu của bạn vượt qua mọi thử thách. Hãy tận hưởng nguồn năng lượng tích cực này để làm mới tình cảm của mình.",
          "Thông điệp từ lá bài cho thấy sự hiện diện của đối phương chính là món quà lớn nhất lúc này. Hai bạn đang tạo ra một không gian an toàn và đầy yêu thương để cùng nhau phát triển. Đừng ngần ngại bày tỏ những tình cảm chân thành nhất dành cho người ấy vào ngày hôm nay. Sự chân thành sẽ luôn tìm được đường đến với trái tim của người mà bạn yêu thương."
        ];
        
        const fallbackQuestions = [
          "Điều gì ở người ấy khiến bạn cảm thấy an tâm nhất?",
          "Bạn muốn cùng người ấy làm điều gì mới mẻ vào cuối tuần này?",
          "Một hành động nhỏ nào hôm nay đã làm bạn mỉm cười?"
        ];

        return {
            energy: arch.name,
            message: fallbackMessages[(cardA + cardB) % fallbackMessages.length],
            advice: `${arch.advice}. Hãy luôn trân trọng những gì mình đang có.`,
            question: fallbackQuestions[(cardA + cardB) % fallbackQuestions.length]
        };
    }
}
