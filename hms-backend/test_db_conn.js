const { Client } = require('pg');

// Parse the connection string from the .env file format or hardcode for testing based on user input
// DATABASE_URL="postgresql://postgres:vani%40123@localhost:5432/taskforce-vani?schema=public"
const connectionString = "postgresql://postgres:vani%40123@localhost:5432/postgres"; // Connect to default 'postgres' db first

const client = new Client({
    connectionString: connectionString,
});

async function checkConnection() {
    try {
        console.log("Attempting to connect to PostgreSQL server...");
        await client.connect();
        console.log("Successfully connected to PostgreSQL server!");

        // Check if the target database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'taskforce-vani'");
        if (res.rows.length > 0) {
            console.log("Database 'taskforce-vani' already exists.");
        } else {
            console.log("Database 'taskforce-vani' does not exist.");
            console.log("Attempting to create database 'taskforce-vani'...");
            try {
                await client.query('CREATE DATABASE "taskforce-vani"');
                console.log("Successfully created database 'taskforce-vani'!");
            } catch (createErr) {
                console.error("Error creating database:", createErr.message);
            }
        }
    } catch (err) {
        console.error("Connection error details:", err);
        console.error("Connection error message:", err.message);
        console.error("Connection error code:", err.code);
    } finally {
        await client.end();
    }
}

checkConnection();
