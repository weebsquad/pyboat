import { handleEvent, getUserTag, getMemberTag } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys() {
  return ['removedRole'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  removedRole(log: discord.AuditLogEntry, role: discord.Role) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'REMOVED_ROLE'],
      ['ROLE_NAME', utils.escapeString(role.name, true)],
    ]);
    return mp;
  },
};

export async function AL_OnGuildRoleDelete(
  id: string,
  guildId: string,
  log: any,
  role: discord.Role,
) {
  await handleEvent(id, guildId, discord.Event.GUILD_ROLE_DELETE, log, role);
}
