import { exec } from 'child_process';
import path from 'path';

const runningBots = new Set();

export function startBot(botName, botPath) {
  return new Promise((resolve, reject) => {
    const mainFile = path.join(botPath, 'index.js'); // All bots must have index.js

    // Use PM2 to start
    exec(`pm2 start ${mainFile} --name "${botName}" --cwd "${botPath}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      runningBots.add(botName);
      console.log(`✅ Started bot: ${botName}`);
      resolve();
    });
  });
}

export function stopBot(botName) {
  return new Promise((resolve, reject) => {
    exec(`pm2 stop "${botName}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      runningBots.delete(botName);
      console.log(`🛑 Stopped bot: ${botName}`);
      resolve();
    });
  });
}

export function deleteBot(botName) {
  return new Promise((resolve, reject) => {
    exec(`pm2 delete "${botName}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      console.log(`❌ Deleted bot: ${botName}`);
      resolve();
    });
  });
}

export function isRunning(botName) {
  return runningBots.has(botName);
}

