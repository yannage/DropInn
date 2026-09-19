import { describe, expect, it } from 'vitest';
import { invitationUrl, parseInvitation } from './invites';
import { createAdventure } from './engine';
import { createCharacterProfile } from '../character';

describe('friend invitations', () => {
  it('puts the private invitation in the fragment and preserves it when pasted', () => {
    const room = createAdventure(createCharacterProfile('Wren', 'wizard'), 'owner', 1000, 'FRIEND');
    room.visibility = 'private'; room.inviteKey = 'a'.repeat(32);
    const link = invitationUrl(room, 'https://example.com/?session=owner&legacy=1#old');
    expect(new URL(link).search).toBe('?room=FRIEND');
    expect(new URL(link).hash).toBe(`#invite=${room.inviteKey}`);
    expect(parseInvitation(link)).toEqual({ code: 'FRIEND', inviteKey: room.inviteKey });
    room.visibility = 'public';
    expect(invitationUrl(room, 'https://example.com')).not.toContain(room.inviteKey);
  });
  it('accepts ordinary public codes and rejects broken or executable links', () => {
    expect(parseInvitation(' abc123 ')).toEqual({ code: 'ABC123' });
    for (const input of ['javascript:alert(1)', 'BAD', 'https://example.com/?room=FRIEND#invite=wrong']) {
      expect(() => parseInvitation(input)).toThrow('invitation');
    }
  });
});
