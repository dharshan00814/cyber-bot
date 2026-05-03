const connectDB = async () => {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        console.log('Supabase configuration loaded successfully!');
        return;
    }

    console.warn('Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in .env.');
};

module.exports = connectDB;
