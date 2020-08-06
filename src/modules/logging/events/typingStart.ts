import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  tpdata: discord.Event.ITypingStart
) {
  let keys = new Array('startTyping');
  return keys;
}

export const messages = {
  startTyping: async function(
    log: discord.AuditLogEntry,
    tpdata: discord.Event.ITypingStart
  ) {
    if (
      tpdata.channelId === discord.getBotId() ||
      !tpdata.guildId ||
      !(tpdata.member instanceof discord.GuildMember)
    ) {
      const usr = await discord.getUser(tpdata.userId);
      if (usr === null) return;
      return new Map([
        ['_USERTAG_', getUserTag(usr)],
        ['_CHANNEL_ID_', tpdata.channelId],
        ['_TYPE_', 'START_TYPING_DM']
      ]);
    } else {
      return new Map([
        ['_USERTAG_', getMemberTag(tpdata.member)],
        ['_CHANNEL_ID_', tpdata.channelId],
        ['_TYPE_', 'START_TYPING_GUILD']
      ]);
    }
  }
};

export async function OnTypingStart(
  id: string,
  guildId: string,
  tpdata: discord.Event.ITypingStart
) {
  await handleEvent(id, guildId, discord.Event.TYPING_START, undefined, tpdata);
}
