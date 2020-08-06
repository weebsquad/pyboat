import * as conf from '../config';
import { pad, swapKV } from './utils';
import { EntitlementTypeEnum, Epoch } from '../constants/constants';
//import { bigInt } from './bigint';
import { Permissions } from './bitField';
const config = conf.config;
export class FakeConsole {
  private channel: discord.ITextChannel;
  private timeout: number | null = null;
  private toRender: any[] = [];
  private rendered: string = '';
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
        if (typeof item == 'object') return JSON.stringify(item);
        else if (typeof item == 'symbol') return item.toString();
        else return `${item}`;
      })
      .join('\n');
    this.rendered += rendered;

    const messageContents = this.renderedToMessageContent();
    const editPromises = this.messages
      .map((message, index) => {
        if (message.content != messageContents[index])
          return message.edit({ content: messageContents[index] });
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
    if (matches == null) throw new Error('Expectation failed.');
    return matches.map((match) => `\`\`\`\n${match}\`\`\``);
  }

  public log(argument: any) {
    if (this.timeout != null) clearTimeout(this.timeout);
    this.toRender.push(argument);
    let _tm = setTimeout(this.timeoutHandler.bind(this), 50);
    if(typeof(_tm) === 'number') this.timeout = _tm;
  }
}

import { metalApiRequest } from './metalApi';

export function getPermsBitfieldArray(bitf: number) {
  let bitField = 0;

  let bitperms = [];
  for (let i = 0; i < 32; i+=1) {
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
    console.log(key, _c);
    if (_c === PermissionFlags[key]) {
      newp[key] = true;
    } else {
      newp[key] = false;
    }
  }
  return newp;
}
*/
export async function getGuildMemberPermissions(member: discord.GuildMember) {
  let roles = await getUserRoles(member);
  let bitField = 0;
  roles.forEach(function(role: discord.Role) {
    let perms = role.permissions;
    let bitperms = [];
    for (let i = 0; i < 32; i+=1) {
      bitperms[i] = (perms >> i) & 1;
      if (!((bitField & bitperms[i]) === bitperms[i])) {
        bitField += perms >> i;
      }
    }
  });
}

export async function guildMemberHasPermission(
  member: discord.GuildMember,
  type
) {}

export function getSnowflakeDate(snowflake: string) {
  let snowflakeData = decomposeSnowflake(snowflake);
  return snowflakeData.timestamp;
}
function parseBigInt(str, base: any=10) {
    base = BigInt(base)
    var bigint = BigInt(0)
    for (var i = 0; i < str.length; i+=1) {
      var code = str[str.length-1-i].charCodeAt(0) - 48; if(code >= 10) code -= 39
      bigint += base**BigInt(i) * BigInt(code)
    }
    return bigint
  }

let INCREMENT = 0;
export function composeSnowflake(timestamp: any = Date.now()) {
  if (timestamp instanceof Date) timestamp = timestamp.getTime();
  if (INCREMENT >= 4095) INCREMENT = 0;
  const BINARY = `${pad((timestamp - Epoch).toString(2), 42)}0000100000${pad(
    (INCREMENT+=1).toString(2),
    12
  )}`;
  const _ret = parseBigInt(BINARY, 2).toString();
  return _ret;
}

export function decomposeSnowflake(snowflake: string) {
  //let binary = pad(bigInt(snowflake, 10, undefined, undefined).toString(2), 64);
  let binary = pad(BigInt(snowflake).toString(2), 64);
  const res = {
    timestamp: parseInt(binary.substring(0, 42), 2) + Epoch,
    workerID: parseInt(binary.substring(42, 47), 2),
    processID: parseInt(binary.substring(47, 52), 2),
    increment: parseInt(binary.substring(52, 64), 2),
    binary: binary
  };
  return res;
}

export async function getUserRoles(member: discord.GuildMember) {
  let roleIds = member.roles;
  let roles = [];
  let guildRoles = await (await discord.getGuild(member.guildId)).getRoles();
  guildRoles.forEach(function(role: discord.Role) {
    if (roleIds.indexOf(role.id) > -1) roles.push(role);
  });
  return roles;
}

export async function getUser(userId: string) {
  let userData;
  try {
    userData = await discord.getUser(userId);
  } catch (e) {}
  if (typeof userData !== 'undefined') return userData;
  let data = await metalApiRequest(
    config.global.game.botToken,
    `users/${userId}`,
    'GET',
    null
  );
  try {
    let res = await data.json();
    res.getTag = function() {
      return res.username + '#' + res.discriminator;
    };
    res.getAvatarUrl = function() {
      return `https://cdn.discordapp.com/avatars/${userId}/${res.avatar}`;
    };
    return res;
  } catch (e) {
    console.error(e);
    console.error(data);
    return;
  }
}

export async function getUserEntitlements(
  userId: string,
  appId: string,
  skuId: string,
  seperateBranches = false
) {
  let res = await metalApiRequest(
    config.global.game.botToken,
    `applications/${appId}/entitlements?user_id=${userId}&sku_ids=${skuId}&with_payments=true`,
    'GET',
    null
  );
  let data = await res.json();
  let mainData = {
    branches: {},
    type: 'none'
  };
  let masterBranchId = swapKV(config.global.game.applicationBranches)['master'];
  let typesId = swapKV(EntitlementTypeEnum);
  data.forEach(function(table) {
    if (
      table.user_id === userId &&
      table.application_id === appId &&
      table.sku_id === skuId
    ) {
      let typeText = typesId[table.type];
      let branchId = masterBranchId;
      if (typeof table.branches !== 'undefined') branchId = table.branches[0];
      let branchData = {
        type: 'none'
      };

      branchData.type = typeText;
      for (var key in table) {
        if (typeof branchData[key] === 'undefined' && key !== 'branches')
          branchData[key] = table[key]; // Add missing params
      }
      mainData['branches'][branchId] = branchData;
    }
  });
  if (mainData.branches[masterBranchId])
    mainData['type'] = mainData.branches[masterBranchId].type;
  if (
    seperateBranches === true &&
    typeof mainData.branches[masterBranchId] !== 'undefined'
  ) {
    mainData['master'] = mainData.branches[masterBranchId];
    delete mainData.branches[masterBranchId];
  }
  return mainData;
}



export function getUserAuth(mem: discord.GuildMember) {
  let highest = 0;
  const usrLevel = config.levels.users[mem.user.id];
  if(typeof usrLevel === 'number' && usrLevel > highest) highest = usrLevel;
  for(var key in config.levels.roles) {
      const roleLevel = config.levels.roles[key];
      if(mem.roles.includes(key) && roleLevel > highest) highest = roleLevel;
  }
  return highest;
}

export function canMemberRun(neededLevel: number, member: discord.GuildMember) {
    if(conf.isGlobalAdmin(member.user.id)) return true; // todo: OVERRIDES
    const usrLevel = getUserAuth(member);
    return usrLevel >= neededLevel;
}

export async function sendWebhookPost(
  webhook_id: string,
  content: string | Array<discord.Embed>,
  avatar_url: string,
  username: string
) {
  let _txt = '.';
  if (typeof content === 'string') _txt = content;
  webhook_id = webhook_id
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('');
  if (webhook_id.length < 2) return false;
  let body = {
    content: _txt,
    username: username,
    avatar_url: avatar_url
  } as any;
  if (content instanceof discord.Embed) {
    //body['embeds'] = JSON.parse(JSON.stringify(content));
  }
  let res = await metalApiRequest('', `webhooks/${webhook_id}`, 'POST', body);
  try {
    let resp = await res.json();
    return resp;
  } catch (e) {
    return true;
  }
}

const embedsRemaps = {
  author: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url'
  },
  thumbnail: {
    proxyUrl: 'proxy_url'
  },
  footer: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url'
  },
  image: {
    proxyUrl: 'proxy_url'
  }
} as any;
export async function sendWebhookPostComplex(webhook_id: string, data: any) {
  webhook_id = webhook_id
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('');
  if (webhook_id.length < 2) return false;
  if (Array.isArray(data.embeds)) {
    data.embeds = JSON.parse(JSON.stringify(data.embeds));
    data.embeds = data.embeds.map(function(e: any) {
      for (let key in embedsRemaps) {
        let value = embedsRemaps[key];
        if (typeof e[key] === 'undefined' || e[key] === null) continue;
        for (let prop in value) {
          let conv = value[prop];
          if (typeof e[key][prop] === 'undefined' || e[key][prop] === null)
            continue;
          e[key][conv] = e[key][prop];
          delete e[key][prop];
        }
      }
      return e;
    });
  }
  let body = {} as any;
  for (let k in data) {
    body[k] = JSON.parse(JSON.stringify(data[k]));
  }

  let res = await metalApiRequest('', `webhooks/${webhook_id}`, 'POST', body);
  //console.log(body, res.status, res.statusText, res.ok);
  try {
    let resp = await res.json();
    //console.log(resp);
    return resp;
  } catch (e) {
    return true;
  }
}
