import { config } from '../config';
import * as utils from '../lib/utils';

const kv = new pylon.KVNamespace('counting');
const cfgMod = config.modules.counting;

function isNormalInteger(str) {
  const n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && n >= 0;
}

function isPinnable(num: number) {
  if (
    !cfgMod.autoPins
    || !cfgMod.autoPins.repeating
    || !cfgMod.autoPins.repeatingLast
    || !cfgMod.autoPins.single
  ) {
    return;
  }
  if (cfgMod.autoPins.single.indexOf(num) > -1) {
    return true;
  }
  const checkRep = cfgMod.autoPins.repeating.find((numbr) => num % numbr === 0);
  if (typeof checkRep === 'number') {
    return true;
  }
  const checkRepLast = cfgMod.autoPins.repeatingLast.find((numbr) => {
    const lastChars = num.toString().slice(-numbr.toString().length); // gets last character
    return lastChars === numbr.toString();
  });
  if (typeof checkRepLast === 'number') {
    return true;
  }
  return false;
}

async function updateTopic(channelid: string) {

  /*
  let chan = (await discord.getChannel(channelid)) as discord.GuildTextChannel;
  if (chan === null) return;
  let num: any = 0;
  try {
    let testn = await kv.get(`${cfgMod.keyCount}${channelid}`);
    if (typeof testn === 'number') num = testn;
  } catch (e) {}

  let lastUsr;
  try {
    let testid = await kv.get(`${cfgMod.keyLastUser}${channelid}`);
    if (typeof testid === 'string') lastUsr = testid;
  } catch (e) {}
  let txt = `Current: ${num}`;
  if (typeof lastUsr === 'string') txt += ` - Last counter: <@!${lastUsr}>`;
  if (chan.topic !== txt) await chan.edit({ topic: txt }); */
}

export async function OnMessageCreate(
  id: string,
  guildId: string,
  message: discord.Message,
) {
  if (cfgMod.channels.indexOf(message.channelId) === -1) {
    return;
  }
  if (
    (message.type !== discord.Message.Type.DEFAULT
      || typeof message.webhookId === 'string')
    && cfgMod.useWebhook
  ) {
    if (isPinnable(+message.content)) {
      await message.setPinned(true);
    }
    return false;
  }

  if (
    message.author === null
    || message.member === null
    || message.type !== discord.Message.Type.DEFAULT
    || typeof message.webhookId === 'string'
  ) {
    return;
  }

  const cont = message.content;

  async function delet(msg: discord.Message) {
    await msg.delete();
    return false;
  }
  if (message.author.bot === true) {
    return await delet(message);
  }

  if (
    cont === 'RESET'
    && message.member.can(discord.Permissions.MANAGE_MESSAGES)
  ) {
    try {
      await kv.delete(`${cfgMod.keyLastUser}${message.channelId}`);
      await kv.delete(`${cfgMod.keyLastMid}${message.channelId}`);
      await kv.delete(`${cfgMod.keyCount}${message.channelId}`);
    } catch (e) {}
    (await message.getChannel()).sendMessage(
      `**Count has been reset by ${message.author.getTag()}**`,
    );
    await updateTopic(message.channelId);
    return await delet(message);
  } if (
    cont.split(' ')[0] === 'SET'
    && cont !== 'SET'
    && message.member.can(discord.Permissions.MANAGE_MESSAGES)
  ) {
    const num = +cont.split(' ')[1];
    try {
      await kv.put(`${cfgMod.keyCount}${message.channelId}`, num);
      await kv.delete(`${cfgMod.keyLastMid}${message.channelId}`);
      await kv.delete(`${cfgMod.keyLastUser}${message.channelId}`);
    } catch (e) {}
    (await message.getChannel()).sendMessage(
      `**Count has been set to ${num} by ${message.author.getTag()}**`,
    );
    await updateTopic(message.channelId);
    return await delet(message);
  }
  if (!isNormalInteger(cont)) {
    return await delet(message);
  }
  let num = 0;

  try {
    const testn = await kv.get(`${cfgMod.keyCount}${message.channelId}`);
    if (typeof testn === 'number') {
      num = testn;
    }
  } catch (e) {}
  if (cont !== (num + 1).toString()) {
    return await delet(message);
  }
  let lastUsr;
  try {
    const testid = await kv.get(`${cfgMod.keyLastUser}${message.channelId}`);
    if (typeof testid === 'string') {
      lastUsr = testid;
    }
  } catch (e) {}
  if (typeof lastUsr === 'string' && lastUsr === message.author.id) {
    return await delet(message);
  }

  kv.put(`${cfgMod.keyLastMid}${message.channelId}`, message.id);
  await kv.put(`${cfgMod.keyCount}${message.channelId}`, num + 1);
  await kv.put(`${cfgMod.keyLastUser}${message.channelId}`, message.author.id);
  updateTopic(message.channelId);
  if (isPinnable(+message.content) && !cfgMod.useWebhook) {
    await message.setPinned(true);
  }
  if (cfgMod.useWebhook) {
    delet(message);
    await utils.sendWebhookPost(
      cfgMod.webhook,
      cont,
      message.author.getAvatarUrl(),
      message.author.getTag(),
    );
  }
  return false;
}

async function MessageDeletedChecks(message: discord.GuildMemberMessage) {
  const cont = message.content;
  let num = 0;
  try {
    const testn = await kv.get(`${cfgMod.keyCount}${message.channelId}`);
    if (typeof testn === 'number') {
      num = testn;
    }
  } catch (e) {}
  let lastId;
  try {
    const testn = await kv.get(`${cfgMod.keyLastMid}${message.channelId}`);
    if (typeof testn === 'string') {
      lastId = testn;
    }
  } catch (e) {}
  if (num < 1 || cont !== num.toString()) {
    return;
  }
  if (typeof lastId !== 'string' || lastId !== message.id) {
    return;
  }
  await kv.put(`${cfgMod.keyCount}${message.channelId}`, num - 1);
  await kv.delete(`${cfgMod.keyLastUser}${message.channelId}`);
  await kv.delete(`${cfgMod.keyLastMid}${message.channelId}`);
  updateTopic(message.channelId);
}

export async function OnMessageDelete(
  id: string,
  guildId: string,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.GuildMemberMessage | null,
) {
  if (cfgMod.channels.indexOf(messageDelete.channelId) === -1) {
    return;
  }
  if (
    (oldMessage.author === null
      || oldMessage.member === null
      || typeof oldMessage.webhookId === 'string')
    && !cfgMod.useWebhook
  ) {
    return;
  }
  if (typeof oldMessage.webhookId !== 'string' && cfgMod.useWebhook) {
    return false;
  }
  await MessageDeletedChecks(oldMessage);
  return false;
}
// export async function OnMessageDeleteBulk(messages) {}
export async function OnMessageUpdate(
  id: string,
  guildId: string,
  message: discord.Message,
  oldMessage: discord.GuildMemberMessage | null,
) {
  if (oldMessage === null) {
    return;
  }
  if (
    message.author.bot === true
    || message.type !== discord.Message.Type.DEFAULT
  ) {
    return;
  }
  if (cfgMod.channels.indexOf(oldMessage.channelId) === -1 || cfgMod.useWebhook) {
    return;
  }
  if (message.author === null || message.member === null) {
    return;
  }

  async function delet(msg: discord.Message) {
    await MessageDeletedChecks(oldMessage);
    await msg.delete();
    return false;
  }

  const contNew = message.content;
  const contOld = oldMessage.content;
  if (isNormalInteger(contOld) && !isNormalInteger(contNew)) {
    return await delet(message);
  }
  if (contOld === contNew) {
    return;
  }

  return await delet(message);
}
