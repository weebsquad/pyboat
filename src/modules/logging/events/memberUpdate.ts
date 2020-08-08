import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
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
    const mp = new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]);
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
    mp.set('_TYPE_', type);
    return mp;
  },
  discriminator(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    const mp = new Map([
      ['_USERTAG_', getMemberTag(member)],
      ['_TYPE_', 'DISCRIMINATOR_CHANGED'],
      ['_OLD_DISCRIMINATOR_', oldMember.user.discriminator],
      ['_NEW_DISCRIMINATOR_', member.user.discriminator],
      ['_USER_ID_', member.user.id],
    ]);
    return mp;
  },
  username(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    const mp = new Map([
      ['_USERTAG_', getMemberTag(member)],
      ['_TYPE_', 'USERNAME_CHANGED'],
      ['_OLD_USERNAME_', oldMember.user.username],
      ['_NEW_USERNAME_', member.user.username],
      ['_USER_ID_', member.user.id],
    ]);
    return mp;
  },
  avatar(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    const mp = new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]);
    let type = '';
    if (member.user.avatar === null && oldMember.user.avatar !== null) {
      type = 'AVATAR_REMOVED';
      mp.set('_OLD_AVATAR_', oldMember.user.getAvatarUrl());
    } else if (member.user.avatar !== null && oldMember.user.avatar === null) {
      type = 'AVATAR_ADDED';
      mp.set('_NEW_AVATAR_', member.user.getAvatarUrl());
    } else {
      type = 'AVATAR_CHANGED';
      mp.set('_NEW_AVATAR_', member.user.getAvatarUrl());
      mp.set('_OLD_AVATAR_', oldMember.user.getAvatarUrl());
    }
    mp.set('_TYPE_', type);
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
    const mp = new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]);
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
        '_ADDED_ROLES_',
        rolesAdded
          .map((e: string) => `<@&${e}>`)
          .join('  '),
      );
    } else if (rolesAdded.length === 0 && rolesRemoved.length > 0) {
      type = 'ROLES_REMOVED';
      mp.set(
        '_REMOVED_ROLES_',
        rolesRemoved
          .map((e: string) => `<@&${e}>`)
          .join('  '),
      );
    } else {
      type = 'ROLES_CHANGED';
      mp.set(
        '_CHANGED_ROLES_',
        rolesAdded
          .map((e: string) => `**+**<@&${e}>`)
          .concat(
            rolesRemoved.map((e: string) => `**-**<@&${e}>`),
          )
          .join('  '),
      );
    }
    mp.set('_TYPE_', type);
    return mp;
  },
  nickname(
    log: discord.AuditLogEntry,
    member: discord.GuildMember,
    oldMember: discord.GuildMember,
  ) {
    let type = '';
    const mp = new Map([['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]);
    if (oldMember.nick === null && member.nick !== null) {
      type = 'NICK_ADDED';
      mp.set('_NEW_NICK_', member.nick);
    } else if (oldMember.nick !== null && member.nick === null) {
      type = 'NICK_REMOVED';
      mp.set('_OLD_NICK_', oldMember.nick);
    } else if (oldMember.nick !== null && member.nick !== null) {
      type = 'NICK_CHANGED';
      mp.set('_NEW_NICK_', member.nick);
      mp.set('_OLD_NICK_', oldMember.nick);
    }
    mp.set('_TYPE_', type);
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
