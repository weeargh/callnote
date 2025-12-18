
import fs from 'fs';
import path from 'path';

// Manual env loading
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
        console.log('Loaded .env.local');
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

async function testToggle() {
    const apiKey = process.env.MEETINGBAAS_API_KEY;
    if (!apiKey) {
        console.error('❌ MEETINGBAAS_API_KEY is missing');
        return;
    }

    // 1. Fetch Calendars
    const calListRes = await fetch('https://api.meetingbaas.com/v2/calendars', {
        headers: { 'x-meeting-baas-api-key': apiKey }
    });
    const calData = await calListRes.json();
    const calendar = (calData.data || calData)[0];
    const calendarId = calendar?.calendar_id || calendar?.id;

    if (!calendarId) {
        console.error('❌ No calendar found');
        return;
    }
    console.log('Using Calendar ID:', calendarId);

    // 2. Fetch Events
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 3);
    const eventsUrl = new URL(`https://api.meetingbaas.com/v2/calendars/${calendarId}/events`);
    eventsUrl.searchParams.set('start_time', now.toISOString());
    eventsUrl.searchParams.set('end_time', endDate.toISOString());

    const eventsRes = await fetch(eventsUrl.toString(), {
        headers: { 'x-meeting-baas-api-key': apiKey }
    });
    const eventsData = await eventsRes.json();
    const events = eventsData.data || eventsData.events || eventsData;

    if (!events || events.length === 0) {
        console.log('⚠️ No events found to test toggle');
        return;
    }

    const event = events[0];
    const eventId = event.event_id || event.id;
    console.log('Testing on Event:', event.title || event.summary, `(${eventId})`);
    console.log('Current bot_scheduled:', event.bot_scheduled);

    // 3. Try API Variant 2: /calendar-events/{id}/bot
    console.log('🔻 Attempting to UNSCHEDULE bot (Variant 2)...');
    const deleteUrl2 = `https://api.meetingbaas.com/v2/calendar-events/${eventId}/bot`;
    const deleteRes2 = await fetch(deleteUrl2, {
        method: 'DELETE',
        headers: { 'x-meeting-baas-api-key': apiKey }
    });

    console.log(`DELETE status: ${deleteRes2.status}`);
    if (deleteRes2.ok) {
        console.log('✅ Unscheduled successfully');
    } else {
        console.log('❌ Failed to unschedule:', await deleteRes2.text());
    }

    // 4. Try POST Variant 2
    console.log('fw Attempting to SCHEDULE bot (Variant 2)...');
    const postUrl2 = `https://api.meetingbaas.com/v2/calendar-events/${eventId}/bot`;
    const postRes2 = await fetch(postUrl2, {
        method: 'POST',
        headers: {
            'x-meeting-baas-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log(`POST status: ${postRes2.status}`);
    if (postRes2.ok) {
        console.log('✅ Scheduled successfully');
        console.log('Response:', await postRes2.json());
    } else {
        console.log('❌ Failed to schedule:', await postRes2.text());
    }

    // 5. Try Variant 3: Trailing Slash
    console.log('🔻 Attempting to UNSCHEDULE bot (Variant 3: Trailing Slash)...');
    const deleteUrl3 = `https://api.meetingbaas.com/v2/calendar-events/${eventId}/bot/`;
    const deleteRes3 = await fetch(deleteUrl3, {
        method: 'DELETE',
        headers: { 'x-meeting-baas-api-key': apiKey }
    });

    console.log(`DELETE status: ${deleteRes3.status}`);
    if (deleteRes3.ok) {
        console.log('✅ Unscheduled successfully');
    } else {
        console.log('❌ Failed to unschedule:', await deleteRes3.text());
    }

    // 6. Try POST Variant 3
    console.log('fw Attempting to SCHEDULE bot (Variant 3: Trailing Slash)...');
    const postUrl3 = `https://api.meetingbaas.com/v2/calendar-events/${eventId}/bot/`;
    const postRes3 = await fetch(postUrl3, {
        method: 'POST',
        headers: {
            'x-meeting-baas-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log(`POST status: ${postRes3.status}`);
    if (postRes3.ok) {
        console.log('✅ Scheduled successfully');
        console.log('Response:', await postRes3.json());
    } else {
        console.log('❌ Failed to schedule:', await postRes3.text());
    }

    // 7. Try Variant 4: PATCH
    console.log('🔻 Attempting to UNSCHEDULE bot (Variant 4: PATCH)...');
    const patchUrl = `https://api.meetingbaas.com/v2/calendar-events/${eventId}`;
    const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
            'x-meeting-baas-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bot_scheduled: false })
    });

    console.log(`PATCH status: ${patchRes.status}`);
    if (patchRes.ok) {
        console.log('✅ Patched successfully');
        console.log('Response:', await patchRes.json());
    } else {
        console.log('❌ Failed to patch:', await patchRes.text());
    }

    // 3. Try to DELETE (Unschedule)
    console.log('🔻 Attempting to UNSCHEDULE bot...');
    const deleteUrl = `https://api.meetingbaas.com/v2/calendars/${calendarId}/events/${eventId}/bot`;
    const deleteRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'x-meeting-baas-api-key': apiKey }
    });

    console.log(`DELETE status: ${deleteRes.status}`);
    if (deleteRes.ok) {
        console.log('✅ Unscheduled successfully');
    } else {
        console.log('❌ Failed to unschedule:', await deleteRes.text());
    }

    // 4. Try to POST (Schedule)
    console.log('fw Attempting to SCHEDULE bot...');
    const postUrl = `https://api.meetingbaas.com/v2/calendars/${calendarId}/events/${eventId}/bot`;
    const postRes = await fetch(postUrl, {
        method: 'POST',
        headers: {
            'x-meeting-baas-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Body might need config
    });

    console.log(`POST status: ${postRes.status}`);
    if (postRes.ok) {
        console.log('✅ Scheduled successfully');
        console.log('Response:', await postRes.json());
    } else {
        console.log('❌ Failed to schedule:', await postRes.text());
    }
}

testToggle();
