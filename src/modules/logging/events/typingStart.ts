import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser } from '../main';

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
        ['_USERTAG_', getUserTag(usr)],
        ['_USER_ID_', usr.id],
        ['_USER_', usr],
        ['_CHANNEL_ID_', tpdata.channelId],
        ['_TYPE_', 'START_TYPING_DM'],
      ]);
    }
    return new Map([
      ['_USERTAG_', getMemberTag(tpdata.member)],
      ['_USER_ID_', tpdata.userId],
      ['_USER_', tpdata.member.user],
      ['_CHANNEL_ID_', tpdata.channelId],
      ['_TYPE_', 'START_TYPING_GUILD'],
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
