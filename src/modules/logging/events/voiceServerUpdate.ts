import { handleEvent, getUserTag, getMemberTag, isMaster } from '../main';

export function getKeys(log: discord.AuditLogEntry, ...args: any) {
  return isMaster() === true ? ['connection'] : [];
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
      ['TYPE', 'CONNECTED'],
      ['TOKEN', ev.token],
      ['ENDPOINT', ev.endpoint],
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
