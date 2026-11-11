import { client, player } from './client';
import { handleInteraction } from './events/interactionCreate';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate';
import { handleMessageCreate } from './events/messageCreate';
import { deployCommands } from './deploy-commands';
import { DefaultExtractors } from '@discord-player/extractor';

async function main() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error('DISCORD_TOKEN is missing');
        return;
    }

    // Load music extractors
    await player.extractors.loadMulti(DefaultExtractors);

    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
        deployCommands();
    });

    client.on('interactionCreate', handleInteraction);
    client.on('voiceStateUpdate', handleVoiceStateUpdate);
    client.on('messageCreate', handleMessageCreate);

    await client.login(token);
}

main().catch(console.error);
