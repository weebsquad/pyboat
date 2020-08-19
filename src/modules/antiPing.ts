/* eslint-disable block-scoped-var */
/* eslint-disable no-redeclare */
/* eslint-disable no-shadow */
import { config } from '../config';
import * as utils from '../lib/utils';
import { logCustom } from './logging/events/custom';
import * as logUtils from './logging/utils';

const kv = new pylon.KVNamespace('antiPing');

const kvDataKey = 'antiPingData';
const kvIgnoresKey = 'antiPingIgnores';
const kvMutesKey = 'antiPingMutes';
const kvKickDebounce = 'antiPingKickDebounce';

async function isIllegalMention(
  author: discord.GuildMember,
  target: discord.GuildMember,
  channel: discord.GuildTextChannel,
) {
  if (!isTargetChannel(channel)) {
    return false;
  }
  if (author.user.bot || target.user.bot) {
    return false;
  }
  if (author.user.id === target.user.id) {
    return false;
  }
  if (await isBypass(author)) {
    return false;
  }
  if (await isMuted(author)) {
    return false;
  } // in case mute fails, lol
  const itarget = await isTarget(target);
  if (!itarget) {
    return false;
  }
  const atarget = await isTarget(author);
  if (itarget && atarget) {
    return false;
  }
  if (await isStaff(author)) {
    return false;
  }
  return true;
}

async function isIgnore(memberId: string) {
  const ignores: Array<string> = (await kv.get(kvIgnoresKey));
  if (!Array.isArray(ignores)) {
    return false;
  }
  return ignores.includes(memberId);
}

async function isMuted(member: discord.GuildMember) {
  if (member.user.bot) {
    return false;
  }
  const roles = await utils.getUserRoles(member);
  let isMutedd = false;

  if (roles.some((e) => e.id === config.modules.antiPing.muteRole)) {
    isMutedd = true;
  }
  return isMutedd;
}

async function isStaff(member: discord.GuildMember) {
  if (member.user.bot) {
    return false;
  }
  // if (await utils.hasStaffPerms(member, null)) return true;
  /*
  const roles = await utils.getUserRoles(member);
  let hasStaff = false;

  roles.forEach((role) => {
    if (config.modules.antiPing.staffRoles.indexOf(role.id) > -1) {
      hasStaff = true;
    }
  });
  return hasStaff; */
  const userAuth = utils.getUserAuth(member);
  return userAuth >= config.modules.antiPing.staff;
}

function isTargetChannel(channel: discord.GuildTextChannel) {
  const chanId = channel.id;
  const lists = {
    channel: false,
    category: false,
  };
  if (
    config.modules.antiPing.targets.channels.include.indexOf(chanId) > -1
    && config.modules.antiPing.targets.channels.exclude.indexOf(chanId) === -1
  ) {
    lists.channel = true;
  }
  const par = channel.parentId;
  if (typeof par === 'string') {
    if (
      config.modules.antiPing.targets.categories.include.indexOf(par) > -1
        && config.modules.antiPing.targets.channels.exclude.indexOf(chanId) === -1
    ) {
      lists.category = true;
    }
  }
  return lists.channel || lists.category;
}

async function isTarget(member: discord.GuildMember) {
  const userId = member.user.id;
  if (config.modules.antiPing.targets.users.exclude.indexOf(userId) > -1) {
    return false;
  }
  if (config.modules.antiPing.targets.users.include.indexOf(userId) > -1) {
    return true;
  }
  const roles: Array<discord.Role> = (await utils.getUserRoles(member));
  let hasWhitelist = false;
  let hasBlacklist = false;
  roles.forEach((role) => {
    if (config.modules.antiPing.targets.roles.include.indexOf(role.id) > -1) {
      hasWhitelist = true;
    }
    if (config.modules.antiPing.targets.roles.exclude.indexOf(role.id) > -1) {
      hasBlacklist = true;
    }
  });
  if (hasWhitelist && !hasBlacklist) {
    return true;
  }
  return false;
}

async function isBypass(member: discord.GuildMember) {
  if (member.user.bot) {
    return true;
  }
  if (await isStaff(member)) {
    return true;
  }
  const userId = member.user.id;
  if (config.modules.antiPing.bypass.users.indexOf(userId) > -1) {
    return true;
  }
  const lvl = utils.getUserAuth(member);
  if (lvl >= config.modules.antiPing.bypass.level) {
    return true;
  }
  if (await isIgnore(userId)) {
    return true;
  }
  const roles = await utils.getUserRoles(member);
  let is = false;
  roles.forEach((role) => {
    if (config.modules.antiPing.bypass.roles.indexOf(role.id) > -1) {
      is = true;
    }
  });

  return is;
}

async function log(type: string, usr: discord.User | undefined = undefined, actor: discord.User | undefined = undefined, extras: Map<string, string> | undefined = new Map()) {
  if (usr instanceof discord.User) {
    extras.set('_USERTAG_', logUtils.getUserTag(usr));
  }
  if (actor instanceof discord.User) {
    extras.set('_ACTORTAG_', logUtils.getUserTag(actor));
  }
  await logCustom('ANTIPING', `${type}`, extras);
  /*
  let chan = (await discord.getChannel(
    config.modules.antiPing.logChannel
  )) as discord.GuildTextChannel;
  let timestamp = new Date().toLocaleString();
  const embed = new discord.Embed();
  embed.setAuthor({ name: author, iconUrl: image });
  embed.setDescription(txt);
  embed.setFooter({ text: footer });
  embed.setTimestamp(new Date().toISOString());
  embed.setColor(0xdb2323);
  await chan.sendMessage({ content: '', embed: embed }); */
}

async function messageDeleted(messageId: string) {
  const data:any = await kv.get(kvDataKey);
  let changed = false;
  for (const userId in data) {
    for (const mId in data[userId]) {
      const obj = data[userId][mId].BotReplyMsg;
      if (obj.id === messageId) {
        delete data[userId][mId];
        changed = true;
        break;
      }
    }
    if (Object.keys(data[userId]).length === 0) {
      changed = true;
      delete data[userId];
    }
  }
  if (changed) {
    await kv.put(kvDataKey, data);
  }
}

async function clearUserData(userId: string) {
  let ignores = await kv.get(kvIgnoresKey);
  let mutes = await kv.get(kvMutesKey);
  if (!Array.isArray(ignores)) {
    ignores = [];
  }
  if (!Array.isArray(mutes)) {
    mutes = [];
  }
  if (ignores.includes(userId)) {
    ignores.splice(ignores.indexOf(userId), 1);
    await kv.put(kvIgnoresKey, ignores);
  }
  if (mutes.includes(userId)) {
    mutes.splice(mutes.indexOf(userId), 1);
    await kv.put(kvMutesKey, mutes);
  }
}

async function wipeAllUserMessages(userId: string, allMessages = false) {
  const data = await kv.get(kvDataKey);
  // let guild;
  for (const mid in data[userId]) {
    for (const msgkey in data[userId][mid]) {
      const obj = data[userId][mid][msgkey];
      // if (typeof guild !== 'object')
      // guild = await discord.getGuild(obj.guildId);
      if (msgkey === 'OriginalMsg' && !allMessages) {
        continue;
      }
      try {
        const chan: discord.Channel = (await discord.getChannel(
          obj.channelId,
        ));
        if (typeof chan !== 'object' || chan === null || chan.type !== discord.Channel.Type.GUILD_TEXT || !(chan instanceof discord.GuildTextChannel)) {
          continue;
        }

        const msg = await chan.getMessage(obj.id);
        if (msg === null) {
          continue;
        }
        await msg.delete();
      } catch (e) {}
    }
  }
  /*
  data = await kv.get(kvDataKey);
  delete data[userId];
  await kv.put(kvDataKey, data); */
}

export async function OnMessageCreate(
  id: string,
  guildId: string,
  message: discord.Message,
) {
  if (message.webhookId !== null || message.type !== 0) {
    return;
  }
  if (message.mentions.length <= 0 || message.mentions.length > 10) {
    return;
  }
  if (!(message instanceof discord.GuildMemberMessage)) {
    return;
  }
  const channel: any = (await message.getChannel());
  if (!(channel instanceof discord.GuildTextChannel) || channel.type !== discord.Channel.Type.GUILD_TEXT) {
    return;
  }
  const { author } = message;
  const guild = await message.getGuild();
  if (guild === null) {
    return;
  }
  const authorMember = message.member;
  if (!(authorMember instanceof discord.GuildMember)) {
    return;
  }

  if (await isBypass(authorMember)) {
    return;
  }
  if (message.mentions.length > 6) {
    return;
  }
  const illegalMentions = [];
  await Promise.all(
    message.mentions.map(async (mention) => {
      let ghettoMember: any;
      if (typeof (mention.member) === 'object') {
        ghettoMember = mention.member;
        const usr = mention;
        delete usr.member;
        ghettoMember.user = usr;
        ghettoMember.guildId = guild.id;
      } else {
        ghettoMember = await guild.getMember(mention.id);
      }

      if (await isIllegalMention(authorMember, ghettoMember, channel)) {
        illegalMentions.push(ghettoMember);
      }
    }),
  );
  if (illegalMentions.length <= 0) {
    return;
  }
  const msg = config.modules.antiPing.caughtMessages[
    Math.floor(Math.random() * config.modules.antiPing.caughtMessages.length)
  ];
  let data = await kv.get(kvDataKey);
  if (typeof data !== 'object') {
    data = {};
  }
  if (typeof data[author.id] !== 'object') {
    data[author.id] = {};
  }
  let isMute = false;
  if (Object.keys(data[author.id]).length >= config.modules.antiPing.pingsForAutoMute - 1) {
    isMute = true;
    try {
      await authorMember.addRole(config.modules.antiPing.muteRole);
      let mutes: Array<string> = (await kv.get(kvMutesKey));
      if (!Array.isArray(mutes)) {
        mutes = [];
      }
      if (!mutes.includes(author.id)) {
        mutes.push(author.id);
      }
      await kv.put(kvMutesKey, mutes);
    } catch (e) {
      isMute = false; // fallback meme
    }
  }
  let muteText = '';
  if (isMute) {
    muteText = '\n>> **You were muted for pinging users after a warning** <<\n';
  }
  const msgtorep = `${message.author.toMention()} ${msg}\n${muteText}\n${
    config.modules.antiPing.actualCaughtMessage
  }`;
  const msgReply = await message.reply(msgtorep);
  if (config.modules.antiPing.instaDeletePings) {
    try {
      await message.delete();
    } catch (e) {}
  }
  const dataSaves: Array<any> = [{}, {}];
  const clearKeys = [
    'member',
    'author',
    'mentionRoles',
    'attachments',
    'mentionChannels',
    'mentionRoles',
    'mentionEveryone',
    'webhookId',
    'editedTimestamp',
    'mentions',
    'reactions',
    'pinned',
    'activity',
    'application',
    'flags',
    'messageReference',
    'type',
    'timestamp',
    'content',
    'guildId',
  ];
  for (let i = 0; i < 2; i += 1) {
    let objtarg: any = message;
    if (i === 0) {
      objtarg = msgReply;
    }
    for (const key in objtarg) {
      if (clearKeys.indexOf(key) > -1) {
        continue;
      }
      dataSaves[i][key] = objtarg[key];
    }
    dataSaves[i].authorId = objtarg.author.id;
    dataSaves[i].guildId = guild.id;
  }

  data[author.id][message.id] = {
    BotReplyMsg: dataSaves[0],
    OriginalMsg: dataSaves[1],
  };

  const pingCount = message.mentions.length;
  let pingText = `${pingCount} users`;
  if (pingCount < 10) {
    pingText = '';
    for (const key in message.mentions) {
      const obj = message.mentions[key];
      if (pingText !== '') {
        pingText += ', ';
      }
      pingText += `<@!${obj.id}>`;
    }
  }
  if (isMute) {
    await log('TRIGGERED_MUTE', author, undefined, new Map([['_MESSAGE_ID_', message.id], ['_CHANNEL_ID_', message.channelId]]));
  } else {
    await log('TRIGGERED', author, undefined, new Map([['_MESSAGE_ID_', message.id], ['_CHANNEL_ID_', message.channelId]]));
  }

  /* let logTxt = `:ping_pong: Triggered anti-ping, by mentioning ${pingText}\nMessage ID : ${message.id}`;
  if (isMute) logTxt += '\n:mute: User was auto-muted for spamming pings.';

  await log(
    logTxt,
    author.getTag(),
    'Member ID: ' + author.id,
    author.getAvatarUrl()
  ); */

  await kv.put(kvDataKey, data);
  for (const key in config.modules.antiPing.emojiActions) {
    await msgReply.addReaction(key);
  }

  return false; // So nothing else runs :))
}

export async function OnMessageDelete(id: string,
                                      guildId: string,
                                      ev: discord.Event.IMessageDelete,
                                      oldMessage: discord.Message.AnyMessage | null) {
  // check if deleted message is bot's reply
  await messageDeleted(ev.id);
}
export async function OnMessageDeleteBulk(id: string,
                                          guildId: string,
                                          ev: discord.Event.IMessageDeleteBulk) {
  // check if deleted message is bot's reply
  for (const key in ev.ids) {
    await messageDeleted(key);
  }
}

export async function EmojiActionMute(guild: discord.Guild, member: discord.GuildMember, reactor: discord.GuildMember, userMsg: any) {
  try {
    await member.addRole(config.modules.antiPing.muteRole);
    return true;
  } catch (e) {
  }
  return false;
}

export async function EmojiActionIgnore(guild: discord.Guild, member: discord.GuildMember, reactor: discord.GuildMember, userMsg: any) {
  let ignores: Array<string> = (await kv.get(kvIgnoresKey));
  if (!Array.isArray(ignores)) {
    ignores = [];
  }
  if (!ignores.includes(userMsg.authorId)) {
    ignores.push(userMsg.authorId);
    await kv.put(kvIgnoresKey, ignores);
  }

  let mutes: Array<string> = (await kv.get(kvMutesKey));
  if (!Array.isArray(mutes)) {
    mutes = [];
  }
  if (mutes.includes(userMsg.authorId)) {
    try {
      await member.removeRole(config.modules.antiPing.muteRole);
      mutes.splice(mutes.indexOf(userMsg.authorId), 1);
      await kv.put(kvMutesKey, mutes);
      return true;
    } catch (e) {
      await log('FAIL_MARK_UNMUTE', member.user, reactor.user, new Map([['_ACTION_', 'Ignore'], ['_MESSAGE_ID_', userMsg.id], ['_CHANNEL_ID_', userMsg.channelId]]));
    }
  }
  return false;
}
export async function EmojiActionIgnoreOnce(guild: discord.Guild, member: discord.GuildMember, reactor: discord.GuildMember, userMsg: any) {
  let mutes: Array<string> = (await kv.get(kvMutesKey));
  if (!Array.isArray(mutes)) {
    mutes = [];
  }
  if (mutes.includes(userMsg.authorId)) {
    try {
      await member.removeRole(config.modules.antiPing.muteRole);
      mutes.splice(mutes.indexOf(userMsg.authorId), 1);
      await kv.put(kvMutesKey, mutes);
      return true;
    } catch (e) {
      // logMsg = `:x: Tried to Mark MessageID \`${userMsg.id}\` as \`${emojiAction}\` but failed to unmute the user`;
      await log('FAIL_MARK_UNMUTE', member.user, reactor.user, new Map([['_ACTION_', 'IgnoreOnce'], ['_MESSAGE_ID_', userMsg.id], ['_CHANNEL_ID_', userMsg.channelId]]));
    }
  }
  return false;
}
export async function EmojiActionKick(guild: discord.Guild, member: discord.GuildMember, reactor: discord.GuildMember, userMsg: any) {
  // No way to softban in pylon yet.. so let's actually kick lol
  try {
    let kickDebugs = await kv.get(kvKickDebounce);
    if (!Array.isArray(kickDebugs)) {
      kickDebugs = [];
    }
    if (!kickDebugs.includes(userMsg.authorId)) {
      kickDebugs.push(userMsg.authorId);
      await kv.put(kvKickDebounce, kickDebugs, { ttl: 20 * 1000 });
    }

    await member.kick();
    return true;
  } catch (e) {
  }
  return false;
}

export async function EmojiActionBan(guild: discord.Guild, member: discord.GuildMember, reactor: discord.GuildMember, userMsg: any) {
  try {
    let kickDebugs = await kv.get(kvKickDebounce);
    if (!Array.isArray(kickDebugs)) {
      kickDebugs = [];
    }
    if (!kickDebugs.includes(userMsg.authorId)) {
      kickDebugs.push(userMsg.authorId);
      await kv.put(kvKickDebounce, kickDebugs, { ttl: 20 * 1000 });
    }
    await guild.createBan(userMsg.authorId, {
      deleteMessageDays: 7,
      reason: `${reactor.user.getTag()} (${
        reactor.user.id
      }) >> Banned due to antiping`,
    });
    return true;
  } catch (e) {
    //
  }
  return false;
}
export async function OnMessageReactionAdd(id: string,
                                           guildId: string,
                                           ev: discord.Event.IMessageReactionAdd) {
  const { member } = ev;
  const { messageId } = ev;
  const { emoji } = ev;
  // Check staff adds
  if (!(await isStaff(member))) {
    return;
  }
  const data: any = await kv.get(kvDataKey);
  let thisData;
  for (const userId in data) {
    if (typeof thisData === 'object') {
      break;
    }
    for (const mId in data[userId]) {
      if (data[userId][mId].BotReplyMsg.id === messageId) {
        thisData = data[userId][mId];
        break;
      }
    }
  }
  if (typeof thisData !== 'object') {
    return;
  }
  const botMsg = thisData.BotReplyMsg;
  const userMsg = thisData.OriginalMsg;

  const emojiAction = config.modules.antiPing.emojiActions[emoji.name];
  if (typeof emojiAction !== 'string') {
    return;
  }
  let emojiFunc;
  if (emojiAction.toLowerCase() === 'ban') {
    emojiFunc = EmojiActionBan;
  } else if (emojiAction.toLowerCase() === 'kick') {
    emojiFunc = EmojiActionKick;
  } else if (emojiAction.toLowerCase() === 'mute') {
    emojiFunc = EmojiActionMute;
  } else if (emojiAction.toLowerCase() === 'ignoreonce') {
    emojiFunc = EmojiActionIgnoreOnce;
  } else if (emojiAction.toLowerCase() === 'ignore') {
    emojiFunc = EmojiActionIgnore;
  }
  if (typeof emojiFunc !== 'function') {
    return;
  }
  const validAction = true;
  const guild = await discord.getGuild(guildId);
  let wipeAll = true;
  async function tryGetGuildMember(guild: discord.Guild, id: string) {
    let membr;
    try {
      membr = guild.getMember(id);
    } catch (e) {

    }
    if (typeof membr !== 'object') {
      return false;
    }
    return membr;
  }
  const user = await discord.getUser(userMsg.authorId);
  if (user === null) {
    return;
  }
  let mutes: Array<string> = (await kv.get(kvMutesKey));
  if (!Array.isArray(mutes)) {
    mutes = [];
  }
  const isMutedd = mutes.includes(userMsg.authorId);
  let logMsg = `:ping_pong: Successfully marked MessageID \`${userMsg.id}\` as \`${emojiAction}\``;
  if (emojiAction !== 'Ignore' && emojiAction !== 'IgnoreOnce') {
    logMsg += '\n:white_check_mark: __Action was taken__';
  }
  let failAction = false;
  let notFound = false;
  const membr = await tryGetGuildMember(guild, userMsg.authorId);
  if (membr === false && emojiAction !== 'Ban') {
    notFound = true;
  }
  if (emojiAction === 'IgnoreOnce' || emojiAction === 'Ignore') {
    wipeAll = false;
  }
  if (notFound === false) {
    failAction = !(await emojiFunc(guild, membr, member, userMsg));
  }
  if (validAction) {
    if (notFound) {
      // logMsg = `:x: Tried to Mark MessageID \`${userMsg.id}\` as \`${emojiAction}\` but the member was not found in the guild`;
      await log('FAIL_MARK_MEMBER_NOT_FOUND', user, member.user, new Map([['_ACTION_', emojiAction], ['_MESSAGE_ID_', userMsg.id], ['_CHANNEL_ID_', userMsg.channelId]]));
    } else if (failAction) {
      await log('FAIL_MARK_ACTION', user, member.user, new Map([['_ACTION_', emojiAction], ['_MESSAGE_ID_', userMsg.id], ['_CHANNEL_ID_', userMsg.channelId]]));
      // logMsg = `:x: Tried to Mark MessageID \`${userMsg.id}\` as \`${emojiAction}\` but I couldn't ${emojiAction} the user`;
    } else {
      await log('MARK_SUCCESS', user, member.user, new Map([['_ACTION_', emojiAction], ['_MESSAGE_ID_', userMsg.id], ['_CHANNEL_ID_', userMsg.channelId]]));
    }
    /*
    await log(
      logMsg,
      member.user.getTag(),
      'Member ID: ' + member.user.id,
      member.user.getAvatarUrl()
    ); */
    await wipeAllUserMessages(userMsg.authorId, wipeAll);
  }
}

export async function AL_OnGuildMemberRemove(id: string,
                                             guildId: string,
                                             log: any,
                                             member: discord.Event.IGuildMemberRemove) {
  // If they leave after memeing us
  const data = await kv.get(kvDataKey);
  const { user } = member;
  let kickDebugs = await kv.get(kvKickDebounce);
  if (!Array.isArray(kickDebugs)) {
    kickDebugs = [];
  }
  if (kickDebugs.includes(user.id)) {
    kickDebugs.splice(kickDebugs.indexOf(user.id), 1);
    await kv.put(kvKickDebounce, kickDebugs, { ttl: 20 * 1000 });
    return;
  }
  const guild = await discord.getGuild(member.guildId);
  if (typeof data[user.id] !== 'object' || guild === null) {
    return;
  }
  if (log instanceof discord.AuditLogEntry) {
    if (log.actionType === discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD) {
      wipeAllUserMessages(user.id, true);
      await clearUserData(user.id);
    }
    return;
  }
  await sleep(300);
  const isBanned = await guild.getBan(user);
  if (isBanned !== null) {
    return;
  }
  const isBan = Object.keys(data[user.id]).length >= config.modules.antiPing.pingsForAutoMute
    || config.modules.antiPing.banOnLeave;
  if (!isBan) {
    // TODO > Update bot's message to reflect that user has left the guild, easier to ban manually in this case lol
  } else {
    await guild.createBan(user.id, {
      deleteMessageDays: 7,
      reason:
        'Auto-Banned for leaving the server with pending autoping moderations',
    });
    wipeAllUserMessages(user.id, true);
    await log('LEFT_BANNED', user);
    await clearUserData(user.id);
    /* await log(
      ':hammer: Tried to act smart and left the server after pinging and before a punishment was defined\n:white_check_mark: User was banned',
      user.getTag(),
      'Member ID: ' + user.id,
      user.getAvatarUrl()
    ); */
  }
}
export async function OnGuildBanAdd(id: string,
                                    guildId: string,
                                    ban: discord.GuildBan) {
  // If they get banned after memeing us (let's clear their shit)
  const data = await kv.get(kvDataKey);
  const { user } = ban;
  wipeAllUserMessages(user.id, true);
  await clearUserData(user.id);
}

export async function OnGuildMemberUpdate(id: string, guildId: string, member: discord.GuildMember) {
  // Check mute remove
  const roleMuted = await isMuted(member);
  let mutesVal = await kv.get(kvMutesKey);
  if (!Array.isArray(mutesVal)) {
    mutesVal = [];
  }
  const valMuted = mutesVal.includes(member.user.id);
  if (!roleMuted && valMuted) {
    mutesVal.splice(mutesVal.indexOf(member.user.id), 1);
    await kv.put(kvMutesKey, mutesVal);
  }
}

// export async function OnMessageUpdate() {}
