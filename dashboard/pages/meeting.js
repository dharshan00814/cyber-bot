const pageMeeting = {
    meetingStatus: { active: false },
    channels: [],
    voices: [],
    pollTimer: null,
    sessions: [],
    recognition: null,
    isListening: false,
    currentAudio: null,

    async load() {
        this.bindEvents();
        await Promise.all([
            this.fetchVoices(),
            this.fetchChannels(),
            this.fetchStatus(),
            this.fetchHistory(),
        ]);
        this.startLivePolling();
    },

    bindEvents() {
        const joinBtn = document.getElementById('meeting-join-btn');
        if (joinBtn && !joinBtn.dataset.bound) {
            joinBtn.dataset.bound = 'true';
            joinBtn.addEventListener('click', () => this.handleJoin());
        }

        const leaveBtn = document.getElementById('meeting-leave-btn');
        if (leaveBtn && !leaveBtn.dataset.bound) {
            leaveBtn.dataset.bound = 'true';
            leaveBtn.addEventListener('click', () => this.handleLeave());
        }

        const stopBtn = document.getElementById('meeting-stop-btn');
        if (stopBtn && !stopBtn.dataset.bound) {
            stopBtn.dataset.bound = 'true';
            stopBtn.addEventListener('click', () => this.handleStopSpeaking());
        }

        const testTtsBtn = document.getElementById('meeting-test-tts-btn');
        if (testTtsBtn && !testTtsBtn.dataset.bound) {
            testTtsBtn.dataset.bound = 'true';
            testTtsBtn.addEventListener('click', () => this.handleTestTts());
        }
    },



    startLivePolling() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(async () => {
            // Only poll status if meeting section is visible
            const section = document.getElementById('page-meeting');
            if (section && section.classList.contains('active')) {
                await this.fetchStatus(true);
            }
        }, 2000);
    },

    async fetchVoices() {
        try {
            const data = await api.get('/dashboard/meeting/voices');
            this.voices = data.voices || [];
            const select = document.getElementById('meeting-voice-select');
            if (select) {
                select.innerHTML = this.voices.map(v =>
                    `<option value="${v.id}" ${v.id === data.currentVoice ? 'selected' : ''}>${v.name}</option>`
                ).join('');
            }
        } catch (err) {
            console.warn('[Meeting] Error fetching voices:', err.message);
        }
    },

    async fetchChannels() {
        try {
            const data = await api.get('/dashboard/meeting/channels');
            this.channels = data.channels || [];
            const select = document.getElementById('meeting-channel-select');
            if (select) {
                if (this.channels.length === 0) {
                    select.innerHTML = '<option value="">No voice channels found in server</option>';
                } else {
                    select.innerHTML = '<option value="">Select a voice channel to join...</option>' +
                        this.channels.map(c =>
                            `<option value="${c.id}">🔊 ${c.name} (${c.membersCount} in room)</option>`
                        ).join('');
                }
            }
        } catch (err) {
            console.warn('[Meeting] Error fetching channels:', err.message);
        }
    },

    async fetchStatus(isBackground = false) {
        try {
            const data = await api.get('/dashboard/meeting/status');
            this.meetingStatus = data;
            this.renderStatusUI();
        } catch (err) {
            if (!isBackground) {
                console.error('[Meeting] Error fetching status:', err);
            }
        }
    },

    async fetchHistory() {
        try {
            const data = await api.get('/dashboard/meeting/history');
            this.sessions = data.sessions || [];
            this.renderHistoryUI();
        } catch (err) {
            console.warn('[Meeting] Error fetching meeting history:', err.message);
        }
    },

    renderStatusUI() {
        const s = this.meetingStatus;
        const isActive = !!s.active;

        // Banner elements
        const statusBadge = document.getElementById('meeting-status-badge');
        const channelName = document.getElementById('meeting-active-channel-name');
        const timerEl = document.getElementById('meeting-timer');
        const attendeeCountEl = document.getElementById('meeting-attendee-count');
        const botSpeakingEl = document.getElementById('meeting-bot-speaking-indicator');
        const joinBtn = document.getElementById('meeting-join-btn');
        const leaveBtn = document.getElementById('meeting-leave-btn');
        const channelSelect = document.getElementById('meeting-channel-select');

        if (statusBadge) {
            statusBadge.className = isActive ? 'badge badge-success' : 'badge badge-warning';
            statusBadge.innerHTML = isActive
                ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;animation:pulse 1.5s infinite;"></span> LIVE IN MEETING'
                : 'IDLE (NOT IN VOICE)';
        }

        if (channelName) {
            channelName.textContent = isActive ? `🔊 ${s.channelName}` : 'None';
        }

        if (timerEl) {
            if (isActive && s.elapsedSeconds !== undefined) {
                const mins = Math.floor(s.elapsedSeconds / 60);
                const secs = s.elapsedSeconds % 60;
                timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                timerEl.textContent = '00:00';
            }
        }

        if (attendeeCountEl) {
            attendeeCountEl.textContent = isActive ? (s.participantCount || 0) : 0;
        }

        if (botSpeakingEl) {
            if (isActive && s.isBotSpeaking) {
                botSpeakingEl.style.display = 'inline-flex';
                botSpeakingEl.innerHTML = '🔊 Bot is Speaking...';
            } else {
                botSpeakingEl.style.display = 'none';
            }
        }

        if (joinBtn) joinBtn.disabled = isActive;
        if (leaveBtn) leaveBtn.disabled = !isActive;
        const stopBtn = document.getElementById('meeting-stop-btn');
        if (stopBtn) stopBtn.disabled = !isActive;
        if (channelSelect && isActive && s.channelId) {
            channelSelect.value = s.channelId;
            channelSelect.disabled = true;
        } else if (channelSelect) {
            channelSelect.disabled = false;
        }

        this.renderParticipantsUI();
        this.renderTranscriptsUI();
    },

    renderParticipantsUI() {
        const grid = document.getElementById('meeting-participants-grid');
        if (!grid) return;

        const s = this.meetingStatus;
        const participants = (s && s.participants) || [];

        if (!s.active || participants.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--text-secondary); background: rgba(255,255,255,0.02); border-radius: 8px;">
                    <div style="font-size: 28px; margin-bottom: 8px;">🎧</div>
                    <p style="margin: 0; font-weight: 500;">No active voice participants</p>
                    <span style="font-size: 13px;">Connect the bot to a voice channel to start tracking participant audio & speaking activity.</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = participants.map(p => {
            const isSpeaking = !!p.isSpeaking;
            const spokenSecs = Math.round((p.totalSpokenMs || 0) / 1000);
            const avatarUrl = p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName || p.username)}&background=00d4ff&color=fff`;

            return `
                <div class="participant-card ${isSpeaking ? 'speaking-active' : ''}" style="
                    background: var(--surface-secondary, rgba(255,255,255,0.03));
                    border: 1px solid ${isSpeaking ? 'rgba(0, 212, 255, 0.8)' : 'var(--border-color, rgba(255,255,255,0.08))'};
                    box-shadow: ${isSpeaking ? '0 0 16px rgba(0, 212, 255, 0.3)' : 'none'};
                    border-radius: 10px;
                    padding: 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.2s ease;
                ">
                    <div style="position: relative;">
                        <img src="${avatarUrl}" alt="${p.displayName}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid ${isSpeaking ? '#00d4ff' : 'transparent'};">
                        ${isSpeaking ? `<span style="position:absolute; bottom:-2px; right:-2px; width:12px; height:12px; background:#10b981; border-radius:50%; border:2px solid #1a1a24; animation:pulse 1s infinite;"></span>` : ''}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <h4 style="margin: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">
                                ${p.displayName || p.username}
                            </h4>
                            <span class="badge ${isSpeaking ? 'badge-success' : 'badge-info'}" style="font-size: 10px; padding: 2px 6px;">
                                ${isSpeaking ? 'Speaking 🎙️' : 'Listening 👂'}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 10px;">
                            <span>⏱️ ${spokenSecs}s spoken</span>
                            <span>🗣️ ${p.speakCount || 0} turns</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderTranscriptsUI() {
        const container = document.getElementById('meeting-transcripts-feed');
        if (!container) return;

        const s = this.meetingStatus;
        const transcripts = (s && s.recentTranscripts) || [];

        if (transcripts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <span style="font-size: 26px; display: block; margin-bottom: 6px;">💬</span>
                    <p style="margin:0;">No speech detected yet.</p>
                    <span style="font-size: 12px;">When students or teachers speak in the voice meeting, live transcripts and doubt clarifications appear here in real time.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = transcripts.map(t => {
            const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isDoubt = t.isDoubt || t.type === 'doubt';
            const isBot = t.userId === 'bot' || t.type === 'bot_greeting' || t.type === 'bot_farewell';
            const isTamil = /[\u0B80-\u0BFF]/.test(t.text) || (t.botAnswer && /[\u0B80-\u0BFF]/.test(t.botAnswer));

            return `
                <div style="
                    margin-bottom: 12px;
                    padding: 12px 14px;
                    border-radius: 8px;
                    background: ${isDoubt ? 'rgba(168, 85, 247, 0.08)' : (isBot ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)')};
                    border-left: 3px solid ${isDoubt ? '#a855f7' : (isBot ? '#00d4ff' : '#64748b')};
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 600; font-size: 13px; color: ${isBot ? '#00d4ff' : (isDoubt ? '#c084fc' : 'var(--text-primary)')};">
                            ${t.username || 'Speaker'} 
                            ${isDoubt ? '<span class="badge badge-warning" style="font-size:10px; margin-left:6px;">DOUBT / QUESTION</span>' : ''}
                            ${isTamil ? '<span class="badge badge-info" style="font-size:10px; margin-left:4px; background:rgba(0,212,255,0.2); border:1px solid rgba(0,212,255,0.4);">தமிழ் (Tamil)</span>' : ''}
                        </span>
                        <span style="font-size: 11px; color: var(--text-secondary);">${timeStr}</span>
                    </div>
                    <div style="font-size: 13.5px; line-height: 1.4; color: var(--text-primary);">
                        ${t.text}
                    </div>
                    ${t.botAnswer ? `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 13px; color: #10b981;">
                            <strong style="color: #34d399;">🤖 Cyber Bot Spoke ${isTamil ? '(தமிழ் குரல்)' : ''}:</strong> "${t.botAnswer}"
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Auto-scroll to bottom of transcripts
        container.scrollTop = container.scrollHeight;
    },

    renderHistoryUI() {
        const tbody = document.getElementById('meeting-history-tbody');
        if (!tbody) return;

        if (this.sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No past meeting sessions recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = this.sessions.map(sess => {
            const dateStr = new Date(sess.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            const mins = Math.floor((sess.durationSeconds || 0) / 60);
            const secs = (sess.durationSeconds || 0) % 60;
            const participantsCount = Array.isArray(sess.participants) ? sess.participants.length : 0;
            const transcriptsCount = Array.isArray(sess.transcripts) ? sess.transcripts.length : 0;

            return `
                <tr>
                    <td><strong>${sess.channelName || 'Voice Meeting'}</strong></td>
                    <td>${dateStr}</td>
                    <td>${mins}m ${secs}s</td>
                    <td><span class="badge badge-info">${participantsCount} attendees</span></td>
                    <td><span class="badge badge-success">${transcriptsCount} entries</span></td>
                </tr>
            `;
        }).join('');
    },

    async handleJoin() {
        const select = document.getElementById('meeting-channel-select');
        const channelId = select ? select.value : '';
        const voiceSelect = document.getElementById('meeting-voice-select');
        const voice = voiceSelect ? voiceSelect.value : null;

        if (!channelId) {
            app.toast('Please select a voice channel to join.', 'warning');
            return;
        }

        const joinBtn = document.getElementById('meeting-join-btn');
        if (joinBtn) {
            joinBtn.disabled = true;
            joinBtn.textContent = 'Connecting...';
        }

        try {
            app.toast('Connecting Cyber Bot to voice meeting...', 'info');
            const res = await api.post('/dashboard/meeting/join', { channelId, voice });
            app.toast(res.message || 'Connected to voice meeting successfully!', 'success');
            await this.fetchStatus();
        } catch (err) {
            console.error('Join meeting error:', err);
            app.toast(err.message || 'Failed to join voice channel', 'error');
        } finally {
            if (joinBtn) {
                joinBtn.textContent = '🎙️ Join Meeting';
                joinBtn.disabled = this.meetingStatus.active;
            }
        }
    },

    async handleLeave() {
        const leaveBtn = document.getElementById('meeting-leave-btn');
        if (leaveBtn) {
            leaveBtn.disabled = true;
            leaveBtn.textContent = 'Leaving...';
        }

        try {
            app.toast('Concluding voice meeting and saving session...', 'info');
            const res = await api.post('/dashboard/meeting/leave');
            app.toast(res.message || 'Meeting concluded.', 'success');
            await Promise.all([this.fetchStatus(), this.fetchHistory()]);
        } catch (err) {
            console.error('Leave meeting error:', err);
            app.toast(err.message || 'Failed to leave meeting', 'error');
        } finally {
            if (leaveBtn) {
                leaveBtn.textContent = '🚪 Leave Meeting';
                leaveBtn.disabled = !this.meetingStatus.active;
            }
        }
    },

    async handleStopSpeaking() {
        try {
            app.toast('Stopping speech immediately...', 'info');
            const res = await api.post('/dashboard/meeting/stop');
            app.toast(res.message || 'Stopped speaking.', 'success');
            await this.fetchStatus();
        } catch (err) {
            console.error('Stop speaking error:', err);
            app.toast(err.message || 'Failed to stop speaking', 'error');
        }
    },

    playAudio(url) {
        if (!url) return;
        try {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            }
            this.currentAudio = new Audio(url);
            this.currentAudio.play().catch(e => {
                console.warn('[Meeting] Audio play notice:', e.message);
            });
        } catch (e) {
            console.warn('[Meeting] Audio play error:', e);
        }
    },

    async handleTestTts() {
        const voiceSelect = document.getElementById('meeting-voice-select');
        const voice = voiceSelect ? voiceSelect.value : null;

        const btn = document.getElementById('meeting-test-tts-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Testing...';
        }

        try {
            app.toast('Testing text-to-speech voice synthesis...', 'info');
            const testText = 'Hello! I am Cyber Bot. Speech to text and text to speech are active and ready.';
            const res = await api.post('/dashboard/meeting/test-tts', {
                text: testText,
                voice,
            });
            app.toast(res.message || 'TTS voice verified successfully!', 'success');
            // Play test audio directly in browser
            const audioUrl = `/api/dashboard/meeting/tts-audio?text=${encodeURIComponent(testText)}&voice=${encodeURIComponent(voice || 'en-US-ChristopherNeural')}`;
            this.playAudio(audioUrl);
        } catch (err) {
            console.error('Test TTS error:', err);
            app.toast(err.message || 'Failed to test TTS', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔊 Test Voice';
            }
        }
    },
};

window.pageMeeting = pageMeeting;
