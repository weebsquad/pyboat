import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(log: discord.AuditLogEntry, ...args: any) {
  return ['connection'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  connection(
    log: discord.AuditLogEntry,
    ev: discord.Event.IVoiceServerUpdate,
  ) {
    return new Map([
      ['_TYPE_', 'CONNECTED'],
      ['_TOKEN_', ev.token],
      ['_ENDPOINT_', ev.endpoint],
    ]);
  },
};

export async function OnVoiceServerUpdate(
  id: string,
  guildId: string,
  ev: discord.Event.IVoiceServerUpdate,
) {
  await handleEvent(id, guildId, discord.Event.VOICE_SERVER_UPDATE, null, ev);
}
