require('dotenv').config();
const DashboardService = require('./src/services/dashboard.service');

async function testTicketVolume() {
    console.log("--- Testing DashboardService.getTicketVolume ---");
    try {
        const result = await DashboardService.getTicketVolume();
        console.log("Success! Result keys:", Object.keys(result));
        console.log("Status counts:", result.by_status);

        console.log("\n--- Testing DashboardService.getAdvancedReporting ---");
        const start = Date.now();
        const advanced = await DashboardService.getAdvancedReporting();
        const duration = Date.now() - start;
        console.log(`Success! Advanced Reporting fetched in ${duration}ms`);
        console.log("Summary:", advanced.summary);
    } catch (err) {
        console.error("DIAGNOSTIC-FAILURE:", err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        process.exit();
    }
}

testTicketVolume();
