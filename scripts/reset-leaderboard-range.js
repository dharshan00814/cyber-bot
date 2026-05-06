#!/usr/bin/env node
const Member = require('../models/Member');
const { getSupabaseClient, isSupabaseConfigured } = require('../utils/supabaseStore');

async function run() {
  if (!isSupabaseConfigured()) {
    console.error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY in database.json or env.');
    process.exitCode = 2;
    return;
  }

  const args = process.argv.slice(2);
  const startRank = parseInt(args[0], 10) || 18; // 1-based
  const endRank = parseInt(args[1], 10) || 32; // inclusive

  if (startRank < 1 || endRank < startRank) {
    console.error('Invalid rank range. Usage: node reset-leaderboard-range.js [startRank] [endRank]');
    process.exitCode = 2;
    return;
  }

  try {
    const members = await Member.find().exec();
    if (!members || members.length === 0) {
      console.log('No members found.');
      return;
    }

    members.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

    const toReset = members.slice(startRank - 1, endRank);
    if (toReset.length === 0) {
      console.log(`No members found in ranks ${startRank}..${endRank}`);
      return;
    }

    console.log(`Resetting XP for ranks ${startRank}..${startRank + toReset.length - 1} (${toReset.length} members)`);

    for (const member of toReset) {
      const before = member.xp ?? 0;
      member.xp = 0;
      await member.save();
      console.log(`- ${member.name || member.userId} (${member.userId}): ${before} -> 0`);
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error resetting leaderboard range:', err.message || err);
    process.exitCode = 1;
  }
}

run();
