import { VoiceState, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { db } from '@/db';
import { guildConfigs, privateRooms, userStats } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const { member, guild } = newState;
    if (!member || member.user.bot) return;

    const config = await db.query.guildConfigs.findFirst({
        where: eq(guildConfigs.guildId, guild.id),
    });

    if (!config) return;

    const logChannel = config.logsChannelId ? guild.channels.cache.get(config.logsChannelId) : null;

    // --- Voice Logging ---
    if (logChannel?.isTextBased()) {
        const embed = new EmbedBuilder().setTimestamp();

        if (!oldState.channelId && newState.channelId) {
            // Joined
            embed.setTitle('🎶 Зашёл в голосовой')
                .setColor('#2ecc71')
                .setDescription(`**Игрок:** <@${member.id}> | ${member.user.tag}\n**Канал:** <#${newState.channelId}>`);
            await (logChannel as any).send({ embeds: [embed] });
        } else if (oldState.channelId && !newState.channelId) {
            // Left
            embed.setTitle('🎶 Вышел из голосового')
                .setColor('#e74c3c')
                .setDescription(`**Игрок:** <@${member.id}> | ${member.user.tag}\n**Канал:** <#${oldState.channelId}>`);
            await (logChannel as any).send({ embeds: [embed] });
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            // Moved
            embed.setTitle('🎶 Перешёл в другой канал')
                .setColor('#3498db')
                .setDescription(`**Игрок:** <@${member.id}> | ${member.user.tag}\n**Канал:** <#${oldState.channelId}> → <#${newState.channelId}>`);
            await (logChannel as any).send({ embeds: [embed] });
        }
    }

    // --- Private Room Generation ---
    if (newState.channelId === config.generatorChannelId) {
        const privateChannel = await guild.channels.create({
            name: `🏠 • ${member.displayName}`,
            type: ChannelType.GuildVoice,
            parent: config.categoryId || undefined,
            permissionOverwrites: [
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers],
                }
            ]
        });

        await member.voice.setChannel(privateChannel);

        await db.insert(privateRooms).values({
            channelId: privateChannel.id,
            ownerId: member.id,
            guildId: guild.id,
        });
    }

    // --- Cleanup Empty Private Rooms ---
    if (oldState.channelId) {
        const room = await db.query.privateRooms.findFirst({
            where: eq(privateRooms.channelId, oldState.channelId),
        });

        if (room) {
            const channel = guild.channels.cache.get(oldState.channelId);
            if (channel?.isVoiceBased() && channel.members.size === 0) {
                await channel.delete();
                await db.delete(privateRooms).where(eq(privateRooms.channelId, oldState.channelId));
            }
        }
    }

    // --- Stats: Voice Time ---
    const now = new Date();
    if (!oldState.channelId && newState.channelId) {
        // Just joined voice, record start time
        await db.insert(userStats).values({
            userId: member.id,
            guildId: guild.id,
            lastVoiceJoin: now,
        }).onConflictDoUpdate({
            target: userStats.userId,
            set: { lastVoiceJoin: now }
        });
    } else if (oldState.channelId && !newState.channelId) {
        // Left voice, calculate duration
        const stats = await db.query.userStats.findFirst({
            where: eq(userStats.userId, member.id),
        });

        if (stats?.lastVoiceJoin) {
            const diffMs = now.getTime() - stats.lastVoiceJoin.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            await db.update(userStats)
                .set({ 
                    voiceMinutes: (stats.voiceMinutes || 0) + diffMins,
                    lastVoiceJoin: null 
                })
                .where(eq(userStats.userId, member.id));
        }
    }
}
