import { 
    ChannelType, 
    PermissionFlagsBits, 
    Guild, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    ColorResolvable
} from 'discord.js';
import { db } from '@/db';
import { guildConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleSetup(guild: Guild) {
    // 1. Create Roles
    const roles = [
        { name: 'Король', color: '#FFFF00' as ColorResolvable, permissions: [PermissionFlagsBits.Administrator] },
        { name: 'Почти Король', color: '#0000FF' as ColorResolvable, permissions: [PermissionFlagsBits.ManageMessages] },
        { name: 'Гуль', color: '#FF0000' as ColorResolvable, permissions: [] },
        { name: 'Пупоез', color: '#008000' as ColorResolvable, permissions: [] },
    ];

    const createdRoles = [];
    for (const roleData of roles) {
        let role = guild.roles.cache.find(r => r.name === roleData.name);
        if (!role) {
            role = await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions,
            });
        }
        createdRoles.push(role);
    }

    const kingRole = createdRoles.find(r => r.name === 'Король');
    const almostKingRole = createdRoles.find(r => r.name === 'Почти Король');

    // 2. Create Category
    const category = await guild.channels.create({
        name: 'COMMUNITY',
        type: ChannelType.GuildCategory,
    });

    // 3. Create Text Channels
    const generalChat = await guild.channels.create({
        name: 'общий-чат',
        type: ChannelType.GuildText,
        parent: category.id,
    });

    const voiceLogs = await guild.channels.create({
        name: 'voice-logs',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: kingRole!.id,
                allow: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: almostKingRole!.id,
                allow: [PermissionFlagsBits.ViewChannel],
            },
        ],
    });

    // 4. Create Voice Channels
    await guild.channels.create({
        name: 'Lobby',
        type: ChannelType.GuildVoice,
        parent: category.id,
    });

    for (let i = 1; i <= 4; i++) {
        await guild.channels.create({
            name: `Lobby 30 #${i}`,
            type: ChannelType.GuildVoice,
            userLimit: 30,
            parent: category.id,
        });
    }

    const generator = await guild.channels.create({
        name: 'Создать Комнату [+]',
        type: ChannelType.GuildVoice,
        parent: category.id,
    });

    // 5. Save config to DB
    await db.insert(guildConfigs).values({
        guildId: guild.id,
        logsChannelId: voiceLogs.id,
        generatorChannelId: generator.id,
        categoryId: category.id,
    }).onConflictDoUpdate({
        target: guildConfigs.guildId,
        set: {
            logsChannelId: voiceLogs.id,
            generatorChannelId: generator.id,
            categoryId: category.id,
        }
    });

    // 6. Send control panel to general chat (or a dedicated channel)
    const embed = new EmbedBuilder()
        .setTitle('🎶 Управление приватной комнатой')
        .setDescription(
            'Зайди в **Создать Комнату [+]** — бот сделает твой голосовой канал и перенесёт тебя в него.\n' +
            'Дальше настраивай его кнопками ниже.\n' +
            '✏️ - изменить название\n' +
            '🔒 - закрыть/открыть\n' +
            '🚫 - бан/разбан\n' +
            '⚡ - выгнать пользователя\n' +
            '👥 - изменить лимит\n' +
            '👁️ - скрыть/показать\n' +
            '🎙️ - мут/размут\n' +
            'ℹ️ - информация о комнате\n' +
            '**Кнопки работают только у владельца комнаты и только пока он в ней.**\n' +
            'Когда комната опустеет, она удалится сама.'
        )
        .setColor('#FF00FF');

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('room_rename').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('room_lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('room_ban').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('room_kick').setEmoji('⚡').setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('room_limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('room_visibility').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('room_mute').setEmoji('🎙️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('room_info').setEmoji('ℹ️').setStyle(ButtonStyle.Secondary),
    );

    await generalChat.send({ embeds: [embed], components: [row1, row2] });

    return { generalChat, voiceLogs, generator };
}
