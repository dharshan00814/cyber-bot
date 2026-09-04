# Cyber Bot

A Discord bot for tracking student progress, awarding points, managing leaderboards, and sending scheduled announcements.

## Tech Stack

- **Runtime:** Node.js
- **Bot Framework:** discord.js v14
- **Database:** MongoDB / Mongoose-based models
- **Scheduler:** node-cron
- **Environment Config:** dotenv
- **Supabase Integration:** @supabase/supabase-js
- **External APIs:** googleapis, @whiskeysockets/baileys (WhatsApp Web Multi-Device)

## Project Structure

- `index.js` - Bot and dashboard server entry point
- `commands/` - Slash command handlers
- `events/` - Discord event listeners
- `models/` - Data models (Member, Progress, Attendance, Announcement, Settings)
- `services/` - Background services like scheduling, YouTube logic, and WhatsApp service
- `dashboard/` - Web dashboard UI for managing students, attendance, announcements, and WhatsApp group reminders
- `utils/` - Shared helpers
- `scripts/` - Maintenance and admin scripts

## Main Features

- Track progress updates in a dedicated channel
- Award points for activity and maintain streaks
- Send scheduled announcements to Discord channels
- **WhatsApp Group Reminders**:
  - Connect your WhatsApp account directly via QR code on the Dashboard
  - List and select participating WhatsApp groups automatically
  - Send instant reminder alerts to groups with one click or custom templates
  - Scheduled daily group reminders via background cron jobs
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
