const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Subscribe to a social media feed in this channel')
  .addStringOption(opt =>
    opt.setName('url')
      .setDescription('Social media URL or username (e.g., @username, https://instagram.com/user)')
      .setRequired(true)
  )
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel to post feed updates (default: current channel)')
      .addChannelTypes(ChannelType.GuildText)
  )
  .addStringOption(opt =>
    opt.setName('platform')
      .setDescription('Force platform (if auto-detection fails)')
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
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

module.exports = {
  data,

  async execute(interaction) {
    const { feedManager } = global._bot;
    await interaction.deferReply({ ephemeral: true });

    const url = interaction.options.getString('url');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const platform = interaction.options.getString('platform');

    const result = await feedManager.addFeed(interaction.guildId, channel.id, url, platform);

    if (result.success) {
      const status = result.testPassed ? '✅ Feed verified and active!' : '⚠️ Added but feed test failed — it may take a few minutes to start working.';
      const lines = [
        '**' + status + '**',
        '> **Platform:** ' + result.platform,
        '> **Username:** ' + result.username,
        '> **Channel:** <#' + channel.id + '>',
        '',
        'The bot will check for new posts every 5 minutes and post updates with HD media.',
      ];
      await interaction.editReply({ content: lines.join('\n') });
    } else {
      await interaction.editReply({ content: '❌ **Error:** ' + result.error });
    }
  },
};
