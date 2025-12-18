
import { filterEventsNextNDays, sortEventsAscending, CalendarEvent } from '../utils/calendar-utils'

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

async function runTests() {
    console.log('🧪 Running Calendar Utils Unit Tests...');

    // Test 1: Sort Events
    console.log('\nTest 1: Sorting Events');
    const unsortedEvents: CalendarEvent[] = [
        { id: '1', start_time: '2025-12-20T10:00:00Z' },
        { id: '2', start_time: '2025-12-18T10:00:00Z' },
        { id: '3', start_time: '2025-12-19T10:00:00Z' },
    ];
    const sorted = sortEventsAscending(unsortedEvents);
    assert(sorted[0].id === '2', 'First event should be 2 (Dec 18)');
    assert(sorted[1].id === '3', 'Second event should be 3 (Dec 19)');
    assert(sorted[2].id === '1', 'Third event should be 1 (Dec 20)');

    // Test 2: Filter Next 3 Days
    // Note: We need to mock "Date" or adjust logic, but utils use "new Date()".
    // Since we can't easily mock global Date in this script without overhead,
    // we will construct events relative to "real now".
    console.log('\nTest 2: Filter Next 3 Days');
    const now = new Date();

    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const today = new Date(now); today.setHours(now.getHours() + 1);
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);

    const testEvents: CalendarEvent[] = [
        { id: 'past', start_time: yesterday.toISOString() }, // Should be excluded ? logic is >= now
        { id: 'today', start_time: today.toISOString() },    // Included
        { id: 'tomorrow', start_time: tomorrow.toISOString() }, // Included
        { id: 'future', start_time: nextWeek.toISOString() }, // Excluded
    ];

    // Filter next 3 days
    const filtered = filterEventsNextNDays(testEvents, 3);

    // Check IDs
    const ids = filtered.map(e => e.id);
    assert(!ids.includes('past'), 'Should not include past event'); // Logic: >= now
    assert(ids.includes('today'), 'Should include today event');
    assert(ids.includes('tomorrow'), 'Should include tomorrow event');
    assert(!ids.includes('future'), 'Should not include future event (next week)');

    console.log('\n🎉 All Unit Tests Passed!');
}

runTests().catch(console.error);
