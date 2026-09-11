import React, { useState } from 'react';
import { usePushNotification } from '../utils/usePushNotification';
import { SupabaseClient } from '@supabase/supabase-js';

interface NotificationButtonProps {
  supabaseClient?: SupabaseClient;
  vapidPublicKey?: string;
  userId?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({
  supabaseClient,
  vapidPublicKey,
  userId,
  className = '',
  onSuccess,
  onError,
}) => {
  const {
    state,
    isGranted,
    isDenied,
    isSubscribing,
    isSupported,
    error,
    enableNotifications,
  } = usePushNotification({
    supabaseClient,
    vapidPublicKey,
    userId,
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isSupported) {
    return null; // Gracefully hide on unsupported environments
  }

  const handleClick = async () => {
    if (isDenied) {
      setFeedback('Notifications are blocked. Please allow notifications in your browser settings.');
      return;
    }

    if (isGranted) {
      return;
    }

    const success = await enableNotifications();
    if (success) {
      setFeedback('Notifications successfully enabled!');
      if (onSuccess) onSuccess();
    } else if (error) {
      setFeedback(error);
      if (onError) onError(error);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
      {isGranted ? (
        <button
          type="button"
          disabled
          aria-label="Push notifications enabled"
          className={`btn-notification-enabled ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'default',
            opacity: 0.9,
          }}
        >
          <span>✓</span>
          <span>Notifications Enabled</span>
        </button>
      ) : isDenied ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            type="button"
            onClick={handleClick}
            className={`btn-notification-blocked ${className}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <span>🚫</span>
            <span>Notifications Blocked</span>
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Notifications are blocked. Please enable them in your browser settings.
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isSubscribing}
          aria-label="Enable browser push notifications"
          className={`btn-notification-prompt ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: '#00d4ff',
            color: '#0a0f1d',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isSubscribing ? 'wait' : 'pointer',
            boxShadow: '0 2px 8px rgba(0, 212, 255, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>🔔</span>
          <span>{isSubscribing ? 'Enabling Notifications...' : 'Enable Notifications'}</span>
        </button>
      )}

      {feedback && !isGranted && !isDenied && (
        <span style={{ fontSize: '12px', color: '#f59e0b' }}>{feedback}</span>
      )}
    </div>
  );
};

export default NotificationButton;
