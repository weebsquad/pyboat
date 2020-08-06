import { getAuditLogData } from '../lib/auditLog/matcher';
import { ExecuteModules } from '../lib/eventHandler/routing';
import * as utils from '../lib/utils';

async function logChan(txt: string, embed: any) {
  let chan = (await discord.getChannel(
    '704082667808882698'
  )) as discord.GuildTextChannel;
  if (chan === null) return;

  await chan.sendMessage({
    content: txt,
    allowedMentions: {},
    embed: embed
  });
}
export async function AL_OnGuildRoleUpdate(
  id: string,
  log: any,
  role: discord.Role,
  oldRole: discord.Role
) {
  console.log('AL_OnGuildRoleUpdate', log, role);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildRoleUpdate', log);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Role Update Log').setColor(0x00ff00);
  let desc = `${role.toMention()} changes by ${user.toMention()}`;
  for (let key in log.changes) {
    let cuteName = `${key.substring(0, 1).toUpperCase() + key.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${log.changes[key]['newValue']}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${log.changes[key]['oldValue']}`;
    } else {
      add += `${log.changes[key]['oldValue']} :arrow_forward: ${log.changes[key]['newValue']}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Role ID',
    value: role.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan(``, richEmbed);
}

export async function AL_OnGuildRoleCreate(
  id: string,
  log: any,
  role: discord.Role
) {
  console.log('AL_OnGuildRoleCreate', log, role);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildRoleCreate', log['message']);
    return;
  }
  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Role Create Log').setColor(0x00ff00);
  let desc = `${role.toMention()} created by ${user.toMention()}`;
  for (let key in log.changes) {
    let cuteName = `${key.substring(0, 1).toUpperCase() + key.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${log.changes[key]['newValue']}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${log.changes[key]['oldValue']}`;
    } else {
      add += `${log.changes[key]['oldValue']} :arrow_forward: ${log.changes[key]['newValue']}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Role ID',
    value: role.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnGuildRoleDelete(
  id: string,
  log: any,
  role: discord.Role
) {
  console.log('AL_OnGuildRoleDelete', log, role);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildRoleDelete', log['message']);
    return;
  }
  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Role Delete Log').setColor(0x00ff00);
  let desc = `\`${role.name}\` deleted by ${user.toMention()}`;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Role ID',
    value: role.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnGuildUpdate(
  id: string,
  log: any,
  guild: discord.Guild,
  oldGuild: discord.Guild
) {
  console.log('AL_OnGuildUpdate', log, guild);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildUpdate', log['message']);
    return;
  }
  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Guild Update Log').setColor(0x00ff00);
  let desc = `\`${guild.name}\` updated by ${user.toMention()}`;
  for (let key in log.changes) {
    let cuteName = `${key.substring(0, 1).toUpperCase() + key.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${log.changes[key]['newValue']}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${log.changes[key]['oldValue']}`;
    } else {
      add += `${log.changes[key]['oldValue']} :arrow_forward: ${log.changes[key]['newValue']}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Guild ID',
    value: guild.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnMessageDelete(
  id: string,
  log: any,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.Message
) {
  console.log('AL_OnMessageDelete', log, oldMessage);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnMessageDelete', log['message']);
    return;
  }
  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Message Delete Log').setColor(0x00ff00);
  let desc = `Message by ${oldMessage.author.toMention()}\n\`${
    oldMessage.content
  }\`\n\nDeleted by ${user.toMention()}`;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Message ID',
    value: messageDelete.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnMessageDeleteBulk(
  id: string,
  log: any,
  messages: discord.Event.IMessageDeleteBulk
) {
  console.log('AL_OnMessageDeleteBulk', log, messages);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnMessageDelete', log['message']);
    return;
  }
  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Bulk Message Delete Log').setColor(0x00ff00);
  let desc = `**${
    messages.ids.length
  }** messages bulk-deleted by ${user.toMention()} in <#${messages.channelId}>`;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Message IDs',
    value: messages.ids.join(', '),
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnChannelCreate(
  id: string,
  log: any,
  channel: discord.GuildChannel
) {
  console.log('AL_OnChannelCreate', log, channel);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnChannelCreate', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Channel Creation Log').setColor(0x00ff00);
  let desc = `${channel.toMention()} (${
    channel.name
  }) created by ${user.toMention()}`;
  for (let key in log.changes) {
    let cuteName = `${key.substring(0, 1).toUpperCase() + key.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${log.changes[key]['newValue']}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${log.changes[key]['oldValue']}`;
    } else {
      add += `${log.changes[key]['oldValue']} :arrow_forward: ${log.changes[key]['newValue']}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Channel ID',
    value: channel.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnChannelUpdate(
  id: string,
  log: any,
  channel: discord.GuildChannel,
  oldChannel: discord.GuildChannel
) {
  console.log('AL_OnChannelUpdate', log, channel);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnChannelUpdate', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Channel Update Log').setColor(0x00ff00);
  let desc = `${channel.toMention()} (${
    channel.name
  }) updated by ${user.toMention()}`;
  for (let key in log.changes) {
    let cuteName = `${key.substring(0, 1).toUpperCase() + key.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${log.changes[key]['newValue']}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${log.changes[key]['oldValue']}`;
    } else {
      add += `${log.changes[key]['oldValue']} :arrow_forward: ${log.changes[key]['newValue']}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Channel ID',
    value: channel.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnChannelDelete(
  id: string,
  log: any,
  channel: discord.GuildChannel
) {
  console.log('AL_OnChannelDelete', log, channel);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnChannelDelete', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Channel Delete Log').setColor(0x00ff00);
  let desc = `#${channel.name} deleted by ${user.toMention()}`;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Channel ID',
    value: channel.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}
/*
export async function AL_OnGuildMemberUpdate(id: string,
  log: any,
  member: discord.GuildMember,
  oldMember: discord.GuildMember
) {
  console.log('AL_OnGuildMemberUpdate', log, member, oldMember);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildMemberUpdate', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Member Update Log').setColor(0x00ff00);
  let desc = `${member.user.toMention()} updated by ${user.toMention()}`;
  for (let key in log.changes) {
    let n = key + '';
    if (key === '$remove') n = 'remove roles';
    if (key === '$add') n = 'add roles';
    let cuteName = `${n.substring(0, 1).toUpperCase() + n.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    let newv = log.changes[key]['newValue'];
    let oldv = log.changes[key]['oldValue'];

    if (key === '$remove' || key === '$add') {
      let test = newv
        .map(function(ele: any) {
          return `<@&${ele.id}>`;
        })
        .join(', ');
      newv = test;
    }
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${newv}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${oldv}`;
    } else {
      add += `${oldv} :arrow_forward: ${newv}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Target ID',
    value: member.user.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}*/

/*
export async function AL_OnChannelPinsUpdate(log: any, pinUpdate: discord.Event.IChannelPinsUpdate) {id: string,
  console.log('AL_OnChannelPinsUpdate', log, pinUpdate);
  if (!(log instanceof discord.AuditLogEntry)) {
    console.log('AL_OnChannelPinsUpdate', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Channel Pin Log').setColor(0x00ff00);
  let desc = `${member.user.toMention()} updated by ${user.toMention()}`;
  for (let key in log.changes) {
    let n = key + '';
    if (key === '$remove') n = 'remove roles';
    if (key === '$add') n = 'add roles';
    let cuteName = `${n.substring(0, 1).toUpperCase() + n.substring(1)}`;
    let add = `\n\n> **${cuteName}**\n`;
    let newv = log.changes[key]['newValue'];
    let oldv = log.changes[key]['oldValue'];

    if (key === '$remove' || key === '$add') {
      let test = newv
        .map(function(ele: any) {
          return `<@&${ele.id}>`;
        })
        .join(', ');
      newv = test;
    }
    //console.log(log.changes[key]);
    if (
      typeof log.changes[key]['oldValue'] === 'undefined' &&
      typeof log.changes[key]['newValue'] !== 'undefined'
    ) {
      add += `:new: ${newv}`;
    } else if (
      typeof log.changes[key]['oldValue'] !== 'undefined' &&
      typeof log.changes[key]['newValue'] === 'undefined'
    ) {
      add += `:no_entry_sign: ${oldv}`;
    } else {
      add += `${oldv} :arrow_forward: ${newv}`;
    }
    desc += add;
  }
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'Target ID',
    value: member.user.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}*/

export async function AL_OnGuildMemberRemove(
  id: string,
  log: any,
  memberRemove: discord.Event.IGuildMemberRemove,
  oldMember: discord.GuildMember
) {
  console.log('AL_OnGuildMemberRemove', log, memberRemove, oldMember);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildMemberRemove', log['message']);
    return;
  }
  let type = 'kicked';
  if (
    log.actionType ===
    discord.AuditLogEntry.MemberBanAdd.ActionType.MEMBER_BAN_ADD
  )
    type = 'banned';
  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Removal Log').setColor(0x00ff00);
  let desc = `${memberRemove.user.toMention()} was ${type} by ${user.toMention()}`;
  if (log.reason && log.reason.length > 0) desc += `for \`${log.reason}\``;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'User ID ' + type,
    value: memberRemove.user.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID Author',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnGuildBanAdd(
  id: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember
) {
  console.log('AL_OnGuildBanAdd', log, ban, oldMember);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildBanAdd', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Ban Log').setColor(0x00ff00);
  let desc = `${ban.user.toMention()} was banned by ${user.toMention()}`;
  if (log.reason && log.reason.length > 0) desc += ` for \`${log.reason}\``;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'User ID Banned',
    value: ban.user.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID Author',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnGuildBanRemove(
  id: string,
  log: any,
  ban: discord.GuildBan,
  oldMember: discord.GuildMember
) {
  console.log('AL_OnGuildBanRemove', log, ban, oldMember);
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildBanRemove', log['message']);
    return;
  }

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Unban Log').setColor(0x00ff00);
  let desc = `${ban.user.toMention()} was unbanned by ${user.toMention()}`;
  if (log.reason && log.reason.length > 0) desc += `for \`${log.reason}\``;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'User ID Unbanned',
    value: ban.user.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID Author',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await logChan('', richEmbed);
}

export async function AL_OnGuildMemberAdd(
  id: string,
  log: any,
  member: discord.GuildMember
) {
  if (member.user.bot === false) return;
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildMemberAdd', log['message']);
    return;
  }
  console.log('AL_OnGuildMemberAdd', log, member);

  let user = log.user;
  const richEmbed = new discord.Embed();
  richEmbed.setTitle('Bot Add Log').setColor(0x00ff00);
  let desc = `${member.user.toMention()} was added to the server by ${user.toMention()}`;
  if (log.reason && log.reason.length > 0) desc += `for \`${log.reason}\``;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.setTimestamp(new Date().toISOString());
  let chan = (await discord.getChannel(
    '565325743278653461'
  )) as discord.GuildTextChannel;
  if (chan === null) return;

  await chan.sendMessage({
    content: '',
    allowedMentions: {},
    embed: richEmbed
  });
}

export async function AL_OnGuildEmojisUpdate(
  id: string,
  log: any,
  emojis: discord.Event.IGuildEmojisUpdate,
  oldEmojis: discord.Event.IGuildEmojisUpdate
) {
  if (!(log instanceof discord.AuditLogEntry)) {
    //console.log('AL_OnGuildEmojisUpdate', log['message']);
    return;
  }
  console.log('AL_OnGuildEmojisUpdate', log, emojis, oldEmojis);
  let changedEmoji = emojis.emojis.find(
    (e: discord.Emoji) => e.id === log.targetId
  );
  let user = log.user;
  const richEmbed = new discord.Embed();
  /*
  richEmbed.setTitle('Guild Emojis Update').setColor(0x00ff00);
  let desc = `${ban.user.toMention()} was unbanned by ${user.toMention()}`;
  if (log.reason && log.reason.length > 0) desc += `for \`${log.reason}\``;
  richEmbed.setDescription(desc);
  richEmbed.setThumbnail({ url: user.getAvatarUrl() });
  richEmbed.addField({
    name: 'User ID Unbanned',
    value: ban.user.id,
    inline: true
  });
  richEmbed.addField({
    name: 'User ID Author',
    value: user.id,
    inline: true
  });
  richEmbed.setTimestamp(new Date().toISOString());*/

  //await logChan('', richEmbed);
}

//const event = 'GUILD_BAN_ADD';
/*discord.on('GUILD_EMOJIS_UPDATE', async function(...args) {
  console.log('GUILD_EMOJIS_UPDATE', ...args);
});*/
