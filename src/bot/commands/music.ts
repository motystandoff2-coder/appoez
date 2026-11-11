import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { player } from '../client';

export async function handlePlay(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true);
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
        return interaction.reply({ content: 'Вы должны быть в голосовом канале!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
        const { track } = await player.play(member.voice.channel, query, {
            nodeOptions: {
                metadata: interaction
            }
        });

        return interaction.followUp(`🎶 Добавлено в очередь: **${track.title}**`);
    } catch (e) {
        return interaction.followUp(`❌ Ошибка: ${(e as any).message}`);
    }
}
