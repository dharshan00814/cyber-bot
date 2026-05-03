const connectDB = async () => {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        console.log('✅ Supabase configured and ready!');
        return;
    }

    console.warn('⚠️  Warning: SUPABASE_URL and SUPABASE_KEY not set. Database features will not work.');
};

module.exports = connectDB;
