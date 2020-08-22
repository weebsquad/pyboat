import { config } from '../config';
import * as utils from '../lib/utils';

const kv = new pylon.KVNamespace('counting');

function isNormalInteger(str) {
  const n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && n >= 0;
}

function isPinnable(num: number) {
  if (
    !config.modules.counting.autoPins
    || !config.modules.counting.autoPins.repeating
    || !config.modules.counting.autoPins.repeatingLast
    || !config.modules.counting.autoPins.single
  ) {
    return;
  }
  if (config.modules.counting.autoPins.single.indexOf(num) > -1) {
    return true;
  }
  const checkRep = config.modules.counting.autoPins.repeating.find((numbr) => num % numbr === 0);
  if (typeof checkRep === 'number') {
    return true;
  }
  const checkRepLast = config.modules.counting.autoPins.repeatingLast.find((numbr) => {
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
    let testn = await kv.get(`counting_current${channelid}`);
    if (typeof testn === 'number') num = testn;
  } catch (e) {}

  let lastUsr;
  try {
    let testid = await kv.get(`counting_lastuser${channelid}`);
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
  if (config.modules.counting.channels.indexOf(message.channelId) === -1) {
    return;
  }
  if (
    (message.type !== discord.Message.Type.DEFAULT
      || typeof message.webhookId === 'string')
    && config.modules.counting.useWebhook
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
    await delet(message);
    return;
  }

  if (
    cont === 'RESET'
    && message.member.can(discord.Permissions.MANAGE_MESSAGES)
  ) {
    try {
      await kv.delete(`counting_lastuser${message.channelId}`);
      await kv.delete(`counting_lastmid${message.channelId}`);
      await kv.delete(`counting_current${message.channelId}`);
    } catch (e) {}
    (await message.getChannel()).sendMessage(
      `**Count has been reset by ${message.author.getTag()}**`,
    );
    await updateTopic(message.channelId);
    await delet(message);
    return;
  } if (
    cont.split(' ')[0] === 'SET'
    && cont !== 'SET'
    && message.member.can(discord.Permissions.MANAGE_MESSAGES)
  ) {
    const num = +cont.split(' ')[1];
    try {
      await kv.put(`counting_current${message.channelId}`, num);
      await kv.delete(`counting_lastmid${message.channelId}`);
      await kv.delete(`counting_lastuser${message.channelId}`);
    } catch (e) {}
    (await message.getChannel()).sendMessage(
      `**Count has been set to ${num} by ${message.author.getTag()}**`,
    );
    await updateTopic(message.channelId);
    await delet(message);
    return;
  }
  if (!isNormalInteger(cont)) {
    await delet(message);
    return;
  }
  let num = 0;

  try {
    const testn = await kv.get(`counting_current${message.channelId}`);
    if (typeof testn === 'number') {
      num = testn;
    }
  } catch (e) {}
  if (cont !== (num + 1).toString()) {
    await delet(message);
    return;
  }
  let lastUsr;
  try {
    const testid = await kv.get(`counting_lastuser${message.channelId}`);
    if (typeof testid === 'string') {
      lastUsr = testid;
    }
  } catch (e) {}
  if (typeof lastUsr === 'string' && lastUsr === message.author.id) {
    await delet(message);
    return;
  }

  kv.put(`counting_lastmid${message.channelId}`, message.id);
  await kv.put(`counting_current${message.channelId}`, num + 1);
  await kv.put(`counting_lastuser${message.channelId}`, message.author.id);
  updateTopic(message.channelId);
  if (isPinnable(+message.content) && !config.modules.counting.useWebhook) {
    await message.setPinned(true);
  }
  if (config.modules.counting.useWebhook) {
    delet(message);
    await utils.sendWebhookPost(
      config.modules.counting.webhook,
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
    const testn = await kv.get(`counting_current${message.channelId}`);
    if (typeof testn === 'number') {
      num = testn;
    }
  } catch (e) {}
  let lastId;
  try {
    const testn = await kv.get(`counting_lastmid${message.channelId}`);
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
  await kv.put(`counting_current${message.channelId}`, num - 1);
  await kv.delete(`counting_lastuser${message.channelId}`);
  await kv.delete(`counting_lastmid${message.channelId}`);
  updateTopic(message.channelId);
}

export async function OnMessageDelete(
  id: string,
  guildId: string,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.GuildMemberMessage | null,
) {
  if (config.modules.counting.channels.indexOf(messageDelete.channelId) === -1) {
    return;
  }
  if (
    (oldMessage.author === null
      || oldMessage.member === null
      || typeof oldMessage.webhookId === 'string')
    && !config.modules.counting.useWebhook
  ) {
    return;
  }
  if (typeof oldMessage.webhookId !== 'string' && config.modules.counting.useWebhook) {
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
  if (config.modules.counting.channels.indexOf(oldMessage.channelId) === -1 || config.modules.counting.useWebhook) {
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
    await delet(message);
    return;
  }
  if (contOld === contNew) {
    return;
  }

  await delet(message);
}
