import { handleEvent, getUserTag, getMemberTag, isMaster } from '../main';
import * as utils from '../../../lib/utils';

export async function getKeys(log: null, guild: discord.Guild) {
  const _me = await guild.getMember(discord.getBotId());
  if (_me === null) {
    return ['reconnected'];
  }
  const ndiff = new Date().getTime() - new Date(_me.joinedAt).getTime();
  if (ndiff > 60 * 1000) {
    return ['reconnected'];
  }
  return isMaster() === true ? ['newGuild'] : [];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  reconnected(log: discord.AuditLogEntry, guild: discord.Guild) {
    return new Map([
      ['TYPE', 'RECONNECTED'],
      ['GUILD_ID', guild.id],
      ['GUILD_NAME', utils.escapeString(guild.name, true)],
    ]);
  },
  newGuild(log: discord.AuditLogEntry, guild: discord.Guild) {
    return new Map([
      ['TYPE', 'NEW_GUILD'],
      ['GUILD_ID', guild.id],
      ['GUILD_NAME', guild.name],
    ]);
  },
};

export async function OnGuildCreate(
  id: string,
  guildId: string,
  guild: discord.Guild,
) {
  await handleEvent(id, guildId, discord.Event.GUILD_CREATE, null, guild);
}
