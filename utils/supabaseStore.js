const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

const databaseConfigPath = path.join(__dirname, '..', 'database.json');

function readDatabaseJson() {
    if (!fs.existsSync(databaseConfigPath)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(databaseConfigPath, 'utf8'));
    } catch (error) {
        console.error('Error reading database.json:', error.message);
        return {};
    }
}

function getSupabaseConfig() {
    const databaseConfig = readDatabaseJson();

    return {
        url: process.env.SUPABASE_URL || databaseConfig.SUPABASE_URL || databaseConfig.supabaseUrl || '',
        key: process.env.SUPABASE_KEY || databaseConfig.SUPABASE_KEY || databaseConfig.supabaseKey || '',
    };
}

function isSupabaseConfigured() {
    const config = getSupabaseConfig();
    return Boolean(config.url && config.key);
}

function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    const config = getSupabaseConfig();

    if (!config.url || !config.key) {
        return null;
    }

    supabaseClient = createClient(config.url, config.key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return supabaseClient;
}

function toComparableValue(value) {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }

    if (value === null || value === undefined) {
        return value;
    }

    const dateValue = new Date(value);
    if (!Number.isNaN(dateValue.getTime())) {
        return dateValue.getTime();
    }

    return value;
}

function compareValues(left, right, direction = 1) {
    const leftComparable = toComparableValue(left);
    const rightComparable = toComparableValue(right);

    if (leftComparable === rightComparable) {
        return 0;
    }

    if (leftComparable === undefined || leftComparable === null) {
        return -1 * direction;
    }

    if (rightComparable === undefined || rightComparable === null) {
        return 1 * direction;
    }

    if (typeof leftComparable === 'number' && typeof rightComparable === 'number') {
        return (leftComparable - rightComparable) * direction;
    }

    return String(leftComparable).localeCompare(String(rightComparable)) * direction;
}

function sortRecords(records, sortSpec) {
    if (!sortSpec || typeof sortSpec !== 'object') {
        return records;
    }

    const sortEntries = Object.entries(sortSpec);

    return records.slice().sort((left, right) => {
        for (const [field, directionValue] of sortEntries) {
            const comparison = compareValues(left[field], right[field], directionValue >= 0 ? 1 : -1);
            if (comparison !== 0) {
                return comparison;
            }
        }

        return 0;
    });
}

function matchesFilter(record, filter = {}) {
    return Object.entries(filter).every(([field, expectedValue]) => {
        const actualValue = record[field];

        if (expectedValue && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
            if (Object.prototype.hasOwnProperty.call(expectedValue, '$gte')) {
                return toComparableValue(actualValue) >= toComparableValue(expectedValue.$gte);
            }

            if (Object.prototype.hasOwnProperty.call(expectedValue, '$lte')) {
                return toComparableValue(actualValue) <= toComparableValue(expectedValue.$lte);
            }

            if (Object.prototype.hasOwnProperty.call(expectedValue, '$in')) {
                return expectedValue.$in.includes(actualValue);
            }
        }

        return actualValue === expectedValue;
    });
}

function createQuery(executor) {
    const state = {
        sortSpec: null,
        limitCount: null,
    };

    const query = {
        sort(sortSpec) {
            state.sortSpec = sortSpec;
            return query;
        },
        limit(limitCount) {
            state.limitCount = limitCount;
            return query;
        },
        populate() {
            return query;
        },
        async exec() {
            let records = await executor();

            if (state.sortSpec) {
                records = sortRecords(records, state.sortSpec);
            }

            if (typeof state.limitCount === 'number') {
                records = records.slice(0, state.limitCount);
            }

            return records;
        },
        then(resolve, reject) {
            return query.exec().then(resolve, reject);
        },
        catch(reject) {
            return query.exec().catch(reject);
        },
    };

    return query;
}

async function fetchTableRows(tableName) {
    const client = getSupabaseClient();

    if (!client) {
        throw new Error('Supabase is not configured');
    }

    const { data, error } = await client.from(tableName).select('*');

    if (error) {
        throw error;
    }

    return data || [];
}

function normalizeDate(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = {
    getSupabaseClient,
    isSupabaseConfigured,
    createQuery,
    fetchTableRows,
    matchesFilter,
    normalizeDate,
};