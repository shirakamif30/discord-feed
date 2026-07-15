const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('test')
  .setDescription('Test a social media feed without subscribing')
  .addStringOption(opt =>
    opt.setName('url')
      .setDescription('Social media URL or username to test')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('platform')
      .setDescription('Force platform')
      .addChoices(
        { name: 'Instagram', value: 'instagram' },
        { name: 'Facebook', value: 'facebook' },
        { name: 'Twitter/X', value: 'twitter' },
        { name: 'YouTube', value: 'youtube' },
        { name: 'TikTok', value: 'tiktok' },
        { name: 'Reddit', value: 'reddit' },
        { name: 'Threads', value: 'threads' },
        { name: 'RSS Feed', value: 'rss' },
      )
  );

module.exports = {
  data,

  async execute(interaction) {
    const { feedManager } = global._bot;
    await interaction.deferReply({ ephemeral: true });

    const url = interaction.options.getString('url');
    const platform = interaction.options.getString('platform');
    const result = await feedManager.testFeed(url, platform);

    if (result.success) {
      const lines = [
        '✅ **Feed Test Successful!**',
        '> **Platform:** ' + result.platform,
        '> **Username:** ' + result.username,
        '> **Items found:** ' + result.itemCount,
        '> **Has media:** ' + (result.hasMedia ? 'Yes 📷' : 'No'),
        '> **Sample:** ' + (result.sampleTitle ? result.sampleTitle.slice(0, 100) : 'N/A'),
        '',
        'Use `/add` to subscribe to this feed!',
      ];
      await interaction.editReply({ content: lines.join('\n') });
    } else {
      await interaction.editReply({ content: '❌ **Feed Test Failed:** ' + result.error });
    }
  },
};
