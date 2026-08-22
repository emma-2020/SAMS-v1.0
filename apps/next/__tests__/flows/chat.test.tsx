// Flow test: sending a chat message. Chat is one of only two routes with
// full offline write support (queued + replayed, de-duped server-side via
// client_message_id — see CLAUDE.md's "Offline support" section and
// migration 022_chat_client_message_id.sql), so the exact sendMessage
// call — channel, body, and a generated client id — is worth locking down
// beyond the existing dashboard-root smoke tests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { chatApi } from '@sams/api';
import { useAuthStore } from '@sams/store';
import CoachChatPage from '../../app/dashboard/coach/chat/page';
import { makeSession, makeProfile } from '../../test/fixtures';

vi.mock('@sams/api', async () => {
  const { buildApiMock } = await import('../../test/apiMock');
  return buildApiMock();
});

vi.mock('next/navigation', async () => {
  const { buildNavigationMock } = await import('../../test/navigationMock');
  return buildNavigationMock();
});

vi.mock('@sams/store', async () => {
  const { buildStoreMock } = await import('../../test/storeMock');
  return buildStoreMock();
});

const CHANNEL = {
  id: 'ch1', academy_id: 'academy-1', name: 'Coaches', type: 'role_group' as const,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

describe('Chat — send a message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().login(makeSession(), makeProfile('Coach', { first_name: 'Cara' }));
    vi.mocked(chatApi.listChannels).mockResolvedValue([CHANNEL]);
    vi.mocked(chatApi.getMessages).mockResolvedValue([]);
    vi.mocked(chatApi.sendMessage).mockResolvedValue({
      id: 'm1', channel_id: 'ch1', sender_id: 'user-1', body: 'Great session today!',
      created_at: '2026-08-22T10:00:00Z',
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      session: null, user: null, isAuthenticated: false, isLoading: false, isInitialised: false, error: null,
    });
  });

  it('sends the typed message with a generated client_message_id', async () => {
    render(<CoachChatPage />);

    const input = await screen.findByPlaceholderText('Type a message…');
    // The composer stays disabled until the channel list loads and an
    // active channel is selected — wait for that before typing/sending.
    await waitFor(() => expect(input).not.toBeDisabled());

    fireEvent.change(input, { target: { value: 'Great session today!' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(chatApi.sendMessage).toHaveBeenCalledWith('ch1', 'Great session today!', undefined, 'test-client-id');
    });
  });
});
