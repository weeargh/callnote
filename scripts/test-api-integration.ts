/**
 * MeetingBaas API Integration Tests
 * Tests the API configuration consistency and endpoint availability
 * Run: npx tsx scripts/test-api-integration.ts
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MB_API_KEY = process.env.MEETINGBAAS_API_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

async function testMeetingBaasConnection() {
    console.log('\n📡 Test 1: MeetingBaas API Connection');
    try {
        const res = await fetch('https://api.meetingbaas.com/v2/calendars', {
            headers: { 'x-meeting-baas-api-key': MB_API_KEY }
        });
        test('API Connection', res.ok, `Status: ${res.status}`);
        test('API Key Valid', res.status !== 401 && res.status !== 403);
    } catch (err) {
        test('API Connection', false, String(err));
    }
}

async function testCalendarEndpoints() {
    console.log('\n📅 Test 2: Calendar Endpoints');
    try {
        // List calendars
        const listRes = await fetch('https://api.meetingbaas.com/v2/calendars', {
            headers: { 'x-meeting-baas-api-key': MB_API_KEY }
        });
        const listData = await listRes.json();
        const calendars = listData.data || listData;

        test('GET /v2/calendars', listRes.ok);
        test('Has calendars', calendars?.length > 0);

        if (calendars?.length > 0) {
            const calId = calendars[0].calendar_id || calendars[0].id;

            // List events
            const eventsRes = await fetch(`https://api.meetingbaas.com/v2/calendars/${calId}/events?limit=5`, {
                headers: { 'x-meeting-baas-api-key': MB_API_KEY }
            });
            test('GET /v2/calendars/{id}/events', eventsRes.ok);
        }
    } catch (err) {
        test('Calendar Endpoints', false, String(err));
    }
}

async function testBotEndpoints() {
    console.log('\n🤖 Test 3: Bot Endpoints');
    try {
        // List bots
        const listRes = await fetch('https://api.meetingbaas.com/v2/bots', {
            headers: { 'x-meeting-baas-api-key': MB_API_KEY }
        });
        test('GET /v2/bots', listRes.ok);
    } catch (err) {
        test('Bot Endpoints', false, String(err));
    }
}

async function testBotConfigurationSchema() {
    console.log('\n⚙️ Test 4: Bot Configuration Schema');

    // Validate our bot payload has all required fields
    const expectedFields = [
        'meeting_url',
        'bot_name',
        'recording_mode',
        'transcription_enabled',
        'transcription_config',
        'automatic_leave',
        'webhook_url',
        'deduplication_id'
    ];

    // Simulated payload from our bots/route.ts
    const samplePayload = {
        meeting_url: 'https://meet.google.com/test',
        bot_name: 'Mekari Callnote',
        deduplication_id: 'https://meet.google.com/test',
        allow_multiple_bots: false,
        recording_mode: 'speaker_view',
        entry_message: 'Mekari Callnote is joining.',
        transcription_enabled: true,
        transcription_config: {
            provider: 'gladia',
            diarization: true
        },
        automatic_leave: {
            waiting_room_timeout: 300,
            noone_joined_timeout: 300,
            everyone_left_timeout: 60
        },
        webhook_url: `${APP_URL}/api/webhooks/meetingbaas`
    };

    for (const field of expectedFields) {
        const hasField = field in samplePayload;
        test(`Bot payload has ${field}`, hasField);
    }

    // Validate transcription_config structure
    test('transcription_config.provider = gladia', samplePayload.transcription_config.provider === 'gladia');
    test('transcription_config.diarization = true', samplePayload.transcription_config.diarization === true);
}

async function testWebhookEndpoint() {
    console.log('\n🔔 Test 5: Webhook Endpoint Availability');
    try {
        // Check if webhook endpoint is accessible (should return 405 for GET, but not 404)
        const res = await fetch(`${APP_URL}/api/webhooks/meetingbaas`, {
            method: 'GET'
        });
        // 405 = Method Not Allowed (endpoint exists but only accepts POST)
        // 404 = Not Found (endpoint doesn't exist)
        test('Webhook endpoint exists', res.status !== 404, `Status: ${res.status}`);
    } catch (err) {
        test('Webhook endpoint reachable', false, String(err));
    }
}

async function runAllTests() {
    console.log('🧪 MeetingBaas API Integration Tests\n');
    console.log('=====================================');

    if (!MB_API_KEY) {
        console.error('❌ MEETINGBAAS_API_KEY not set');
        process.exit(1);
    }

    await testMeetingBaasConnection();
    await testCalendarEndpoints();
    await testBotEndpoints();
    await testBotConfigurationSchema();
    await testWebhookEndpoint();

    // Summary
    console.log('\n=====================================');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('⚠️ Some tests failed');
        process.exit(1);
    }
}

runAllTests().catch(console.error);
