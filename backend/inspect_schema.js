const db = require('./src/config/database');

async function inspect() {
    try {
        const result = await db.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role';
        `);
        console.log('Schema for users.role:');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Inspection failed:', err);
        process.exit(1);
    }
}

inspect();
