import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { Player } from 'discord-player';

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

export const player = new Player(client);
// Options are now configured per-request or globally via extractors


// We'll load extractors later in the entry point
