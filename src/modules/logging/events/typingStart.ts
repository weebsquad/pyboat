import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(
  log: discord.AuditLogEntry,
  tpdata: discord.Event.ITypingStart,
) {
  if (isIgnoredChannel(tpdata.channelId)) {
    return [];
  }
  if (isIgnoredUser(tpdata.userId)) {
    return [];
  }
  const keys = new Array('startTyping');
  return keys;
}

export const messages = {
  async startTyping(
    log: discord.AuditLogEntry,
    tpdata: discord.Event.ITypingStart,
  ) {
    if (
      tpdata.channelId === discord.getBotId()
      || !tpdata.guildId
      || !(tpdata.member instanceof discord.GuildMember)
    ) {
      const usr = await utils.getUser(tpdata.userId);
      if (usr === null) {
        return null;
      }
      return new Map([
        ['USERTAG', getUserTag(usr)],
        ['USER_ID', usr.id],
        ['USER', usr],
        ['CHANNEL_ID', tpdata.channelId],
        ['TYPE', 'START_TYPING_DM'],
      ]);
    }
    return new Map([
      ['USERTAG', getMemberTag(tpdata.member)],
      ['USER_ID', tpdata.userId],
      ['USER', tpdata.member.user],
      ['CHANNEL_ID', tpdata.channelId],
      ['TYPE', 'START_TYPING_GUILD'],
    ]);
  },
};

export async function OnTypingStart(
  id: string,
  guildId: string,
  tpdata: discord.Event.ITypingStart,
) {
  await handleEvent(id, guildId, discord.Event.TYPING_START, undefined, tpdata);
}
