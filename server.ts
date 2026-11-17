import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

interface IncomingImageInput {
  dataUrl?: string;
}

interface ParsedTaskRaw {
  subject?: string;
  title?: string;
  description?: string;
  dueLabel?: string;
  type?: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.post('/api/parse-teacher-message', async (req, res) => {
    try {
      const body = (req.body || {}) as {
        messageText?: string;
        images?: IncomingImageInput[];
        studentName?: string;
        studentGrade?: string;
      };

      const messageText = typeof body.messageText === 'string' ? body.messageText.trim().slice(0, 6000) : '';
      const rawImages = Array.isArray(body.images) ? body.images.slice(0, 3) : [];
      const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

      for (const item of rawImages) {
        if (typeof item?.dataUrl === 'string') {
          const parsed = parseDataUrl(item.dataUrl);
          if (parsed) {
            imageParts.push({ inlineData: parsed });
          }
        }
      }

      if (!messageText && imageParts.length === 0) {
        res.status(400).json({
          error: 'Vui lòng dán nội dung tin nhắn hoặc tải lên ít nhất 1 ảnh chụp tin nhắn giáo viên.',
        });
        return;
      }

      const ai = getGeminiClient();
      const studentContext = [
        body.studentName ? `Học sinh: ${String(body.studentName).slice(0, 80)}` : '',
        body.studentGrade ? `Khối lớp: ${String(body.studentGrade).slice(0, 40)}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      const promptParts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [...imageParts];

      promptParts.push({
        text: [
          studentContext ? `Thông tin học sinh: ${studentContext}` : '',
          messageText
            ? `Nội dung tin nhắn giáo viên:\n"""\n${messageText}\n"""`
            : 'Hãy đọc kỹ nội dung chữ trong các ảnh chụp tin nhắn giáo viên đính kèm ở trên.',
          'Hãy trích xuất toàn bộ các bài tập, nhiệm vụ học tập hoặc dặn dò chuẩn bị bài cần học sinh hoàn thành thành danh sách To-do rõ ràng.',
        ]
          .filter(Boolean)
          .join('\n\n'),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts: promptParts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Bạn là trợ lý phân tích tin nhắn dặn dò của giáo viên dành cho phụ huynh và học sinh Việt Nam. ' +
            'Nhiệm vụ: đọc tin nhắn văn bản hoặc ảnh chụp màn hình tin nhắn (Zalo, SMS, nhóm lớp, bảng dặn dò) và tách thành các đầu việc/bài tập cụ thể cho học sinh. ' +
            'Quy tắc bắt buộc:\n' +
            '1) Chỉ trích xuất các nhiệm vụ học sinh cần làm (bài tập về nhà, soạn bài, ôn tập, học từ vựng, làm đề, chuẩn bị dụng cụ/sách vở học tập). Bỏ qua lời chào hỏi xã giao hoặc thông báo không liên quan đến việc học của học sinh.\n' +
            '2) Không viết tắt "BT", luôn viết đầy đủ là "Bài tập".\n' +
            '3) subject: tên môn học ngắn gọn bằng tiếng Việt (ví dụ: "Toán học", "Ngữ văn", "Tiếng Anh", "Khoa học", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý", "Tin học", hoặc "Tổng hợp"), tối đa 40 ký tự.\n' +
            '4) title: tên bài tập rõ ràng, hành động cụ thể (tối đa 120 ký tự).\n' +
            '5) description: hướng dẫn chi tiết, số trang, số bài, ghi chú từ giáo viên (tối đa 800 ký tự).\n' +
            '6) dueLabel: hạn nộp hoặc thời gian thực hiện trích xuất từ tin nhắn (ví dụ: "Hôm nay · 20:00", "Sáng mai · 07:30", "Thứ 6 tuần này", hoặc "Hôm nay" nếu không ghi rõ), tối đa 60 ký tự.\n' +
            '7) type: chọn "today" nếu cần làm ngay hôm nay/tối nay/ngày mai, chọn "extra" nếu là bài bổ sung, cuối tuần hoặc hạn dài hơn trong tuần.\n' +
            '8) summaryNote: tóm tắt ngắn gọn 1 câu bằng tiếng Việt về nội dung tin nhắn giáo viên đã giao.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryNote: {
                type: Type.STRING,
                description: 'Tóm tắt 1 câu nội dung giáo viên dặn.',
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    dueLabel: { type: Type.STRING },
                    type: { type: Type.STRING },
                  },
                  required: ['subject', 'title', 'description', 'dueLabel', 'type'],
                },
              },
            },
            required: ['summaryNote', 'tasks'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      let parsedJson: { summaryNote?: string; tasks?: ParsedTaskRaw[] } = {};
      try {
        parsedJson = JSON.parse(rawText) as { summaryNote?: string; tasks?: ParsedTaskRaw[] };
      } catch {
        res.status(502).json({
          error: 'Không đọc được định dạng phản hồi từ bộ phân tích. Vui lòng thử lại.',
        });
        return;
      }

      const rawTasks = Array.isArray(parsedJson.tasks) ? parsedJson.tasks : [];
      const tasks = rawTasks
        .map((t) => {
          const title = String(t.title || '').trim().slice(0, 120);
          if (!title) return null;
          const subject = String(t.subject || 'Tổng hợp').trim().slice(0, 40) || 'Tổng hợp';
          const description = String(t.description || '').trim().slice(0, 800);
          const dueLabel = String(t.dueLabel || 'Hôm nay').trim().slice(0, 60) || 'Hôm nay';
          const type = t.type === 'extra' ? 'extra' : 'today';
          return { subject, title, description, dueLabel, type };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 15);

      const summaryNote =
        typeof parsedJson.summaryNote === 'string' && parsedJson.summaryNote.trim()
          ? parsedJson.summaryNote.trim().slice(0, 300)
          : tasks.length > 0
            ? `Đã trích xuất ${tasks.length} đầu việc học tập từ tin nhắn giáo viên.`
            : 'Chưa phát hiện đầu việc bài tập cụ thể trong tin nhắn này.';

      res.json({ summaryNote, tasks });
    } catch (error) {
      console.error('Parse teacher message failed:', error);
      const msg = error instanceof Error ? error.message : 'Lỗi máy chủ khi phân tích tin nhắn.';
      const status = msg.includes('GEMINI_API_KEY') ? 500 : 502;
      res.status(status).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('App build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NhipHoc server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
