import { 
    ChatInputCommandInteraction, 
    GuildMember, 
    PermissionFlagsBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonInteraction
} from 'discord.js';
import ms, { StringValue } from 'ms';
import { db } from '@/db';
import { userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleMute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: 'У вас нет прав!', ephemeral: true });
    }

    const target = interaction.options.getMember('user') as GuildMember;
    const duration = interaction.options.getString('duration') as StringValue;
    const reason = interaction.options.getString('reason') || 'Нет причины';

    if (!target) return interaction.reply({ content: 'Пользователь не найден', ephemeral: true });

    try {
        const msDuration = ms(duration || '10m');
        await target.timeout(msDuration, reason);
        await interaction.reply({ content: `Пользователь ${target.user.tag} замучен на ${duration} по причине: ${reason}` });
    } catch (error) {
        await interaction.reply({ content: 'Ошибка при муте: ' + (error as any).message, ephemeral: true });
    }
}

export async function handleDelete(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== interaction.guild?.ownerId) {
        return interaction.reply({ content: 'Только владелец может использовать эту команду!', ephemeral: true });
    }

    await interaction.reply({ content: 'Удаление сервера...' });
    
    const channels = await interaction.guild.channels.fetch();
    for (const channel of channels.values()) {
        if (channel) await channel.delete().catch(() => {});
    }

    const roles = await interaction.guild.roles.fetch();
    for (const role of roles.values()) {
        if (role.name !== '@everyone' && !role.managed) {
            await role.delete().catch(() => {});
        }
    }
}

export async function handleStats(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') || interaction.user;
    
    const stats = await db.query.userStats.findFirst({
        where: eq(userStats.userId, target.id),
    });

    const member = await interaction.guild?.members.fetch(target.id);
    const joinedAt = member?.joinedAt || new Date();
    const now = new Date();
    const daysOnServer = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
        .setTitle(`Статистика пользователя ${target.tag}`)
        .addFields(
            { name: 'На сервере', value: `${daysOnServer} дней`, inline: true },
            { name: 'Сообщений', value: `${stats?.messageCount || 0}`, inline: true },
            { name: 'Минут в войсе', value: `${stats?.voiceMinutes || 0}`, inline: true },
        )
        .setColor('#00FF00')
        .setThumbnail(target.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
}
