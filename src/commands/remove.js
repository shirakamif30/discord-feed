const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a feed subscription')
  .addIntegerOption(opt =>
    opt.setName('id')
      .setDescription('Feed ID to remove (use /list to see IDs)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

module.exports = {
  data,

  async execute(interaction) {
    const { feedManager } = global._bot;
    await interaction.deferReply({ ephemeral: true });

    const feedId = interaction.options.getInteger('id');
    const result = feedManager.removeFeed(interaction.guildId, feedId);

    if (result.success) {
      await interaction.editReply({
        content: '✅ **Feed removed!**\n> **Platform:** ' + result.feed.platform + '\n> **Username:** ' + result.feed.username,
      });
    } else {
      await interaction.editReply({ content: '❌ **Error:** ' + result.error });
    }
  },
};
