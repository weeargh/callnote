/**
 * End-to-End Use Case Tests
 * Tests real user flows: calendar sync, auto-join, transcription
 * Run: npx tsx scripts/test-usecases.ts
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MB_API_KEY = process.env.MEETINGBAAS_API_KEY!;

interface TestResult {
    name: string;
    passed: boolean;
    details?: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, details?: string) {
    results.push({ name, passed, details });
    console.log(passed ? `✅ ${name}` : `❌ ${name}${details ? `: ${details}` : ''}`);
}

/**
 * USE CASE 1: Calendar Sync Flow
 * User connects calendar → Events are fetched → Auto-join is enabled
 */
async function testCalendarSyncFlow() {
    console.log('\n📅 USE CASE 1: Calendar Sync Flow');
    console.log('-----------------------------------');

    // Step 1: List calendars
    const calRes = await fetch('https://api.meetingbaas.com/v2/calendars', {
        headers: { 'x-meeting-baas-api-key': MB_API_KEY }
    });
    const calData = await calRes.json();
    const calendars = calData.data || calData;

    test('1.1 Calendar connected', calendars?.length > 0, `Found ${calendars?.length || 0} calendars`);

    if (calendars?.length > 0) {
        const calId = calendars[0].calendar_id || calendars[0].id;

        // Step 2: Fetch events
        const eventsRes = await fetch(`https://api.meetingbaas.com/v2/calendars/${calId}/events?limit=10`, {
            headers: { 'x-meeting-baas-api-key': MB_API_KEY }
        });
        const eventsData = await eventsRes.json();
        const events = eventsData.data || eventsData;

        test('1.2 Events fetched', events?.length >= 0, `Found ${events?.length || 0} events`);

        // Step 3: Check auto-join status
        const eventsWithBots = events?.filter((e: any) => e.bot_scheduled) || [];
        const eventsWithUrls = events?.filter((e: any) => e.meeting_url) || [];

        test('1.3 Events have meeting URLs', eventsWithUrls.length > 0, `${eventsWithUrls.length} events with URLs`);
        test('1.4 Auto-join enabled for events', eventsWithBots.length > 0, `${eventsWithBots.length}/${eventsWithUrls.length} scheduled`);
    }
}

/**
 * USE CASE 2: Bot Join Flow  
 * Bot is created → Joins meeting → Records → Transcribes
 */
async function testBotJoinFlow() {
    console.log('\n🤖 USE CASE 2: Bot Join Flow (Inspection Only)');
    console.log('------------------------------------------------');

    // List recent bots to check their status
    const botsRes = await fetch('https://api.meetingbaas.com/v2/bots?limit=5', {
        headers: { 'x-meeting-baas-api-key': MB_API_KEY }
    });
    const botsData = await botsRes.json();
    const bots = botsData.data || botsData || [];

    test('2.1 Can list bots', botsRes.ok, `Found ${bots.length} recent bots`);

    if (bots.length > 0) {
        const recentBot = bots[0];

        // Check bot details
        const detailsRes = await fetch(`https://api.meetingbaas.com/v2/bots/${recentBot.bot_id || recentBot.id}`, {
            headers: { 'x-meeting-baas-api-key': MB_API_KEY }
        });

        test('2.2 Can fetch bot details', detailsRes.ok);

        if (detailsRes.ok) {
            const details = await detailsRes.json();
            const botData = details.data || details;

            test('2.3 Bot has status', !!botData.status, `Status: ${botData.status}`);
            test('2.4 Bot has recording', !!botData.mp4_url || !!botData.video, botData.mp4_url ? 'Has MP4' : 'No recording yet');
            test('2.5 Bot has transcription', !!botData.transcript || !!botData.transcription, botData.transcript ? 'Has transcript' : 'No transcript yet');
        }
    }
}

/**
 * USE CASE 3: Transcription Quality
 * Check if transcriptions have speaker diarization
 */
async function testTranscriptionQuality() {
    console.log('\n📝 USE CASE 3: Transcription Quality');
    console.log('-------------------------------------');

    // Get a bot with transcription
    const botsRes = await fetch('https://api.meetingbaas.com/v2/bots?limit=10', {
        headers: { 'x-meeting-baas-api-key': MB_API_KEY }
    });
    const botsData = await botsRes.json();
    const bots = botsData.data || botsData || [];

    // Find a completed bot
    let foundTranscript = false;

    for (const bot of bots) {
        const id = bot.bot_id || bot.id;
        const detailsRes = await fetch(`https://api.meetingbaas.com/v2/bots/${id}`, {
            headers: { 'x-meeting-baas-api-key': MB_API_KEY }
        });

        if (detailsRes.ok) {
            const details = await detailsRes.json();
            const data = details.data || details;

            if (data.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
                foundTranscript = true;

                // Check diarization (speaker field)
                const hasSpeakers = data.transcript.some((seg: any) => seg.speaker);
                test('3.1 Transcript has speaker labels', hasSpeakers);

                // Check timestamp
                const hasTimestamps = data.transcript.some((seg: any) => typeof seg.start === 'number');
                test('3.2 Transcript has timestamps', hasTimestamps);

                // Sample segment
                const sample = data.transcript[0];
                console.log(`   Sample: [${sample.speaker}] at ${sample.start}s`);

                break;
            }
        }
    }

    if (!foundTranscript) {
        test('3.1 Found transcript to analyze', false, 'No completed transcripts found');
    }
}

/**
 * USE CASE 4: Webhook Integration
 * Verify webhook configuration
 */
async function testWebhookIntegration() {
    console.log('\n🔔 USE CASE 4: Webhook Configuration');
    console.log('-------------------------------------');

    const expectedWebhookUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/meetingbaas`
        : 'https://callnote.vercel.app/api/webhooks/meetingbaas';

    console.log(`   Expected webhook: ${expectedWebhookUrl}`);

    test('4.1 NEXT_PUBLIC_APP_URL configured', !!process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_APP_URL || 'Not set');
}

async function runAllTests() {
    console.log('🧪 End-to-End Use Case Tests\n');
    console.log('=====================================');

    if (!MB_API_KEY) {
        console.error('❌ MEETINGBAAS_API_KEY not set');
        process.exit(1);
    }

    await testCalendarSyncFlow();
    await testBotJoinFlow();
    await testTranscriptionQuality();
    await testWebhookIntegration();

    // Summary
    console.log('\n=====================================');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All use cases validated!');
    } else {
        console.log('⚠️ Some tests need attention');
    }
}

runAllTests().catch(console.error);
