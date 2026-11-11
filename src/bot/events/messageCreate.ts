import { Message } from 'discord.js';
import { db } from '@/db';
import { userStats } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function handleMessageCreate(message: Message) {
    if (message.author.bot || !message.guild) return;

    await db.insert(userStats).values({
        userId: message.author.id,
        guildId: message.guild.id,
        messageCount: 1,
    }).onConflictDoUpdate({
        target: userStats.userId,
        set: {
            messageCount: sql`${userStats.messageCount} + 1`
        }
    });
}
