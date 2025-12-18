
import fs from 'fs';
import path from 'path';

// Manual env loading since dotenv might not be in package.json
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // simple unquote
                process.env[key] = value;
            }
        });
        console.log('Loaded .env.local');
    } else {
        console.log('No .env.local found');
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

async function checkMeetingBaas() {
    const apiKey = process.env.MEETINGBAAS_API_KEY;
    if (!apiKey) {
        console.error('❌ MEETINGBAAS_API_KEY is missing in .env.local');
        return;
    }

    console.log('Testing MeetingBaas Connection...');
    try {
        const response = await fetch('https://api.meetingbaas.com/v2/calendars', {
            headers: { 'x-meeting-baas-api-key': apiKey }
        });

        if (response.ok) {
            const data = await response.json();
            const calendars = data.data || data;
            console.log('✅ Connection Successful!');
            console.log('Status:', response.status);
            console.log('Calendars found:', calendars.length);
            // console.log('Raw response:', JSON.stringify(data, null, 2));

            if (calendars.length > 0) {
                const calId = calendars[0].calendar_id || calendars[0].id; // MeetingBaas API might vary
                console.log('Testing Event Fetch for Calendar ID:', calId);

                const now = new Date();
                const endDate = new Date(now);
                endDate.setDate(now.getDate() + 3);

                const eventsUrl = new URL(`https://api.meetingbaas.com/v2/calendars/${calId}/events`);
                eventsUrl.searchParams.set('start_time', now.toISOString());
                eventsUrl.searchParams.set('end_time', endDate.toISOString());
                eventsUrl.searchParams.set('limit', '5');

                const eventRes = await fetch(eventsUrl.toString(), {
                    headers: { 'x-meeting-baas-api-key': apiKey }
                });

                if (eventRes.ok) {
                    const eventData = await eventRes.json();
                    console.log('✅ Events Fetch Successful!');
                    console.log('Events found:', (eventData.data || eventData).length);
                    // console.log('First event:', eventData.data?.[0] || 'None');
                } else {
                    console.error('❌ Events Fetch Failed');
                    console.error('Status:', eventRes.status);
                    console.error('Body:', await eventRes.text());
                }
            }

        } else {
            console.error('❌ Connection Failed');
            console.error('Status:', response.status);
            console.error('Body:', await response.text());
        }
    } catch (error) {
        console.error('❌ Request Error:', error);
    }
}

checkMeetingBaas();
