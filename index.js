/**
 * Discord Feed Bot
 * Universal Social Media Feed — Instagram, Facebook, Twitter/X, YouTube, TikTok, Reddit, etc.
 * Uses RSS bridges to bypass Meta API session restrictions
 *
 * @author shirakamif30
 * @license MIT
 */

const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const Database = require('./src/database');
const FeedManager = require('./src/feedManager');
const Logger = require('./src/utils/logger');
const loadCommands = require('./src/commands/loader');

// ─── Load Token ──────────────────────────────────────────────────────────────
function loadToken() {
  // Priority: config.json > .env > process.env
  const configPath = join(__dirname, 'config.json');
  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
      if (cfg.token && cfg.token !== 'YOUR_BOT_TOKEN_HERE') {
        Logger.info('Token loaded from config.json');
        return cfg.token;
      }
    } catch { /* ignore parse errors */ }
  }

  // Try .env
  try {
    require('dotenv').config();
  } catch { /* dotenv not installed, fine */ }

  if (process.env.DISCORD_TOKEN) {
    Logger.info('Token loaded from environment variable');
    return process.env.DISCORD_TOKEN;
  }

  Logger.error('No token found! Set token in config.json or DISCORD_TOKEN env var.');
  process.exit(1);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const token = loadToken();
  const db = new Database();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // Initialize feed manager
  const feedManager = new FeedManager(client, db);

  // Load commands
  const commands = loadCommands(db, feedManager);
  client.commands = new Collection();
  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  // ─── Register Slash Commands ─────────────────────────────────────────────
  client.once('ready', async () => {
    Logger.info(`Logged in as ${client.user.tag}`);
    client.user.setActivity('social media feeds', { type: ActivityType.Watching });

    // Register slash commands globally
    const rest = new REST({ version: '10' }).setToken(token);
    const commandData = commands.map(c => c.data.toJSON());

    try {
      Logger.info(`Registering ${commandData.length} slash commands...`);
      await rest.put(Routes.applicationCommands(client.user.id), { body: commandData });
      Logger.info('Slash commands registered successfully');
    } catch (err) {
      Logger.error('Failed to register commands:', err);
    }

    // Start feed polling
    feedManager.startPolling();
    Logger.info('Feed polling started');
  });

  // ─── Handle Slash Commands ───────────────────────────────────────────────
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      Logger.error(`Command ${interaction.commandName} error:`, err);
      const reply = {
        content: '❌ An error occurred while executing this command.',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  // ─── Graceful Shutdown ───────────────────────────────────────────────────
  const shutdown = () => {
    Logger.info('Shutting down...');
    feedManager.stopPolling();
    db.close();
    client.destroy();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // ─── Login ───────────────────────────────────────────────────────────────
  await client.login(token);
}

main().catch(err => {
  Logger.error('Fatal error:', err);
  process.exit(1);
});
