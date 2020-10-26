/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prefer-destructuring */
import * as conf from '../config';
import { pad, swapKV, logError, makeFake } from './utils';
import { EntitlementTypeEnum, Epoch } from '../constants/constants';
// import { bigInt } from './bigint';
import { Permissions } from './bitField';

const { config } = conf;

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

export function genTable(data: string[][]) {
  const longest = new Array(data[0].length).fill(0);
  for (const row of data) {
    for (let i = 0; i < row.length; i++) {
      if (row[i].length > longest[i]) {
        longest[i] = row[i].length;
      }
    }
  }

  let msg = '';
  for (const row of data) {
    for (let i = 0; i < row.length; i++) {
      msg += ` ${row[i]}${' '.repeat(longest[i] - row[i].length)} `;
      if (i < row.length - 1) {
        msg += '|';
      }
    }
    msg += '\n';
  }

  return `\`\`\`\n${msg}\`\`\``;
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
function parseBigInt(str: string, base: any = 10) {
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
  const roles: discord.Role[] = [];
  const guildRoles = await (await discord.getGuild(member.guildId))!.getRoles();
  guildRoles!.forEach((role: discord.Role) => {
    if (roleIds.indexOf(role.id) > -1) {
      roles.push(role);
    }
  });
  return roles;
}

export async function getMemberHighestRole(member: discord.GuildMember): Promise<discord.Role> {
  const gl = await member.getGuild();
  const rl = (await gl.getRoles()).filter((e) => member.roles.includes(e.id)).sort((a, b) => b.position - a.position);
  if (Array.isArray(rl) && rl.length === 0) {
    const def = await gl.getRole(gl.id);
    if (!def) {
      return makeFake<discord.Role>({}, discord.Role); // lol
    }
    return def;
  }
  return rl[0];
}
