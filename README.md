# Cyber Bot

A Discord bot for tracking student progress, awarding points, managing leaderboards, and sending scheduled announcements.

## Tech Stack

- **Runtime:** Node.js
- **Bot Framework:** discord.js v14
- **Database:** MongoDB / Mongoose-based models
- **Scheduler:** node-cron
- **Environment Config:** dotenv
- **Supabase Integration:** @supabase/supabase-js
- **External APIs:** googleapis

## Project Structure

- `index.js` - Bot entry point
- `commands/` - Slash command handlers
- `events/` - Discord event listeners
- `models/` - Data models
- `services/` - Background services like scheduling and YouTube logic
- `utils/` - Shared helpers
- `scripts/` - Maintenance and admin scripts

## Main Features

- Track progress updates in a dedicated channel
- Award points for activity
- Send daily announcements and reminders
- Maintain member and progress records
- Register and manage slash commands

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your bot token and API keys.
3. Start the bot:
   ```bash
   npm start
   ```

## Notes

- The bot is designed to run as a long-lived process.
- Keep secrets out of source control and rotate any exposed keys immediately.
