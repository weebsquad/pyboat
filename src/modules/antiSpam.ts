import {ConfigError, guildId, config} from '../config'
import * as utils from '../lib/utils';


const pools = new pylon.KVNamespace('antiSpam');

const VALID_ACTIONS_INDIVIDUAL = ['KICK', 'SOFTBAN', 'BAN', 'MUTE', 'TEMPMUTE', 'TEMPBAN'];
const MAX_POOL_ENTRY_LIFETIME = 120 * 1000;
const ACTION_REASON = 'Too many spam violations';
const MAX_POOL_SIZE = 7500;
class MessageEntry {
    authorId: string;
    id: string;
    ts: number;
    content: string;
    attachments: number | undefined = undefined;
    attachmentHashes: Array<string> | undefined = undefined;
    newlines: number | undefined = undefined;
    constructor(message: discord.GuildMemberMessage) {
      this.attachments = message.attachments.length > 0 ? message.attachments.length : undefined;
      this.authorId = message.author.id;
      this.id = message.id;
      this.ts = utils.decomposeSnowflake(this.id).timestamp;
      this.content = message.content;
    }
}


export async function cleanPool() {
    const diff = Date.now();
    const items = await pools.items();
    await Promise.all(items.map(async function(item: any) {
        const vl: Array<MessageEntry> = item.value;
        const key = item.key;
        let toRemove = vl.filter((e) => diff > (MAX_POOL_ENTRY_LIFETIME+e.ts)).map((e) => e.id);
        

        if(toRemove.length > 0) {
            // console.log(`[${key}] toRemove: ${toRemove.length}`);
            await pools.transact(key, function(prev: any) {
                return prev.filter((e: MessageEntry) => !
                toRemove.includes(e.id))
            });
        }
    }))
}
export async function editPool(msg: discord.GuildMemberMessage) {
    console.log(`Editing ${msg.id}`);
    const newObj = new MessageEntry(msg);
  const items = await pools.items();
  const res = items.find((item: any) => item.value.find((e: MessageEntry) => e.id === msg.id) !== undefined);
  if(res) {
      for(var i = 0; i <2; i+=1) {
          try {
            await pools.transact(res.key, function(prev: any) {
                const _ind = prev.findIndex((e: MessageEntry) => e.id === msg.id);
                if(_ind !== -1) prev[_ind] = newObj;
                return prev;
            });
            return true;
          } catch(e) {
          }
        }
    return false;
  }

  return false;
}
export async function saveToPool(msg: discord.GuildMemberMessage) {
  const newObj = JSON.parse(JSON.stringify(new MessageEntry(msg)));
  const thisLen = new TextEncoder().encode(JSON.stringify(newObj)).byteLength;
  const items = await pools.items();
    let saveTo;
  const res = items.every((item: any) => {
    if (!Array.isArray(item.value)) {
      return true;
    }
    const _entries: Array<MessageEntry> = item.value;
    const len = (new TextEncoder().encode(JSON.stringify(_entries)).byteLength)+thisLen;
    if(len < MAX_POOL_SIZE) {
        saveTo = item.key;
        return false;
    }
    return true;
  });
  if (res === true) {
    await pools.put(utils.composeSnowflake(), [newObj]);
    return true;
  }
  if(res === false && typeof saveTo === 'string') {
      for(var i = 0; i <2; i+=1) {
          try {
            await pools.transact(saveTo, function(prev: any) {
                return prev.concat(newObj);
            });
            return true;
          } catch(e) {
          }
        }
    return false;
  }

  return false;
}
export async function getAllPools(): Promise<Array<MessageEntry>> {
  const items = await pools.items();
  const _ret: Array<MessageEntry> = [];
  items.map((e: any) => {
    if (Array.isArray(e.value)) {
      _ret.push(...e.value);
    }
  });
  return _ret;
}


export async function OnMessageCreate(
    id: string,
    gid: string,
    message: discord.Message,
  ) {
      if(!(message instanceof discord.GuildMemberMessage) || message.author.bot === true || message.webhookId !== null || typeof message.webhookId === 'string' || message.flags !== 0 || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT) return;
      if(utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') return;
      await saveToPool(message);
  }
  export async function OnMessageUpdate(
    id: string,
    gid: string,
    message: discord.Message.AnyMessage,
    oldMessage: discord.Message.AnyMessage,
  ) {
      if(!(message instanceof discord.GuildMemberMessage) || message.author.bot === true || message.webhookId !== null || message.flags !== 0 || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT || oldMessage === null || message.content === oldMessage.content) return;
      if(utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') return;
      const lf = Date.now() - utils.decomposeSnowflake(message.id).timestamp;
      if(lf > MAX_POOL_ENTRY_LIFETIME) return;
        await editPool(message);
    }