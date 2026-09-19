import type { AdventureRoom } from './types';

export function parseInvitation(input: string): { code: string; inviteKey?: string } {
  const text = input.trim();
  if (/^[a-z0-9]{6}$/i.test(text)) return { code: text.toUpperCase() };
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    const code = url.searchParams.get('room') ?? '';
    const inviteKey = new URLSearchParams(url.hash.slice(1)).get('invite') ?? undefined;
    if (!/^[a-z0-9]{6}$/i.test(code) || (inviteKey && !/^[a-f0-9]{32}$/.test(inviteKey))) throw new Error();
    return { code: code.toUpperCase(), inviteKey };
  } catch { throw new Error('Paste a complete invitation link or a six-character public adventure code.'); }
}

export function invitationUrl(room: AdventureRoom, origin: string) {
  const url = new URL('/', origin);
  url.searchParams.set('room', room.code);
  if (room.visibility === 'private' && room.inviteKey) url.hash = new URLSearchParams({ invite: room.inviteKey }).toString();
  return url.toString();
}
