import { handleEvent, getUserTag, getMemberTag } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys() {
  return ['newRole'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  newRole(log: discord.AuditLogEntry, role: discord.Role) {
    // maybe ill give a shit to actually check for default props some other time...
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'NEW_ROLE'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    return mp;
  },
};

export async function AL_OnGuildRoleCreate(
  id: string,
  guildId: string,
  log: any,
  role: discord.Role,
) {
  await handleEvent(id, guildId, discord.Event.GUILD_ROLE_CREATE, log, role);
}
