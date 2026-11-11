import { NextResponse } from 'next/server';

declare global {
    var botStarted: boolean | undefined;
}

export async function GET() {
    if (!global.botStarted) {
        // Use dynamic import to avoid blocking the main thread during build or early start
        import('@/bot/main').then(() => {
            console.log('Bot process started from API call');
        }).catch(err => {
            console.error('Failed to start bot:', err);
        });
        global.botStarted = true;
        return NextResponse.json({ status: 'Starting bot...' });
    }
    return NextResponse.json({ status: 'Bot already running' });
}
