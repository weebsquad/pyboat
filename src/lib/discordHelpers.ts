/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prefer-destructuring */
import * as conf from '../config';
import { pad, swapKV, logError, makeFake, escapeString } from './utils';
import { EntitlementTypeEnum, Epoch } from '../constants/constants';

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

export async function parseMentionables(txt: string): Promise<string> {
  const usrIds = new Map<string, string>();
  const channelIds = new Map<string, discord.GuildChannel>();
  const roleIds = new Map<string, discord.Role>();
  let usr1 = txt.match(/<@![0-9]{18}>/g);
  if (usr1) {
    usr1 = usr1.map((e) => {
      e = e.split(' ').join('');
      e = e.substr(3).slice(0, -1);
      return e;
    });
  } else {
    usr1 = [];
  }
  let usr2 = txt.match(/<@[0-9]{18}>/g);
  if (usr2) {
    usr2 = usr2.map((e) => {
      e = e.split(' ').join('');
      e = e.substr(2).slice(0, -1);
      return e;
    });
  } else {
    usr2 = [];
  }
  const users = [...usr1, ...usr2];
  let roles = txt.match(/<@&[0-9]{18}>/g);
  if (Array.isArray(roles)) {
    roles = roles.map((e) => {
      e = e.split(' ').join('');
      e = e.substr(3).slice(0, -1);
      return e;
    });
  }

  let channels = txt.match(/<#[0-9]{18}>/g);
  if (Array.isArray(channels)) {
    channels = channels.map((e) => {
      e = e.split(' ').join('');
      e = e.substr(2).slice(0, -1);
      return e;
    });
  }

  if (users.length > 0) {
    await Promise.allSettled(
      users.map(async (u) => {
        if (!usrIds.has(u)) {
          const _usr = await discord.getUser(u);
          if (!_usr) {
            return;
          }
          usrIds.set(u, _usr.getTag());
        }
      }),
    );
    for (const [id, tag] of usrIds) {
      txt = txt.replace(`<@!${id}>`, `@${tag}`);
      txt = txt.replace(`<@${id}>`, `@${tag}`);
    }
  }
  if (Array.isArray(channels)) {
    await Promise.all(
      channels.map(async (u) => {
        if (!channelIds.has(u) && u !== discord.getBotId()) {
          const chan2 = (await discord.getChannel(u));
          if (chan2 instanceof discord.DmChannel) {
            return;
          }
          if (!chan2) {
            return;
          }
          channelIds.set(u, chan2);
        }
      }),
    );
    for (const [id, ch] of channelIds) {
      let ico = '#';
      if (ch.type === discord.Channel.Type.GUILD_VOICE) {
        ico = '🔊';
      }
      if (ch.type === discord.Channel.Type.GUILD_STAGE_VOICE) {
        ico = '🎙️';
      }
      if (ch.type === discord.Channel.Type.GUILD_CATEGORY) {
        ico = '‣';
      }
      txt = txt.split(`<#${ch.id}>`).join(ico + ch.name);
    }
  }

  if (Array.isArray(roles)) {
    const guild = await discord.getGuild();
    const guildRoles = (await guild.getRoles());
    roles.map(async (u) => {
      if (!channelIds.has(u)) {
        const thisR = guildRoles.find((v) => v.id === u);
        if (thisR) {
          roleIds.set(u, thisR);
        }
      }
    });
    for (const [id, rl] of roleIds) {
      if (id === guild.id) {
        txt = txt.split(`<@&${id}>`).join(escapeString('@everyone'));
        continue;
      }
      const ico = '🛡️';

      txt = txt.split(`<@&${id}>`).join(ico + rl.name);
    }
  }

  return txt;
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
export function getDiscordTimestamp(ts: number | Date, flags?: string): string {
  if(ts instanceof Date) ts = ts.getTime();
  if(ts > 1000000000000) ts = ts/1000;
  ts = Math.floor(ts);
  return `<t:${ts}${flags ? `:${flags}` : '' }>`
}

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

export function getPermDiffs(chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
  const ret: {[key: string]: Array<discord.Channel.IPermissionOverwrite>} = {
    added: [],
    removed: [],
    changed: [],
  };
  const newOv = chan.permissionOverwrites;
  const oldOv = oldChan.permissionOverwrites;
  newOv.map((e) => {
    const _f = oldOv.find((obj) => obj.id === e.id);
    if (!_f) {
      if (!ret.added.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.added.push(e);
      }
    } else if (e.allow !== _f.allow || e.deny !== _f.deny || e.type !== _f.type) {
      if (!ret.changed.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.changed.push(e);
      }
    }
  });
  oldOv.map((e) => {
    const _f = newOv.find((obj) => obj.id === e.id);
    if (!_f) {
      if (!ret.removed.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.removed.push(e);
      }
    } else if (e.allow !== _f.allow || e.deny !== _f.deny || e.type !== _f.type) {
      if (!ret.changed.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.changed.push(e);
      }
    }
  });
  return ret;
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
