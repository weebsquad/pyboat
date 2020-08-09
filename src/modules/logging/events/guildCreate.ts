import { handleEvent, getUserTag, getMemberTag } from '../main';
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
  return ['newGuild'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  reconnected(log: discord.AuditLogEntry, guild: discord.Guild) {
    return new Map([
      ['_TYPE_', 'RECONNECTED'],
      ['_GUILD_ID_', guild.id],
      ['_GUILD_NAME_', utils.escapeString(guild.name)],
    ]);
  },
  newGuild(log: discord.AuditLogEntry, guild: discord.Guild) {
    return new Map([
      ['_TYPE_', 'NEW_GUILD'],
      ['_GUILD_ID_', guild.id],
      ['_GUILD_NAME_', guild.name],
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
