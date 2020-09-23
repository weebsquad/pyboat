import { config } from '../config';
import * as utils from '../lib/utils';

async function refreshGuildMember(gid: string, uid: string) {
  const guild = await discord.getGuild(gid);
  if (guild === null) {
    throw new Error('guild not found');
  }
  const mem2 = await guild.getMember(uid);
  if (!(mem2 instanceof discord.GuildMember)) {
    throw new Error('member not found');
  }
  return mem2;
}

export async function OnGuildMemberUpdate(
  id: string,
  guildId: string,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  await checkUserRoles(
    await refreshGuildMember(member.guildId, member.user.id),
  );

  await checkHoist(await refreshGuildMember(member.guildId, member.user.id));

  await checkMemberSeperatorRoles(
    await refreshGuildMember(member.guildId, member.user.id),
  );
}

export async function OnGuildMemberAdd(
  id: string,
  guildId: string,
  member: discord.GuildMember,
) {
  await checkUserRoles(
    await refreshGuildMember(member.guildId, member.user.id),
  );

  await checkHoist(await refreshGuildMember(member.guildId, member.user.id));

  await checkMemberSeperatorRoles(
    await refreshGuildMember(member.guildId, member.user.id),
  );
}

async function updateAllMembers(guild: discord.Guild) {
  for await (const member of guild.iterMembers()) {
    await checkUserRoles(member);
    await checkHoist(member);
    await checkMemberSeperatorRoles(member);
  }
}

/* CHECK HOIST ROLES */
async function checkHoist(member: discord.GuildMember) {
  if (member.user.bot === true) {
    return;
  }
  const roles = await utils.getUserRoles(member);
  let hasHoist = false;
  roles.forEach((role: discord.Role) => {
    if (role.hoist === true && role.id !== config.modules.roleManagement.lowestHoistRole) {
      hasHoist = true;
    }
  });
  if (!hasHoist && roles.length > 0) {
    await member.addRole(config.modules.roleManagement.lowestHoistRole);
  } else {
    const hasLowestHoist = roles.find((o) => o.id === config.modules.roleManagement.lowestHoistRole);

    if (hasLowestHoist) {
      await member.removeRole(config.modules.roleManagement.lowestHoistRole);
    }
  }
}

/* USER/BOT ROLE MANAGEMENT */
export async function checkUserRoles(mem: discord.GuildMember) {
  if (mem.user.id === discord.getBotId()) {
    return;
  } // Don't trigger this on pylon, lol
  const roles = await utils.getUserRoles(mem);

  async function checkRoles(
    member: discord.GuildMember,
    normal: string,
    reduced: string,
    replaceOnly = false,
  ) {
    const hasReduced = roles.find((o) => o.id === reduced);
    const hasNormal = roles.find((o) => o.id === normal);

    if (!hasReduced && !hasNormal && !replaceOnly) {
      await member.addRole(reduced);
    } else if (hasReduced && hasNormal) {
      await member.removeRole(reduced);
    }
  }
  if (mem.user.bot === true) {
    await checkRoles(mem, config.modules.roleManagement.botRole, config.modules.roleManagement.botRoleRP, false);
    await checkRoles(mem, config.modules.roleManagement.botRoleRP, config.modules.roleManagement.memberRoleRP, true);
  } else {
    await checkRoles(mem, config.modules.roleManagement.memberRole, config.modules.roleManagement.memberRoleRP, true);
  }
}

/* SEPERATOR ROLES MANAGEMENT */
const colors = ['#2f3136', '#000000'];
const chars: {[key: string]: {amount: number, alphaAllowed: number}} = {
  '▬': {
    amount: 5,
    alphaAllowed: 8,
  },
  '󠇰': {
    amount: 7,
    alphaAllowed: 8,
  },
};
const defaultNeededSepChars = 5;

async function getMemberHighestRole(member: discord.GuildMember) {
  const rl = await (await member.getGuild()).getRole(member.roles[0]);
  return rl;
}

async function checkRolePerms(role: discord.Role) {
  if (isSeperatorRole(role)) {
    // if(role.permissions > 0 && role.guild.me.highestRole.position > role.position) {
    const guild = await discord.getGuild(role.guildId);
    if (guild === null) {
      return;
    }
    const mem = await guild.getMember(
      discord.getBotId(),
    );
    if (mem === null || mem === undefined) {
      return;
    }

    // if(mem.can(discord.Permissions.MANAGE_ROLES) && mem.)
    const highestRole = await getMemberHighestRole(mem);
    if (highestRole === null) {
      return;
    }
    if (role.permissions > 0 && highestRole.position > role.position) {
      role.edit({ permissions: 0 });
    }
  }
}

function isSeperatorRole(role: discord.Role) {
  let ret = false;
  for (const seperatorChar in chars) {
    const obj = chars[seperatorChar];
    let { amount } = obj;
    if (typeof amount !== 'number') {
      amount = defaultNeededSepChars;
    }
    if (role.name.indexOf(seperatorChar) > -1) {
      const strcount = role.name.split(seperatorChar).length - 1;
      if (
        strcount >= amount
        && colors.indexOf(utils.VBColorToHEX(role.color)) > -1
      ) {
        if (typeof obj.alphaAllowed === 'number') {
          const alpha = role.name.replace(/\W/g, '');
          if (alpha.length > obj.alphaAllowed) {
            continue;
          }
        }
        ret = true;
        break;
      }
    }
  }
  return ret;
}

async function getGuildSeperatorRoles(guild: discord.Guild) {
  const roles = await guild.getRoles();
  const ret = roles.filter((el: discord.Role) => {
    if (isSeperatorRole(el)) {
      checkRolePerms(el);
      return true;
    }
    return false;
  });
  return ret.reverse(); // reverse it because of role ordering for seperator checks
}

async function checkMemberSeperatorRoles(member: discord.GuildMember) {
  let rolesChanged = false;
  const guild = await member.getGuild();
  const guildMe = await guild.getMember(discord.getBotId());
  if (guildMe === null) {
    return;
  }
  const seps = await getGuildSeperatorRoles(guild);
  const guildRoles = await guild.getRoles();
  const roles = guildRoles
    .filter((el) => member.roles.indexOf(el.id) > -1)
    .reverse();
  let rolesAdd: discord.Role[] = [];
  let rolesRemove: discord.Role[] = [];
  if (seps.length < 1 || roles.length < 2) {
    return;
  }
  const sepPosMaps: {[key: string]: {[key: string]: number}} = {};
  const posArray: number[] = [];
  seps.forEach((sep) => {
    posArray.push(sep.position);
  });
  posArray.sort((a, b) => a - b);
  seps.forEach((sep1) => {
    let lowerLim = 0;
    let upperLim = 501;
    const thispos = sep1.position;
    for (let i = 0; i < posArray.length; i += 1) {
      if (posArray[i] !== thispos) {
        continue;
      }
      if (i > 0) {
        lowerLim = posArray[i - 1];
      }
      if (i < posArray.length - 1) {
        upperLim = posArray[i + 1];
      }
      const push = {
        upperLimit: upperLim,
        lowerLimit: lowerLim,
        position: thispos,
      };
      sepPosMaps[sep1.id] = push;
    }
  });

  const highestRole = await getMemberHighestRole(guildMe);
  if (highestRole === null) {
    return;
  }
  seps.forEach((sepRole) => {
    if (!isSeperatorRole(sepRole)) {
      return;
    }
    let { lowerLimit } = sepPosMaps[sepRole.id];
    const { upperLimit } = sepPosMaps[sepRole.id];
    lowerLimit = 0;
    if (
      highestRole.position < sepRole.position
      || !guildMe.can(discord.Permissions.MANAGE_ROLES)
    ) {
      return;
    } // Bot has no perm
    const posSep = sepRole.position;
    let hasBelow = false;
    let hasAbove = false;
    let hasSep = false;
    let hasAboveColor = false;
    let above = sepRole;
    let below = sepRole;
    let highestColor = 0;

    roles.forEach((role) => {
      if (sepRole.id === role.id) {
        hasSep = true;
      } else {
        if (
          (above.position === posSep || role.position < above.position)
          && role.position > posSep
        ) {
          above = role;
        }
        if (
          (below.position === posSep || role.position > below.position)
          && role.position < posSep
        ) {
          below = role;
        }

        if (role.id !== member.guildId && !isSeperatorRole(role)) {
          if (role.position > posSep && role.color !== 0) {
            hasAboveColor = true;
            if (role.position > highestColor) {
              highestColor = role.position;
            }
          }
          if (role.position > lowerLimit && role.position < upperLimit) {
            if (posSep < role.position) {
              hasAbove = true;
            }
            if (posSep > role.position) {
              hasBelow = true;
            }
          }
        }
      }
    });
    /* if (
      isSeperatorRole(above) &&
      (above.color === 0 || above.position < highestColor)
    ) {
      rolesRemove.push(sepRole);
    } else if (
      isSeperatorRole(below) &&
      (sepRole.color === 0 || sepRole.position < highestColor)
    ) {
      rolesRemove.push(below);
    } else {
      if (sepRole.id === '593077150077288481')
         */
    if (hasSep && (!hasBelow || !hasAbove)) {
      rolesRemove.push(sepRole);
    } else if (hasSep && !hasAboveColor && sepRole.color !== 0) {
      rolesRemove.push(sepRole);
    }

    if (
      !hasSep
      && hasBelow
      && hasAbove
      && (hasAboveColor || sepRole.color === 0)
    ) {
      rolesAdd.push(sepRole);
    }
    // }
  });
  if (rolesAdd.length > 0 || rolesRemove.length > 0) {
    rolesChanged = true;
  }
  if (rolesChanged === true) {
    /* rolesAdd.forEach(function(rladd) { addRoleDebounce(member, rladd.id, true); });
		rolesRemove.forEach(function(rlrem) { addRoleDebounce(member, rlrem.id, false); }); */
    rolesAdd = rolesAdd.filter((role) => isSeperatorRole(role));
    rolesRemove = rolesRemove.filter((role) => isSeperatorRole(role));
    const rolesnew = roles
      .filter((el: discord.Role) => {
        if (!isSeperatorRole(el)) {
          return true;
        }
        const rr = rolesRemove.find((e: discord.Role) => e.id === el.id);
        return typeof rr === 'undefined';
      })
      .map((el: discord.Role) => el.id);
    rolesAdd.map(async (el: discord.Role) => {
      rolesnew.push(el.id);
    });
    await member.edit({
      roles: rolesnew,
    });
    /*
    await Promise.allSettled(
      rolesAdd.map(async function(el: discord.Role) {
        await member.addRole(el.id);
      })
    );
    await Promise.allSettled(
      rolesRemove.map(async function(el: discord.Role) {
        await member.removeRole(el.id);
      })
    ); */
  }
  return rolesChanged;
}
