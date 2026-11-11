import { 
    Interaction, 
    TextInputStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    ActionRowBuilder, 
    ModalActionRowComponentBuilder,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { db } from '@/db';
import { privateRooms, guildConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { handleMute, handleDelete, handleStats } from '../commands/handlers';
import { handleSetup } from '../commands/setup';
import { handlePlay } from '../commands/music';

export async function handleInteraction(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // Получаем конфиг сервера
        const config = interaction.guildId ? await db.query.guildConfigs.findFirst({
            where: eq(guildConfigs.guildId, interaction.guildId),
        }) : null;

        // Команды только для админов (можно использовать в любом канале)
        const adminOnlyCommands = ['муте', 'делит', 'сетап'];
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
                        interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers);

        // Проверяем: если есть канал команд и пользователь НЕ админ — разрешаем только в том канале
        if (config?.commandsChannelId && !isAdmin && !adminOnlyCommands.includes(commandName)) {
            if (interaction.channelId !== config.commandsChannelId) {
                return interaction.reply({
                    content: `❌ Команды можно использовать только в <#${config.commandsChannelId}>`,
                    ephemeral: true
                });
            }
        }

        if (commandName === 'сетап') {
            await interaction.reply({ content: 'Начинаю настройку...', ephemeral: true });
            await handleSetup(interaction.guild!);
            await interaction.followUp({ content: '✅ Настройка завершена!', ephemeral: true });
        } else if (commandName === 'муте') {
            await handleMute(interaction);
        } else if (commandName === 'делит') {
            await handleDelete(interaction);
        } else if (commandName === 'стата') {
            await handleStats(interaction);
        } else if (commandName === 'плей') {
            await handlePlay(interaction);
        }
    }

    if (interaction.isButton()) {
        const { customId, member, guild, channelId } = interaction;
        if (!customId.startsWith('room_')) return;

        const room = await db.query.privateRooms.findFirst({
            where: eq(privateRooms.channelId, channelId!),
        });

        if (!room || room.ownerId !== member?.user.id) {
            return interaction.reply({ content: 'Вы не владелец этой комнаты!', ephemeral: true });
        }

        const channel = guild?.channels.cache.get(channelId!) as any;
        if (!channel || channel.type !== ChannelType.GuildVoice) return;

        switch (customId) {
            case 'room_rename': {
                const modal = new ModalBuilder()
                    .setCustomId('modal_room_rename')
                    .setTitle('Изменить название');
                const input = new TextInputBuilder()
                    .setCustomId('new_name')
                    .setLabel('Новое название')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(32);
                modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(input));
                return interaction.showModal(modal);
            }
            case 'room_lock': {
                const isLocked = channel.permissionOverwrites.cache.get(guild?.id)?.deny.has(PermissionFlagsBits.Connect);
                await channel.permissionOverwrites.edit(guild?.id, { Connect: isLocked ? null : false });
                return interaction.reply({ content: isLocked ? 'Комната открыта' : 'Комната закрыта', ephemeral: true });
            }
            case 'room_limit': {
                const modal = new ModalBuilder()
                    .setCustomId('modal_room_limit')
                    .setTitle('Изменить лимит');
                const input = new TextInputBuilder()
                    .setCustomId('new_limit')
                    .setLabel('Лимит (0-99)')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(2);
                modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(input));
                return interaction.showModal(modal);
            }
            case 'room_visibility': {
                const isHidden = channel.permissionOverwrites.cache.get(guild?.id)?.deny.has(PermissionFlagsBits.ViewChannel);
                await channel.permissionOverwrites.edit(guild?.id, { ViewChannel: isHidden ? null : false });
                return interaction.reply({ content: isHidden ? 'Комната теперь видна' : 'Комната скрыта', ephemeral: true });
            }
            case 'room_info': {
                const embed = new EmbedBuilder()
                    .setTitle('Информация о комнате')
                    .addFields(
                        { name: 'Владелец', value: `<@${room.ownerId}>`, inline: true },
                        { name: 'Название', value: channel.name, inline: true },
                        { name: 'Лимит', value: `${channel.userLimit || 'Без лимита'}`, inline: true },
                    )
                    .setColor('#FF00FF');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            // Other buttons like ban/kick/mute would need a user select menu or modal
            default:
                return interaction.reply({ content: 'Эта функция пока не реализована полностью.', ephemeral: true });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_room_rename') {
            const newName = interaction.fields.getTextInputValue('new_name');
            const channel = interaction.guild?.channels.cache.get(interaction.channelId!) as any;
            await channel?.setName(newName);
            return interaction.reply({ content: `Название изменено на ${newName}`, ephemeral: true });
        }
        if (interaction.customId === 'modal_room_limit') {
            const limitStr = interaction.fields.getTextInputValue('new_limit');
            const limit = parseInt(limitStr);
            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ content: 'Некорректный лимит', ephemeral: true });
            }
            const channel = interaction.guild?.channels.cache.get(interaction.channelId!) as any;
            await channel?.setUserLimit(limit);
            return interaction.reply({ content: `Лимит изменен на ${limit}`, ephemeral: true });
        }
    }
}
