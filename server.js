const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pipeline } = require('stream');
const util = require('util');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Khởi tạo PollyClient từ AWS SDK v3
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.use((req, res, next) => {
  if (req.secure) {
    return next();
  }
  // Chuyển hướng từ HTTP sang HTTPS
  res.redirect(`https://${req.headers.host}${req.url}`);
});

// Thay danh sách các topic bạn muốn vào đây
const topics = [
  "Describe your favorite hobby.",
  "Talk about a memorable travel experience.",
  "Discuss your career aspirations.",
  "Explain your daily routine.",
  "Describe a person who has influenced you.",
  "Introduce yourself.",
  "What is your favorite book and why?",
  "Talk about a skill you would like to learn.",
  "Describe a goal you have achieved recently.",
  "Explain the qualities of a good friend.",
  "Talk about your favorite season and why you like it.",
  "Describe a historical event that interests you.",
  "Explain your favorite type of music and why you enjoy it.",
  "Talk about a time when you helped someone.",
  "Describe a place you would like to visit and why.",
  "What are the benefits of learning a second language?",
  "Explain the importance of family in your life.",
  "Discuss a challenge you have faced and how you overcame it.",
  "What would you do if you won the lottery?",
  "Describe your dream job and why it appeals to you.",
  "Talk about your favorite movie and what you like about it.",
  "Explain the importance of good health.",
  "Describe a pet you have had or would like to have.",
  "What are your favorite leisure activities?",
  "Talk about a person you admire and why.",
  "Describe a famous landmark you would like to visit.",
  "What are the advantages of living in a big city?",
  "Explain what you do to stay fit and healthy.",
  "Describe an invention that changed the world.",
  "What are the qualities of a good leader?",
  "Talk about a recent book or article you read.",
  "Describe a family tradition you have.",
  "Explain the importance of recycling and protecting the environment.",
  "What are the benefits of having a hobby?",
  "Talk about a time when you tried something new.",
  "Describe a typical weekend for you.",
  "Explain the importance of education in today’s world.",
  "Describe the beauty of Hanoi's Old Quarter.",
  "What is your favorite Vietnamese festival and why?",
  "Talk about the significance of Tet (Lunar New Year) in Vietnamese culture.",
  "Describe a traditional Vietnamese meal you enjoy.",
  "What are some unique aspects of Vietnamese coffee culture?",
  "Talk about the importance of family gatherings during Tet in Vietnam.",
  "Explain the role of the ao dai in Vietnamese culture.",
  "Describe a memorable trip you had within Vietnam.",
  "Talk about the significance of the Ho Chi Minh Mausoleum in Hanoi.",
  "Describe the architecture of the Temple of Literature in Hanoi.",
  "What makes Vietnamese street food unique?",
  "Talk about the significance of traditional Vietnamese music.",
  "Describe the landscape of Ha Long Bay and why it's popular.",
  "What are some customs to follow when visiting a Vietnamese pagoda?",
  "Talk about your favorite Vietnamese folk tale or legend.",
  "Describe how Vietnamese people celebrate Mid-Autumn Festival.",
  "What are some popular activities in Hanoi's Hoan Kiem Lake area?",
  "Discuss the importance of respecting elders in Vietnamese culture.",
  "Talk about a traditional Vietnamese art form, such as water puppetry.",
  "What is unique about the Vietnamese language and its tones?",
  "Describe the experience of visiting a night market in Vietnam.",
  "Talk about the differences between northern, central, and southern Vietnamese cuisine.",
  "Describe a popular souvenir that tourists often buy in Vietnam.",
  "What do you appreciate most about Vietnamese culture?"
];

app.get('/', (req, res) => {
  const topic = topics[Math.floor(Math.random() * topics.length)];
  res.render('index', { topic: topic, response: null, audioUrl: null, showResult: false });
});

app.post('/analyze-audio', upload.single('audioFile'), async (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.render('index', { topic: null, response: 'No file uploaded. Please try again.', audioUrl: null, showResult: false });
  }

  const audioBuffer = req.file.buffer;
  const topic = req.body.topic;

  try {
    const fetch = (await import('node-fetch')).default;

    // Upload file lên AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY },
      body: audioBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      return res.render('index', { topic: null, response: 'File upload failed. Please try again.', audioUrl: null, showResult: false });
    }

    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;

    // Gửi yêu cầu transcript
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ audio_url: audioUrl })
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('Transcript request failed:', errorText);
      return res.render('index', { topic: null, response: 'Transcript request failed. Please try again.', audioUrl: null, showResult: false });
    }

    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;

    let transcriptText = null;
    while (true) {
      const checkStatusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        method: 'GET',
        headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY }
      });

      if (!checkStatusResponse.ok) {
        const errorText = await checkStatusResponse.text();
        console.error('Status check failed:', errorText);
        return res.render('index', { topic: null, response: 'Status check failed. Please try again.', audioUrl: null, showResult: false });
      }

      const statusData = await checkStatusResponse.json();
      if (statusData.status === 'completed') {
        transcriptText = statusData.text;
        break;
      } else if (statusData.status === 'failed') {
        console.error('Transcript processing failed:', statusData);
        return res.render('index', { topic: null, response: 'Transcript processing failed. Please try again.', audioUrl: null, showResult: false });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!transcriptText) {
      console.error('No text found in the transcript');
      return res.render('index', { topic: null, response: 'Transcript not available. Please try again.', audioUrl: null, showResult: false });
    }

    // Tạo prompt và xử lý phân tích
    const prompt = `
      Given the topic: "${topic}", please evaluate the following response: "${transcriptText}". 
      1. Rate the response on a scale of 1 to 10, with 10 being the best.
      2. Analyze if the response is relevant to the topic, whether it addresses the topic properly, or if it deviates from it. 
      3. Provide explanations for the score and analysis in both English and Vietnamese.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const response = {
      topic,
      transcriptText,
      analysis: responseText
    };

    // Sử dụng PollyClient để chuyển đổi văn bản phản hồi thành âm thanh
    const pollyParams = {
      OutputFormat: 'mp3',
      Text: responseText,
      VoiceId: 'Joanna',
      LanguageCode: 'en-US'
    };

    const command = new SynthesizeSpeechCommand(pollyParams);
    const audioData = await pollyClient.send(command);

    const audioFilePath = './public/response.mp3';
    await util.promisify(pipeline)(audioData.AudioStream, fs.createWriteStream(audioFilePath));

    res.render('index', { topic: topic, response: response, audioUrl: '/response.mp3', showResult: true });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.render('index', { topic: null, response: 'Error processing your request.', audioUrl: null, showResult: false });
  }
});

// Đọc chứng chỉ và khóa riêng tư
const sslServerOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'fullchain.pem'))
};

// Khởi động server HTTPS
const httpsServer = https.createServer(sslServerOptions, app);

const PORT = process.env.PORT || 443;
httpsServer.listen(PORT, () => {
  console.log(`HTTPS server running on https://localhost:${PORT}`);
});

// Khởi động server HTTP trên cổng 80 để chuyển hướng sang HTTPS
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://${req.headers.host}${req.url}` });
  res.end();
});

httpServer.listen(80, () => {
  console.log('HTTP server running on port 80 and redirecting to HTTPS');
});
