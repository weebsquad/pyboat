import * as config from '../config';
import * as utils from '../lib/utils';

async function refreshGuildMember(gid: string, uid: string) {
  const guild = await discord.getGuild(gid);
  if (guild === null) throw new Error('guild not found');
  let mem2 = await guild.getMember(uid);
  if (!(mem2 instanceof discord.GuildMember))
    throw new Error('member not found');
  return mem2;
}

export async function OnGuildMemberUpdate(
  id: string,
  guildId: string,
  member: discord.GuildMember,
  oldMember: discord.GuildMember
) {
  await checkUserRoles(
    await refreshGuildMember(member.guildId, member.user.id)
  );

  await checkHoist(await refreshGuildMember(member.guildId, member.user.id));

  await checkMemberSeperatorRoles(
    await refreshGuildMember(member.guildId, member.user.id)
  );
}

export async function OnGuildMemberAdd(
  id: string,
  guildId: string,
  member: discord.GuildMember
) {
  await checkUserRoles(
    await refreshGuildMember(member.guildId, member.user.id)
  );

  await checkHoist(await refreshGuildMember(member.guildId, member.user.id));

  await checkMemberSeperatorRoles(
    await refreshGuildMember(member.guildId, member.user.id)
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
  if (member.user.bot === true) return;
  let roles = await utils.getUserRoles(member);
  let hasHoist = false;
  const cfgMod = config.getGuildConfig(member.guildId);
  roles.forEach(function(role: discord.Role) {
    if (role.hoist === true && role.id !== cfgMod.lowestHoistRole)
      hasHoist = true;
  });
  if (!hasHoist && roles.length > 0) {
    await member.addRole(cfgMod.lowestHoistRole);
  } else {
    let hasLowestHoist = roles.find((o) => o.id === cfgMod.lowestHoistRole);

    if (hasLowestHoist) await member.removeRole(cfgMod.lowestHoistRole);
  }
}

/* USER/BOT ROLE MANAGEMENT */
export async function checkUserRoles(member: discord.GuildMember) {
  if (member.user.id === discord.getBotId()) return; // Don't trigger this on pylon, lol
  let roles = await utils.getUserRoles(member);

  async function checkRoles(
    member: discord.GuildMember,
    normal: string,
    reduced: string,
    replaceOnly: boolean = false
  ) {
    let hasReduced = roles.find((o) => o.id === reduced);
    let hasNormal = roles.find((o) => o.id === normal);

    if (!hasReduced && !hasNormal && !replaceOnly) {
      await member.addRole(reduced);
    } else if (hasReduced && hasNormal) {
      await member.removeRole(reduced);
    }
  }
  const cfgMod = config.getGuildConfig(member.guildId);
  if (member.user.bot === true) {
    await checkRoles(member, cfgMod.botRole, cfgMod.botRoleRP, false);
    await checkRoles(member, cfgMod.botRoleRP, cfgMod.memberRoleRP, true);
  } else {
    await checkRoles(member, cfgMod.memberRole, cfgMod.memberRoleRP, true);
  }
}

/* SEPERATOR ROLES MANAGEMENT */
const colors = ['#2f3136', '#000000'];
const chars = {
  '▬': {
    amount: 5,
    alphaAllowed: 8
  },
  '󠇰': {
    amount: 7,
    alphaAllowed: 8
  }
};
const defaultNeededSepChars = 5;

async function getMemberHighestRole(member: discord.GuildMember) {
  return await (await member.getGuild()).getRole(member.roles[0]);
}

async function checkRolePerms(role: discord.Role) {
  if (isSeperatorRole(role)) {
    //if(role.permissions > 0 && role.guild.me.highestRole.position > role.position) {
    let mem = await (await discord.getGuild(role.guildId))!.getMember(
      discord.getBotId()
    );
    if (mem === null || mem === undefined) return;

    //if(mem.can(discord.Permissions.MANAGE_ROLES) && mem.)
    let highestRole = await getMemberHighestRole(mem);
    if (highestRole === null) return;
    if (role.permissions > 0 && highestRole.position > role.position) {
      role.edit({ permissions: 0 });
      console.log(
        'Setting role perms on ' +
          role.name +
          ' because the seperator role has perms..'
      );
    }
  }
}

function isSeperatorRole(role: discord.Role) {
  let ret = false;
  for (var seperatorChar in chars) {
    let obj = chars[seperatorChar];
    let amount = obj['amount'];
    if (typeof amount !== 'number') amount = defaultNeededSepChars;
    if (role.name.indexOf(seperatorChar) > -1) {
      let strcount = role.name.split(seperatorChar).length - 1;
      if (
        strcount >= amount &&
        colors.indexOf(utils.VBColorToHEX(role.color)) > -1
      ) {
        if (typeof obj['alphaAllowed'] === 'number') {
          let alpha = role.name.replace(/\W/g, '');
          if (alpha.length > obj['alphaAllowed']) continue;
        }
        ret = true;
        break;
      }
    }
  }
  return ret;
}

async function getGuildSeperatorRoles(guild: discord.Guild) {
  let roles = await guild.getRoles();
  let ret = roles.filter(function(el: discord.Role) {
    if (isSeperatorRole(el)) {
      checkRolePerms(el);
      return true;
    }
    return false;
  });
  return ret.reverse(); // reverse it because of role ordering for seperator checks
}

async function checkMemberSeperatorRoles(member: discord.GuildMember) {
  //console.log('Running update on ' + member.user.tag);

  let rolesChanged = false;
  let guild = await member.getGuild();
  let guildMe = await guild.getMember(discord.getBotId());
  if (guildMe === null) return;
  let seps = await getGuildSeperatorRoles(guild);
  let guildRoles = await guild.getRoles();
  let roles = guildRoles
    .filter(function(el) {
      return member.roles.indexOf(el.id) > -1;
    })
    .reverse();
  //console.log(roles);
  let rolesAdd = new Array();
  let rolesRemove = new Array();
  if (seps.length < 1 || roles.length < 2) return;
  /*roles.forEach(function(rl) {
		console.log(`${rl.name} - ${rl.position} - ${rl.hexColor}`);
	});*/
  let sepPosMaps = {};
  let posArray = new Array();
  seps.forEach(function(sep) {
    posArray.push(sep.position);
  });
  posArray.sort(function(a, b) {
    return a - b;
  });
  seps.forEach(function(sep1) {
    let lowerLim = 0;
    let upperLim = 501;
    let thispos = sep1.position;
    for (var i = 0; i < posArray.length; i++) {
      if (posArray[i] !== thispos) continue;
      if (i > 0) lowerLim = posArray[i - 1];
      if (i < posArray.length - 1) upperLim = posArray[i + 1];
      let push = {
        upperLimit: upperLim,
        lowerLimit: lowerLim,
        position: thispos
      };
      sepPosMaps[sep1.id] = push;
    }
  });
  //console.log(sepPosMaps);

  let highestRole = await getMemberHighestRole(guildMe);
  if (highestRole === null) return;
  seps.forEach(function(sepRole) {
    if (!isSeperatorRole(sepRole)) return;
    let lowerLimit = sepPosMaps[sepRole.id]['lowerLimit'];
    let upperLimit = sepPosMaps[sepRole.id]['upperLimit'];
    lowerLimit = 0;
    if (
      highestRole.position < sepRole.position ||
      !guildMe.can(discord.Permissions.MANAGE_ROLES)
    ) {
      console.log('Skipping role ' + sepRole.name + ' due to no perms');
      return;
    } // Bot has no perm
    let posSep = sepRole.position;
    let hasBelow = false;
    let hasAbove = false;
    let hasSep = false;
    let hasAboveColor = false;
    let above = sepRole;
    let below = sepRole;
    let highestColor = 0;

    roles.forEach(function(role) {
      if (sepRole.id === role.id) {
        hasSep = true;
      } else {
        if (
          (above.position === posSep || role.position < above.position) &&
          role.position > posSep
        )
          above = role;
        if (
          (below.position === posSep || role.position > below.position) &&
          role.position < posSep
        )
          below = role;

        if (role.id !== member.guildId && !isSeperatorRole(role)) {
          if (role.position > posSep && role.color !== 0) {
            hasAboveColor = true;
            if (role.position > highestColor) highestColor = role.position;
          }
          if (role.position > lowerLimit && role.position < upperLimit) {
            if (posSep < role.position) hasAbove = true;
            if (posSep > role.position) hasBelow = true;
          }
        }
      }
    });
    //console.log(above, below);
    /*if (
      isSeperatorRole(above) &&
      (above.color === 0 || above.position < highestColor)
    ) {
      console.log('above');
      rolesRemove.push(sepRole);
    } else if (
      isSeperatorRole(below) &&
      (sepRole.color === 0 || sepRole.position < highestColor)
    ) {
      console.log('below');
      rolesRemove.push(below);
    } else {
      if (sepRole.id === '593077150077288481')
        console.log(hasSep, hasAbove, hasBelow, hasAboveColor);*/
    if (hasSep && (!hasBelow || !hasAbove)) {
      rolesRemove.push(sepRole);
    } else if (hasSep && !hasAboveColor && sepRole.color !== 0) {
      rolesRemove.push(sepRole);
    }

    if (
      !hasSep &&
      hasBelow &&
      hasAbove &&
      (hasAboveColor || sepRole.color === 0)
    )
      rolesAdd.push(sepRole);
    //}
  });
  if (rolesAdd.length > 0 || rolesRemove.length > 0) rolesChanged = true;
  if (rolesChanged === true) {
    /*rolesAdd.forEach(function(rladd) { addRoleDebounce(member, rladd.id, true); });
		rolesRemove.forEach(function(rlrem) { addRoleDebounce(member, rlrem.id, false); });*/
    rolesAdd = rolesAdd.filter(function(role) {
      return isSeperatorRole(role);
    });
    rolesRemove = rolesRemove.filter(function(role) {
      return isSeperatorRole(role);
    });
    let rolesnew = roles
      .filter(function(el: discord.Role) {
        if (!isSeperatorRole(el)) return true;
        let rr = rolesRemove.find((e: discord.Role) => e.id === el.id);
        return typeof rr === 'undefined';
      })
      .map(function(el: discord.Role) {
        return el.id;
      });
    rolesAdd.map(async function(el: discord.Role) {
      rolesnew.push(el.id);
    });
    await member.edit({
      roles: rolesnew
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
    );*/
    //console.log('Updated ' + member.user.getTag() + ' in ' + member.guildId);
  }
  return rolesChanged;
}
