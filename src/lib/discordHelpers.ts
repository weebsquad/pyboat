/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prefer-destructuring */
import * as conf from '../config';
import { pad, swapKV } from './utils';
import { EntitlementTypeEnum, Epoch } from '../constants/constants';
// import { bigInt } from './bigint';
import { Permissions } from './bitField';

import { metalApiRequest } from './metalApi';

const { config } = conf;

const ns = 'kv-manager';
const kv = new pylon.KVNamespace(ns);
const headerPrefix = 'header';
const dataPrefix = 'data';
const MAX_TAG_SIZE = 8100; // Give it a solid chunk of wiggle room b/c size estimation is inaccurate.

type id_type = string;
type item_type = pylon.Json;

interface DataPtr extends pylon.JsonObject {
  tag: number;
  id: id_type;
}
type DP2 = string; // Compressed data pointer.
interface KVMHeader extends pylon.JsonObject {
  // lock: number;
  blocks: Array<number>;
  dataptr: {
    [k: string]: DP2;
    // [k: string]: DataPtr;
  };
  nextID: number;
}
const newhdr: KVMHeader = {
  // lock: 1,
  blocks: [],
  dataptr: {},
  nextID: 161, // First printable utf-16 code appears here, printable up to 7424
};

interface KVDataTag extends pylon.JsonObject {
  // lock: number;
  size: number;
  data: {
    [id: string]: item_type;
  };
}
const emptyTag: KVDataTag = {
  // lock: 1,
  size: 0,
  data: {},
};

function sizeof(obj: pylon.Json) {
  return new TextEncoder().encode(JSON.stringify(obj)).byteLength;
}

// This pair of functions encodes a number in base 65535 as a string. (only really useful for >100)
function num2str(n: number) {
  let ret = '';
  do {
    ret += String.fromCharCode(n % 65535);
    n = (n / 65535) >> 0;
  } while (n > 0);
  return ret;
}
function str2num(s: string) {
  let num = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    num = 65535 * num + s.charCodeAt(i);
  }
  return num;
}

const compressDataPtr = (dptr: DataPtr): DP2 =>
  num2str(dptr.tag + 161) + dptr.id;
const expandDP2 = (dp2: DP2): DataPtr => ({ tag: str2num(dp2[0]) - 161, id: dp2.substr(1) });

const hdrNum = (hdrTag: string) => parseInt(hdrTag.substr(headerPrefix.length), 10);
const dataNum = (datTag: string) => parseInt(datTag.substr(dataPrefix.length), 10);
async function PromiseAny<T, V>(
  list: T[],
  mapFunction: (arg0: T) => Promise<V | undefined>,
  allFailed: () => Promise<V>,
): Promise<V> {
  return Promise.all(
    list.map(async (v) => {
      const out = await mapFunction(v);
      if (out !== undefined) {
        throw out;
      }
    }),
  )
    .then(allFailed)
    .catch((ret: V) => ret);
}

// KVManager manages the KV space for your bot, allowing you to store information more densely & bypass the 256 key limit.
//  - With 256 tags and 8kB per tag, we have 2MB space to play with.
//  - Future plan: Convert all items to bitstrings & then we can store more than 8kb in a key by splitting byte arrays.
//  - Current plan: Handle data storage > 2kb
//    - Support adding a chunk 'data1' when data0 fills up
//    - Support adding another header 'header1' when we have more than 8kb worth of keys (probs not happening)
//    - Request check-and-set with custom equality condition for faster setting
// Works by storing multiple `key` within each `tag` plus a few `header tag` to manage information & reduce search time.
class KVManager {
  protected static async getHeader(headerTag: string): Promise<KVMHeader> {
    const hdr = await kv.get<KVMHeader>(headerTag);
    if (hdr === undefined) {
      kv.put(headerTag, newhdr);
      return newhdr;
    }
    return hdr;
  }

  // Crazy ass asynchronous search. Looks through all headers for a key.
  //   Return: That header's tag plus the header object, or ['', undefined] if key is not found.
  protected static async findKeyHeader(
    key: string,
  ): Promise<[string, KVMHeader | undefined]> {
    const headers = (await kv.list({ from: headerPrefix })).filter((tag) =>
      tag.startsWith(headerPrefix));
    return PromiseAny<string, [string, KVMHeader | undefined]>(
      headers,
      async (hdrTag: string) => {
        const hdr = await KVManager.getHeader(hdrTag);
        if (key in hdr.dataptr) {
          return [hdrTag, hdr];
        }
      },
      async () => ['', undefined],
    );
  }

  protected static async findDataPtr(
    key: string,
  ): Promise<[DataPtr, string | undefined]> {
    const [hdrTag, hdr] = await KVManager.findKeyHeader(key);
    if (hdr === undefined) {
      return [{ tag: -1, id: '' }, undefined];
    }

    return [expandDP2(hdr.dataptr[key]), hdrTag];
  }

  protected static async incrementID(): Promise<number> {
    return (
      await kv.transactWithResult<KVMHeader, number>(
        'header0',
        (hdr = newhdr) => ({
          next: { ...hdr, nextID: hdr.nextID + 1 },
          result: hdr.nextID,
        }),
      )
    ).result;
  }

  // Creates/updates a header entry for a key
  protected static async updateKeyHdr(hdrTag: string, k: string, dp: DataPtr) {
    kv.transact<KVMHeader>(hdrTag, (hdr = newhdr) => {
      const ret = {
        ...hdr,
        dataptr: { ...hdr.dataptr, [k]: compressDataPtr(dp) },
      };
      return ret;
    });
  }

  // Deletes a key's header entry
  protected static async deleteKeyHdr(hdrTag: string, key: string) {
    kv.transact<KVMHeader>(hdrTag, (hdr) => {
      if (hdr === undefined) {
        return;
      }
      if (hdrTag !== 'header0' && Object.keys(hdr.dataptr).length === 1) {
        return;
      }
      const ret = { ...hdr, dataptr: { ...hdr.dataptr } };
      delete ret.dataptr[key];
      return ret;
    });
  }

  // Adds blocks to header if needed. Only first header has a blocklist
  protected static async addBlock(dataBlock: number) {
    kv.transact<KVMHeader>('header0', (hdr = newhdr) => {
      if (!(dataBlock in hdr.blocks)) {
        return { ...hdr, blocks: [...hdr.blocks, dataBlock] };
      }
      return hdr;
    });
  }

  // Remove a block from the header.
  protected static async removeBlock(dataBlock: number) {
    kv.transact<KVMHeader>('header0', (hdr = newhdr) => {
      if (dataBlock in hdr.blocks) {
        const ret = { ...hdr, blocks: [...hdr.blocks] };
        ret.blocks.splice(ret.blocks.indexOf(dataBlock), 1);
        return ret;
      }
    });
  }

  // Updates a key within a tag.
  protected static async updateKeyTag(dptr: DataPtr, v: item_type) {
    kv.transact<KVDataTag>(dataPrefix + dptr.tag, (prev = emptyTag) => {
      const ret = { ...prev, data: { ...prev.data, [dptr.id]: v } };
      ret.size = sizeof(ret);
      return ret;
    });
  }

  // Deletes a key within a tag
  protected static async deleteKeyTag(dptr: DataPtr) {
    const tag = dataPrefix + dptr.tag;
    await kv.transact<KVDataTag>(tag, (prev) => {
      if (prev === undefined) {
        return;
      }
      if (Object.keys(prev.data).length === 1) {
        return undefined;
      }
      const ret = { ...prev, data: { ...prev.data } };
      delete ret.data[dptr.id];
      ret.size = sizeof(ret);
      return ret;
    });
    const datum = await kv.get<KVDataTag>(tag);
    if (datum === undefined) {
      KVManager.removeBlock(dptr.tag);
    }
  }

  protected static async getData(dptr: DataPtr) {
    const tag = dataPrefix + dptr.tag;
    const datum = await kv.get<KVDataTag>(tag);
    return datum ? datum.data[dptr.id] : undefined;
  }

  protected static async itemUpdateWillFit(
    dptr: DataPtr,
    newValue: item_type,
  ): Promise<boolean> {
    const datum = await kv.get<KVDataTag>(dataPrefix + dptr.tag);
    if (datum === undefined) {
      return false;
    }
    const prevSize = sizeof({ [dptr.id]: datum.data[dptr.id] });
    const newSize = sizeof({ [dptr.id]: newValue });
    return datum.size - prevSize + newSize < MAX_TAG_SIZE;
  }

  // findEmptyTag finds a tag with enough space to fit a certain size.
  protected static async findEmptyTag(size: number): Promise<number> {
    const hdr = await KVManager.getHeader('header0'); // This one always header0

    return PromiseAny(
      hdr.blocks,
      async (blockNum) => {
        const datum = await kv.get<KVDataTag>(dataPrefix + blockNum);
        if ((datum ? datum.size : 0) + size < MAX_TAG_SIZE) {
          return blockNum;
        }
      },
      async () => {
        const newTagNum = hdr.blocks.length > 0 ? Math.max(...hdr.blocks) + 1 : 0;
        if (!(newTagNum in hdr.blocks)) {
          KVManager.addBlock(newTagNum);
        }
        return newTagNum;
      },
    );
  }

  protected static async findEmptyHdr(size: number): Promise<string> {
    const getNewHeader = async (headerNums: number[]): Promise<string> => {
      for (let i = 1; i < headerNums.length; ++i) {
        const v = headerNums[i] < 0 ? -headerNums[i] : headerNums[i];
        if (v < headerNums.length && headerNums[v] > 0) {
          headerNums[v] *= -1;
        }
      }
      for (let i = 1; i < headerNums.length; ++i) {
        if (headerNums[i] > 0) {
          return headerPrefix + i;
        }
      }
      return headerPrefix + headerNums.length;
    };
    const headers = (await kv.list({ from: headerPrefix })).filter((tag) =>
      tag.startsWith(headerPrefix));

    return PromiseAny(
      headers,
      async (hdrTag) => {
        const hdr = await KVManager.getHeader(hdrTag);
        if (sizeof(hdr) + size < MAX_TAG_SIZE) {
          return hdrTag;
        }
      },
      async () => getNewHeader(headers.map((str) => hdrNum(str))),
    );
  }

  static async get(key: string) {
    const [dptr, hdrFound] = await KVManager.findDataPtr(key);
    return hdrFound ? KVManager.getData(dptr) : undefined;
  }

  // Cases:
  //  Key doesn't exist yet
  //  Key already exists & enough space
  //  Key doesn't exist and needs to start a new tag
  //  Key already exists but needs to be moved to a new tag
  // Potentially 4 await calls, though I should only need 2 of them.
  //  - findDataPtr & findEmptyTag will look through all tags, cache them?
  static async set(key: string, value: pylon.Json) {
    let [dptr, hdrTag] = await KVManager.findDataPtr(key);
    let findNewTag = true;

    // Check for in-place update case. Its simpler.
    if (hdrTag) {
      findNewTag = !(await KVManager.itemUpdateWillFit(dptr, value));
      // If it exists but needs to be moved, we delete it from its original tag.
      if (findNewTag) {
        KVManager.deleteKeyTag(dptr);
      }
    } else {
      // If key does not exist yet, assign new id
      dptr.id = num2str(await KVManager.incrementID());
    }

    // If the value needs a new home, search for it here.
    if (findNewTag) {
      const size = sizeof({ [dptr.id]: value });
      dptr.tag = await KVManager.findEmptyTag(size);
      if (hdrTag === undefined) {
        const hdrSize = sizeof({ [key]: dptr });
        hdrTag = await KVManager.findEmptyHdr(hdrSize);
      }
      KVManager.updateKeyHdr(hdrTag, key, dptr);
    }

    KVManager.updateKeyTag(dptr, value);
  }

  static async delete(key: string) {
    const [dptr, hdrTag] = await KVManager.findDataPtr(key);
    if (hdrTag === undefined) {
      return;
    }

    KVManager.deleteKeyHdr(hdrTag, key);
    KVManager.deleteKeyTag(dptr);
  }

  static async tagsUsed() {
    return kv.count();
  }

  static async listKeys(): Promise<string[]> {
    const headers = (await kv.list({ from: headerPrefix })).filter((tag) =>
      tag.startsWith(headerPrefix));
    const keys = await Promise.all(
      headers.map(async (hdrTag) => {
        const hdr = await KVManager.getHeader(hdrTag);
        return Object.keys(hdr.dataptr);
      }),
    );
    return keys.flat(1);
  }

  static async numKeys() {
    return (await KVManager.listKeys()).length;
  }

  static async clear() {
    return kv.clear();
  }

  // Debug helper functions
  static async items() {
    return kv.items();
  }

  static async testfn() {}
}

export default KVManager;
export class FakeConsole {
  private channel: discord.ITextChannel;
  private timeout: number | null = null;
  private toRender: any[] = [];
  private rendered = '';
  private messages: discord.Message[] = [];

  constructor(channel: discord.ITextChannel) {
    this.channel = channel;
  }

  private async timeoutHandler() {
    this.timeout = null;
    const items = this.toRender;
    this.toRender = [];

    const rendered = items
      .map((item) => {
        if (typeof item === 'object') {
          return JSON.stringify(item);
        }
        if (typeof item === 'symbol') {
          return item.toString();
        }
        return `${item}`;
      })
      .join('\n');
    this.rendered += rendered;

    const messageContents = this.renderedToMessageContent();
    const editPromises = this.messages
      .map((message, index) => {
        if (message.content !== messageContents[index]) {
          return message.edit({ content: messageContents[index] });
        }
        return null;
      })
      .filter((promise) => promise != null);
    const sendPromises = messageContents
      .slice(this.messages.length, messageContents.length)
      .map((messageContent) => this.channel.sendMessage(messageContent));
    await Promise.all(editPromises.concat(sendPromises));
  }

  // Pure function, no side effects.
  private renderedToMessageContent(): string[] {
    const matches = this.rendered.match(/[\S\s]{1,1991}/g);
    if (matches == null) {
      throw new Error('Expectation failed.');
    }
    return matches.map((match) => `\`\`\`\n${match}\`\`\``);
  }

  public log(argument: any) {
    if (this.timeout != null) {
      clearTimeout(this.timeout);
    }
    this.toRender.push(argument);
    const _tm = setTimeout(this.timeoutHandler.bind(this), 50);
    if (typeof (_tm) === 'number') {
      this.timeout = _tm;
    }
  }
}

export function getPermsBitfieldArray(bitf: number) {
  let bitField = 0;

  const bitperms = [];
  for (let i = 0; i < 32; i += 1) {
    bitperms[i] = (bitf >> i) & 1;
    if (!((bitField & bitperms[i]) === bitperms[i])) {
      bitField += bitf >> i;
    }
  }
  return bitperms;
}
/*
export function parsePerms(bitf: number) {
  let newp = {} as any;
  for (var key in PermissionFlags) {
    let _c = (bitf >> PermissionFlags[key]) & 1;
    if (_c === PermissionFlags[key]) {
      newp[key] = true;
    } else {
      newp[key] = false;
    }
  }
  return newp;
}
*//*
export async function getGuildMemberPermissions(member: discord.GuildMember) {
  const roles = await getUserRoles(member);
  let bitField = 0;
  roles.forEach((role: discord.Role) => {
    const perms = role.permissions;
    const bitperms = [];
    for (let i = 0; i < 32; i += 1) {
      bitperms[i] = (perms >> i) & 1;
      if (!((bitField & bitperms[i]) === bitperms[i])) {
        bitField += perms >> i;
      }
    }
  });
} */
/*
export async function guildMemberHasPermission(
  member: discord.GuildMember,
  type,
) {
  // todo
  return false;
}
*/
export function getSnowflakeDate(snowflake: string) {
  const snowflakeData = decomposeSnowflake(snowflake);
  return snowflakeData.timestamp;
}
function parseBigInt(str, base: any = 10) {
  base = BigInt(base);
  let bigint = BigInt(0);
  for (let i = 0; i < str.length; i += 1) {
    let code = str[str.length - 1 - i].charCodeAt(0) - 48; if (code >= 10) {
      code -= 39;
    }
    bigint += base ** BigInt(i) * BigInt(code);
  }
  return bigint;
}

let INCREMENT = 0;
export function composeSnowflake(timestamp: any = Date.now()) {
  if (timestamp instanceof Date) {
    timestamp = timestamp.getTime();
  }
  if (INCREMENT >= 4095) {
    INCREMENT = 0;
  }
  const BINARY = `${pad((timestamp - Epoch).toString(2), 42)}0000100000${pad(
    (INCREMENT += 1).toString(2),
    12,
  )}`;
  const _ret = parseBigInt(BINARY, 2).toString();
  return _ret;
}

export function decomposeSnowflake(snowflake: string) {
  // let binary = pad(bigInt(snowflake, 10, undefined, undefined).toString(2), 64);
  const binary = pad(BigInt(snowflake).toString(2), 64);
  const res = {
    timestamp: parseInt(binary.substring(0, 42), 2) + Epoch,
    workerID: parseInt(binary.substring(42, 47), 2),
    processID: parseInt(binary.substring(47, 52), 2),
    increment: parseInt(binary.substring(52, 64), 2),
    binary,
  };
  return res;
}

export async function getUserRoles(member: discord.GuildMember) {
  const roleIds = member.roles;
  const roles = [];
  const guildRoles = await (await discord.getGuild(member.guildId)).getRoles();
  guildRoles.forEach((role: discord.Role) => {
    if (roleIds.indexOf(role.id) > -1) {
      roles.push(role);
    }
  });
  return roles;
}

export async function getMemberHighestRole(member: discord.GuildMember): Promise<discord.Role | null> {
  const gl = await member.getGuild();
  const rl = (await gl.getRoles()).filter((e) => member.roles.includes(e.id)).sort((a, b) => b.position - a.position);
  if (Array.isArray(rl) && rl.length === 0) {
    return null;
  }
  return rl[0];
}

export async function getUser(userId: string) {
  let userData;
  try {
    userData = await discord.getUser(userId);
  } catch (e) {}
  if (typeof userData !== 'undefined') {
    return userData;
  }
  const data = await metalApiRequest(
    config.global.game.botToken,
    `users/${userId}`,
    'GET',
    null,
  );
  try {
    const res = await data.json();
    res.getTag = function () {
      return `${res.username}#${res.discriminator}`;
    };
    res.getAvatarUrl = function () {
      return `https://cdn.discordapp.com/avatars/${userId}/${res.avatar}`;
    };
    return res;
  } catch (e) {

  }
}

export async function getUserEntitlements(
  userId: string,
  appId: string,
  skuId: string,
  seperateBranches = false,
) {
  const res = await metalApiRequest(
    config.global.game.botToken,
    `applications/${appId}/entitlements?user_id=${userId}&sku_ids=${skuId}&with_payments=true`,
    'GET',
    null,
  );
  const data = await res.json();
  const mainData: any = {
    branches: {},
    type: 'none',
  };
  const masterBranchId = swapKV(config.global.game.applicationBranches).master;
  const typesId = swapKV(EntitlementTypeEnum);
  data.forEach((table) => {
    if (
      table.user_id === userId
      && table.application_id === appId
      && table.sku_id === skuId
    ) {
      const typeText = typesId[table.type];
      let branchId = masterBranchId;
      if (typeof table.branches !== 'undefined') {
        branchId = table.branches[0];
      }
      const branchData = {
        type: 'none',
      };

      branchData.type = typeText;
      for (const key in table) {
        if (typeof branchData[key] === 'undefined' && key !== 'branches') {
          branchData[key] = table[key];
        } // Add missing params
      }
      mainData.branches[branchId] = branchData;
    }
  });
  if (mainData.branches[masterBranchId]) {
    mainData.type = mainData.branches[masterBranchId].type;
  }
  if (
    seperateBranches === true
    && typeof mainData.branches[masterBranchId] !== 'undefined'
  ) {
    mainData.master = mainData.branches[masterBranchId];
    delete mainData.branches[masterBranchId];
  }
  return mainData;
}

export async function sendWebhookPost(
  webhook_id: string,
  content: string | Array<discord.Embed>,
  avatar_url: string,
  username: string,
) {
  let _txt = '.';
  if (typeof content === 'string') {
    _txt = content;
  }
  webhook_id = webhook_id
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('');
  if (webhook_id.length < 2) {
    return false;
  }
  const body = {
    content: _txt,
    username,
    avatar_url,
  } as any;
  if (content instanceof discord.Embed) {
    // body['embeds'] = JSON.parse(JSON.stringify(content));
  }
  const res = await metalApiRequest('', `webhooks/${webhook_id}`, 'POST', body);
  try {
    const resp = await res.json();
    return resp;
  } catch (e) {
    return true;
  }
}

const embedsRemaps = {
  author: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url',
  },
  thumbnail: {
    proxyUrl: 'proxy_url',
  },
  footer: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url',
  },
  image: {
    proxyUrl: 'proxy_url',
  },
} as any;
export async function sendWebhookPostComplex(webhook_id: string, data: any) {
  if (webhook_id === undefined) {
    throw new Error('webhook_id not defined');
  }
  webhook_id = webhook_id
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('');
  if (webhook_id.length < 2) {
    return false;
  }
  if (Array.isArray(data.embeds)) {
    data.embeds = JSON.parse(JSON.stringify(data.embeds));
    data.embeds = data.embeds.map((e: any) => {
      for (const key in embedsRemaps) {
        const value = embedsRemaps[key];
        if (typeof e[key] === 'undefined' || e[key] === null) {
          continue;
        }
        for (const prop in value) {
          const conv = value[prop];
          if (typeof e[key][prop] === 'undefined' || e[key][prop] === null) {
            continue;
          }
          e[key][conv] = e[key][prop];
          delete e[key][prop];
        }
      }
      return e;
    });
  }
  const body = {} as any;
  for (const k in data) {
    body[k] = JSON.parse(JSON.stringify(data[k]));
  }

  const res = await metalApiRequest('', `webhooks/${webhook_id}`, 'POST', body);
  try {
    const resp = await res.json();
    return resp;
  } catch (e) {
    return true;
  }
}
