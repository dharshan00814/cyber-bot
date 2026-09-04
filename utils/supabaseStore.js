const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

const databaseConfigPath = path.join(__dirname, '..', 'database.json');
const localDbPath = path.join(__dirname, '..', 'utils', 'localStore.json');

function initLocalStore() {
    if (!fs.existsSync(localDbPath)) {
        const initialData = {
            members: [
                {
                    id: 'm-1',
                    user_id: '123456789012345678',
                    name: 'Alex Developer',
                    role: 'organizer',
                    join_date: new Date(Date.now() - 30 * 86400000).toISOString(),
                    activity_score: 15,
                    streak: 5,
                    last_active_date: new Date().toISOString(),
                    xp: 250,
                    completed_tasks: []
                },
                {
                    id: 'm-2',
                    user_id: '234567890123456789',
                    name: 'Sarah Connor',
                    role: 'advanced',
                    join_date: new Date(Date.now() - 20 * 86400000).toISOString(),
                    activity_score: 12,
                    streak: 3,
                    last_active_date: new Date().toISOString(),
                    xp: 190,
                    completed_tasks: []
                },
                {
                    id: 'm-3',
                    user_id: '345678901234567890',
                    name: 'John Doe',
                    role: 'beginner',
                    join_date: new Date(Date.now() - 10 * 86400000).toISOString(),
                    activity_score: 8,
                    streak: 2,
                    last_active_date: new Date().toISOString(),
                    xp: 80,
                    completed_tasks: []
                }
            ],
            progress: [
                {
                    id: 'p-1',
                    user_id: '123456789012345678',
                    date: new Date().toISOString(),
                    text: 'Completed chapter 3 cyber security challenge and documented writeup'
                },
                {
                    id: 'p-2',
                    user_id: '234567890123456789',
                    date: new Date(Date.now() - 3600000).toISOString(),
                    text: 'Solved SQL injection room on TryHackMe with 100% flags'
                }
            ],
            attendance: [
                {
                    id: 'a-1',
                    member_id: '123456789012345678',
                    date: new Date().toISOString(),
                    status: 'present',
                    meeting_name: 'Daily Standup',
                    check_in_time: new Date().toISOString(),
                    notes: 'On time'
                },
                {
                    id: 'a-2',
                    member_id: '234567890123456789',
                    date: new Date().toISOString(),
                    status: 'present',
                    meeting_name: 'Daily Standup',
                    check_in_time: new Date().toISOString(),
                    notes: 'Attended remotely'
                }
            ],
            announcements: [
                {
                    id: 'ann-1',
                    title: 'Welcome to Cyber Bot!',
                    message: 'Welcome everyone! Daily progress tracking is active. Post your daily updates in the progress channel.',
                    channel_id: '',
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    created_by: 'system',
                    enable_notification: true
                }
            ],
            settings: [
                { id: 's-1', key: 'bot_prefix', value: '!', category: 'bot', updated_at: new Date().toISOString() },
                { id: 's-2', key: 'daily_xp_reward', value: '10', category: 'progress', updated_at: new Date().toISOString() },
                { id: 's-3', key: 'channels', value: JSON.stringify({ progress: '', announcement: '', general: '' }), category: 'channels', updated_at: new Date().toISOString() }
            ],
            playlists: []
        };
        try {
            fs.writeFileSync(localDbPath, JSON.stringify(initialData, null, 2), 'utf8');
        } catch (e) {
            console.error('Error creating localStore.json:', e.message);
        }
    }
}

function readLocalStore() {
    initLocalStore();
    try {
        return JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    } catch (error) {
        console.error('Error reading localStore.json:', error.message);
        return { members: [], progress: [], attendance: [], announcements: [], settings: [], playlists: [] };
    }
}

function writeLocalStore(data) {
    try {
        fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing localStore.json:', error.message);
    }
}

function getLocalTableRows(tableName) {
    const store = readLocalStore();
    return store[tableName] || [];
}

function syncToLocalStore(tableName, rows) {
    const store = readLocalStore();
    store[tableName] = rows;
    writeLocalStore(store);
}

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

    try {
        supabaseClient = createClient(config.url, config.key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
        return supabaseClient;
    } catch (err) {
        console.error('Error initializing Supabase client:', err.message);
        return null;
    }
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

function toSnakeCase(field) {
    return field
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1_$2')
        .toLowerCase();
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
        const actualValue = record[field] ?? record[toSnakeCase(field)];

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

    if (client) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Supabase query timeout')), 2500)
            );
            const queryPromise = client.from(tableName).select('*');
            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

            if (!error && Array.isArray(data)) {
                syncToLocalStore(tableName, data);
                return data;
            }
        } catch (err) {
            // Gracefully fall back to local store on network/DNS error
        }
    }

    return getLocalTableRows(tableName);
}

async function saveTableRow(tableName, row, id = null, conflictKey = null) {
    const client = getSupabaseClient();
    let savedRow = null;

    if (client) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Supabase save timeout')), 2500)
            );
            let query;
            if (id) {
                query = client.from(tableName).update(row).eq('id', id).select('*').single();
            } else if (conflictKey) {
                query = client.from(tableName).upsert(row, { onConflict: conflictKey }).select('*').single();
            } else {
                query = client.from(tableName).insert(row).select('*').single();
            }
            const { data, error } = await Promise.race([query, timeoutPromise]);
            if (!error && data) {
                savedRow = data;
            }
        } catch (err) {
            // Fall back to local store
        }
    }

    const store = readLocalStore();
    if (!store[tableName]) store[tableName] = [];
    const list = store[tableName];

    if (!savedRow) {
        const rowId = id || (tableName.slice(0, 3) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        savedRow = { ...row, id: rowId };
    }

    const existingIndex = list.findIndex(item => {
        if (id && (item.id === id || item._id === id)) return true;
        if (conflictKey && item[conflictKey] && item[conflictKey] === row[conflictKey]) return true;
        return false;
    });

    if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...savedRow };
    } else {
        list.push(savedRow);
    }
    writeLocalStore(store);

    return savedRow;
}

async function deleteTableRow(tableName, id) {
    const client = getSupabaseClient();
    if (client) {
        try {
            await client.from(tableName).delete().eq('id', id);
        } catch (err) {}
    }

    const store = readLocalStore();
    if (store[tableName]) {
        store[tableName] = store[tableName].filter(item => item.id !== id && item._id !== id);
        writeLocalStore(store);
    }
    return true;
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
    saveTableRow,
    deleteTableRow,
    matchesFilter,
    normalizeDate,
};