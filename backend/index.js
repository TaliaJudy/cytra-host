import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import unzipper from 'unzipper';
import { startBot, stopBot, deleteBot, isRunning } from './botManager.js';
import { initializeFirebase, getUserBots, addBot, removeBot } from './firebase.js';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
initializeFirebase();

// Create uploads dir
const uploadPath = path.resolve('backend/uploads');
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Fake user ID for demo (use Firebase Auth later)
const userId = 'cytra-demo-user';

app.get('/bots', async (req, res) => {
  const bots = await getUserBots(userId);
  res.json(bots.map(bot => ({
    name: bot.name,
    status: isRunning(bot.name) ? 'online' : 'offline'
  })));
});

app.post('/bots/upload', upload.single('botZip'), async (req, res) => {
  const { botName } = req.body;
  const bots = await getUserBots(userId);

  if (bots.length >= 10) {
    return res.status(400).json({ error: 'Max 10 bots allowed.' });
  }

  const botFolder = path.join(uploadPath, userId, botName);
  fs.mkdirSync(botFolder, { recursive: true });

  // Extract ZIP
  fs.createReadStream(req.file.path)
    .pipe(unzipper.Extract({ path: botFolder }))
    .on('close', async () => {
      fs.unlinkSync(req.file.path); // remove ZIP
      await addBot(userId, botName);
      res.sendStatus(200);
    })
    .on('error', (err) => {
      console.error('Error extracting ZIP:', err);
      res.status(500).json({ error: 'Extraction failed' });
    });
});

app.get('/bots/start/:botName', async (req, res) => {
  const botName = req.params.botName;
  const botPath = path.join(uploadPath, userId, botName);

  try {
    await startBot(botName, botPath);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to start bot' });
  }
});

app.get('/bots/stop/:botName', async (req, res) => {
  try {
    await stopBot(req.params.botName);
    res.sendStatus(200);
  } catch {
    res.status(500).json({ error: 'Failed to stop bot' });
  }
});

app.delete('/bots/delete/:botName', async (req, res) => {
  const botName = req.params.botName;
  const botDir = path.join(uploadPath, userId, botName);

  try {
    await stopBot(botName);
    await deleteBot(botName);
    await removeBot(userId, botName);
    fs.rmSync(botDir, { recursive: true, force: true });
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Cytra Host backend running on http://localhost:${PORT}`);
});
      
