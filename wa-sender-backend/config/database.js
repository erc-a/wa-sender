const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import memory database fallback
const memoryDb = require('./memory-db');

// Supabase configuration 
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// PostgreSQL connection configuration
// We'll define two sets of connection parameters: local and remote
const localDbConfig = process.env.LOCAL_DB_HOST ? {
    host: process.env.LOCAL_DB_HOST,
    port: process.env.LOCAL_DB_PORT || 5432,
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME || 'postgres',
    ssl: process.env.LOCAL_DB_SSL === 'true'
} : null;

const remoteDbConfig = process.env.DB_HOST ? {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    // For Supabase, we need SSL with rejectUnauthorized: false
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
} : null;

// We'll try the local connection first, then remote if available
const primaryConfig = localDbConfig || remoteDbConfig;
const fallbackConfig = localDbConfig && remoteDbConfig ? remoteDbConfig : null;

console.log('Primary database configuration:', {
    host: primaryConfig?.host,
    user: primaryConfig?.user,
    database: primaryConfig?.database,
    ssl: primaryConfig?.ssl ? 'enabled' : 'disabled'
});

let supabase = null;
let pool = null;

// Function to try connecting to a database
const tryConnect = async (config) => {
    if (!config) return null;
    
    try {
        console.log(`Attempting to connect to PostgreSQL at ${config.host}...`);
        
        // DNS pre-check for Supabase connections
        if (config.host.includes('supabase.co')) {
            try {
                const dns = require('dns').promises;
                const result = await dns.lookup(config.host);
                console.log(`DNS resolution for ${config.host}: ${result.address}`);
            } catch (dnsErr) {
                console.error(`DNS lookup failed for ${config.host}:`, dnsErr.message);
                console.log('This likely means the Supabase hostname is incorrect or your network cannot reach it.');
                // Continue anyway - the connection will fail but with more detail
            }
        }
        
        const testPool = new Pool({
            ...config,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000 // Increased timeout for Supabase
        });
        
        // Test the connection
        await testPool.query('SELECT 1');
        console.log(`Successfully connected to PostgreSQL at ${config.host}`);
        return testPool;
    } catch (err) {
        console.error(`Connection to ${config.host} failed:`, err.message);
        
        // More detailed debugging for common Supabase issues
        if (config.host.includes('supabase.co')) {
            if (err.message.includes('getaddrinfo ENOTFOUND')) {
                console.error('Could not resolve Supabase hostname. Please check:');
                console.error('1. Your Supabase project ID is correct');
                console.error('2. You have internet connectivity');
                console.error('3. The Supabase domain is accessible from your network');
            } else if (err.code === '28P01') {
                console.error('Password authentication failed. For Supabase direct connections:');
                console.error('1. Use the database password from Supabase dashboard > Settings > Database');
                console.error('2. Make sure you\'re not using your Supabase API key as the database password');
            }
        }
        
        return null;
    }
};

// Create a Supabase client for authentication, storage, and realtime features
try {
    if (SUPABASE_URL && SUPABASE_KEY) {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase client initialized');
    }
} catch (err) {
    console.error('Failed to initialize Supabase client:', err);
}

// First try with local config
try {
    console.log('Trying to connect to database...');
    // Just use in-memory database by default to ensure the app works
    pool = memoryDb;
    console.log('Using in-memory database by default');
    
    // Create PostgreSQL connection pool for direct database queries
    if (primaryConfig) {
        console.log(`Attempting to connect to primary database at ${primaryConfig.host}...`);
        
        const primaryPool = new Pool(primaryConfig);
        
        // Test connection asynchronously but don't block app startup
        primaryPool.query('SELECT 1')
            .then(() => {
                console.log(`Successfully connected to primary database at ${primaryConfig.host}`);
                pool = primaryPool;
                console.log('Switched to PostgreSQL database');
            })
            .catch(err => {
                console.error('Primary database connection failed:', err.message);
                
                // Try fallback if available
                if (fallbackConfig) {
                    console.log('Trying fallback database connection...');
                    
                    // Create pool with fallback config
                    const fallbackPool = new Pool(fallbackConfig);
                    
                    fallbackPool.query('SELECT 1')
                        .then(() => {
                            console.log(`Successfully connected to fallback database at ${fallbackConfig.host}`);
                            pool = fallbackPool;
                            console.log('Switched to fallback PostgreSQL database');
                        })
                        .catch(fallbackErr => {
                            console.error('Fallback database connection also failed:', fallbackErr.message);
                            console.log('Using in-memory database as fallback');
                            // Keep using the in-memory database (already set)
                        });
                }
            });
    }
    
} catch (err) {
    console.error('Error initializing database connections, using in-memory database:', err);    // Use in-memory database as fallback
    pool = memoryDb;
    console.log('Using in-memory database fallback due to initialization error');
}

// Function to create database schema if it doesn't exist
const createDatabaseSchema = async (dbPool) => {
    try {
        console.log('Reading database schema from file...');
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '..', 'database.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.error('Schema file not found at', schemaPath);
            return;
        }
        
        const sql = fs.readFileSync(schemaPath, 'utf8');
        console.log('Executing schema creation queries...');
        
        // Execute SQL script
        const queries = sql.split(';')
            .filter(q => q.trim().length > 0)
            .map(q => q.trim());
            
        for(const query of queries) {
            try {
                await dbPool.query(query);
                console.log('Successfully executed query:', query.substring(0, 50) + '...');
            } catch (qErr) {
                console.error('Error executing query:', qErr.message);
                console.error('Failed query:', query);
                // Continue with other queries
            }
        }
        
        console.log('Database schema creation completed');
    } catch (err) {
        console.error('Failed to create database schema:', err);
    }
};

// Test connection using promise-based API
const testConnection = async () => {
    try {
        if (!pool.query) {
            console.error('Database pool not initialized properly');
            return;
        }
        
        // Check if we're using in-memory database
        if (pool === memoryDb) {
            console.log('Using in-memory database (PostgreSQL connection unavailable)');
            console.log('In-memory database is active with sample data for development');
        } else {
            try {
                const result = await pool.query('SELECT 1');
                console.log('Successfully connected to PostgreSQL database');
                
                // Get PostgreSQL version for debugging
                try {
                    const versionResult = await pool.query('SELECT version()');
                    console.log('PostgreSQL version:', versionResult.rows[0].version);
                    
                    // Check if messages table exists
                    const tableCheck = await pool.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public'
                            AND table_name = 'messages'
                        )
                    `);
                    
                    if (!tableCheck.rows[0].exists) {
                        console.log('Messages table does not exist. Creating schema...');
                        await createDatabaseSchema(pool);
                    } else {
                        console.log('Messages table exists in database');
                    }
                } catch (versionErr) {
                    console.error('Could not get PostgreSQL version:', versionErr.message);
                }
            } catch (dbErr) {
                console.error('PostgreSQL Connection Error:', dbErr);
                if (dbErr.code === '28000' || dbErr.code === '28P01') {
                    console.error('Access denied. Check your username and password.');
                } else if (dbErr.code === 'ECONNREFUSED') {
                    console.error('Database connection refused. Is PostgreSQL running?');
                } else if (dbErr.code === '3D000') {
                    console.error('Database does not exist');
                }
                
                // Switch to in-memory database
                console.log('Switching to in-memory database due to connection error');
                pool = memoryDb;
            }
        }
          // Test Supabase connection if available
        if (supabase) {
            try {
                // First test if we can access the Supabase API at all
                const { data: healthData, error: healthError } = await supabase.from('_availability').select('*');
                
                if (healthError) {
                    console.error('Supabase API connectivity issue:', healthError);
                } else {
                    // Now test the specific table we need
                    const { data, error } = await supabase.from('messages').select('count(*)', { count: 'exact', head: true });
                    
                    if (error) {
                        console.error('Supabase table access issue:', error);
                        
                        // Check if the table doesn't exist
                        if (error.message && error.message.includes('does not exist')) {
                            console.log('The messages table does not exist in Supabase. You may need to run migrations.');
                        }
                    } else {
                        console.log('Successfully connected to Supabase');
                    }
                }
            } catch (supErr) {
                console.error('Supabase Connection Error:', supErr);
            }
        } else {
            console.log('Supabase client not initialized');
        }
    } catch (err) {
        console.error('General connection test error:', err);
        // Don't exit process here, let the application handle the error
    }
};

// Run the test but don't block startup
testConnection();

// Export both PostgreSQL pool and Supabase client
module.exports = {
    pool,
    supabase
};
