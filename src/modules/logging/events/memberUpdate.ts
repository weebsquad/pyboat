import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  if (isIgnoredUser(member)) {
    return [];
  }
  const keys = [];
  if (member.nick !== oldMember.nick) {
    keys.push('nickname');
  }
  let rlf = false;
  member.roles.forEach((rl) => {
    if (oldMember.roles.indexOf(rl) === -1) {
      rlf = true;
    }
  });
  oldMember.roles.forEach((rl) => {
    if (member.roles.indexOf(rl) === -1) {
      rlf = true;
    }
  });
  if (rlf) {
    keys.push('roles');
  }
  if (member.user.username !== oldMember.user.username) {
    keys.push('username');
  }
  if (member.user.avatar !== oldMember.user.avatar) {
    keys.push('avatar');
  }
  if (member.premiumSince !== oldMember.premiumSince) {
    keys.push('boost');
  }
  if (member.user.discriminator !== oldMember.user.discriminator) {
    keys.push('discriminator');
  }
  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  member: discord.GuildMember,
) {
  if (['avatar', 'username', 'boost'].indexOf(key) > -1) {
    return false;
  }
  return log.userId !== member.user.id;
}

export const messages = {
  boost(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    const mp = new Map([['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id], ['USER', member.user]]);
    let type = '';
    if (member.premiumSince !== null && oldMember.premiumSince === null) {
      type = 'BOOSTING_STARTED';
    } else if (
      member.premiumSince === null
      && oldMember.premiumSince !== null
    ) {
      type = 'BOOSTING_STOPPED';
    }
    if (type === '') {
      return false;
    }
    mp.set('TYPE', type);
    return mp;
  },
  discriminator(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    return new Map([
      ['USERTAG', getMemberTag(member)],
      ['TYPE', 'DISCRIMINATOR_CHANGED'],
      ['OLD_DISCRIMINATOR', oldMember.user.discriminator],
      ['NEW_DISCRIMINATOR', member.user.discriminator],
      ['USER_ID', member.user.id],
      ['USER', member.user],
    ]);
  },
  username(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    return new Map([
      ['USERTAG', getMemberTag(member)],
      ['TYPE', 'USERNAME_CHANGED'],
      ['OLD_USERNAME', oldMember.user.username],
      ['NEW_USERNAME', member.user.username],
      ['USER_ID', member.user.id],
      ['USER', member.user],
    ]);
  },
  async avatar(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    const mp = new Map([['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id], ['USER', member.user]]);
    let type = '';
    if (member.user.avatar === null && oldMember.user.avatar !== null) {
      type = 'AVATAR_REMOVED';
      mp.set('OLD_AVATAR', oldMember.user.getAvatarUrl());
      const data = await (await fetch(oldMember.user.getAvatarUrl())).arrayBuffer();
      mp.set('ATTACHMENTS', [{ name: `avatar.${oldMember.user.getAvatarUrl().split('.').slice(-1)[0].split('?')[0]}`, data, url: oldMember.user.getAvatarUrl() }]);
    } else if (member.user.avatar !== null && oldMember.user.avatar === null) {
      type = 'AVATAR_ADDED';
      mp.set('NEW_AVATAR', member.user.getAvatarUrl());
      const data = await (await fetch(member.user.getAvatarUrl())).arrayBuffer();
      mp.set('ATTACHMENTS', [{ name: `avatar.${member.user.getAvatarUrl().split('.').slice(-1)[0].split('?')[0]}`, data, url: member.user.getAvatarUrl() }]);
    } else {
      type = 'AVATAR_CHANGED';
      mp.set('NEW_AVATAR', member.user.getAvatarUrl());
      mp.set('OLD_AVATAR', oldMember.user.getAvatarUrl());
      const data = await (await fetch(member.user.getAvatarUrl())).arrayBuffer();
      mp.set('ATTACHMENTS', [{ name: `avatar.${member.user.getAvatarUrl().split('.').slice(-1)[0].split('?')[0]}`, data, url: member.user.getAvatarUrl() }]);
    }

    mp.set('TYPE', type);
    return mp;
  },
  roles(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    const rolesAdded = [];
    const rolesRemoved = [];
    let type = '';
    const mp = new Map([['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id], ['USER', member.user]]);
    member.roles.forEach((rl) => {
      if (oldMember.roles.indexOf(rl) === -1) {
        rolesAdded.push(rl);
      }
    });
    oldMember.roles.forEach((rl) => {
      if (member.roles.indexOf(rl) === -1) {
        rolesRemoved.push(rl);
      }
    });
    if (rolesAdded.length > 0 && rolesRemoved.length === 0) {
      type = 'ROLES_ADDED';
      mp.set(
        'ADDED_ROLES',
        rolesAdded
          .map((e: string) => `<@&${e}>`)
          .join('  '),
      );
    } else if (rolesAdded.length === 0 && rolesRemoved.length > 0) {
      type = 'ROLES_REMOVED';
      mp.set(
        'REMOVED_ROLES',
        rolesRemoved
          .map((e: string) => `<@&${e}>`)
          .join('  '),
      );
    } else {
      type = 'ROLES_CHANGED';
      mp.set(
        'CHANGED_ROLES',
        rolesAdded
          .map((e: string) => `**+**<@&${e}>`)
          .concat(
            rolesRemoved.map((e: string) => `**-**<@&${e}>`),
          )
          .join('  '),
      );
    }
    mp.set('TYPE', type);
    return mp;
  },
  nickname(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    let type = '';
    const mp = new Map([['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id], ['USER', member.user]]);
    if (oldMember.nick === null && member.nick !== null) {
      type = 'NICK_ADDED';
      mp.set('NEW_NICK', member.nick);
    } else if (oldMember.nick !== null && member.nick === null) {
      type = 'NICK_REMOVED';
      mp.set('OLD_NICK', oldMember.nick);
    } else if (oldMember.nick !== null && member.nick !== null) {
      type = 'NICK_CHANGED';
      mp.set('NEW_NICK', member.nick);
      mp.set('OLD_NICK', oldMember.nick);
    }
    mp.set('TYPE', type);
    return mp;
  },
};

export async function AL_OnGuildMemberUpdate(
  id: string,
  guildId: string,
  log: any,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.GUILD_MEMBER_UPDATE,
    log,
    member,
    oldMember,
  );
}
