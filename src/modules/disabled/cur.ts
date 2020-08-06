import { config } from '../config';
import * as utils from '../lib/utils';

const cfgModule = config.modules.userRoles;
const enabled = cfgModule.enabled;
const rolePerms = cfgModule.noRolePerms;
const kvKey = 'userRoles';
const cotdId = cfgModule.cotdRoleId;

export async function OnGuildMemberAdd(member: discord.GuildMember) {
  await CheckUserRoles(member);
}
export async function OnGuildMemberRemove(memberRemoved) {}
export async function OnGuildMemberUpdate(
  memberUpdate,
  member: discord.GuildMember
) {
  await CheckUserRoles(member);
}
export async function OnGuildRoleCreate(role: discord.Role) {
  await CheckRole(role);
}
export async function OnGuildRoleUpdate(role: discord.Role) {
  await CheckRole(role);
  if (role.id === cotdId) await cotdUpdate(role);
  let guild = await discord.getGuild(role.guildId);
  if (guild === null) return;
  await checkAllStoredRoles(guild);
}
export async function OnGuildRoleDelete(role: discord.Role) {
  let guild = await discord.getGuild(role.guildId);
  if (guild === null) return;
  await checkAllStoredRoles(guild);
}
export async function OnGuildBanAdd(arg) {}
export async function OnGuildBanRemove(arg) {}

export async function checkAllStoredRoles(guild: discord.Guild) {
  let data = await GetData();
  let change = false;
  let roles = await guild.getRoles();
  if (Array.isArray(data['cotdRoles'])) {
    let newCotd = [];
    for (var i = 0; i < data['cotdRoles'].length; i++) {
      let rl = roles.find((role) => role.id === data['cotdRoles'][i]);
      if (typeof rl === 'undefined') continue;
      newCotd.push(data['cotdRoles'][i]);
    }
    if (newCotd.length !== data['cotdRoles'].length) {
      change = true;
      data['cotdRoles'] = newCotd;
    }
  }
  if (typeof data['users'] === 'object') {
    let newUsers = {};
    for (var key in data['users']) {
      var obj = data['users'][key];
      let rl = roles.find((role) => role.id === obj);
      if (typeof rl === 'undefined') continue;
      newUsers[key] = obj;
    }
    if (Object.keys(newUsers).length !== Object.keys(data['users']).length) {
      change = true;
      data['users'] = newUsers;
    }
  }

  if (change) {
    await SaveData(data);
  }
}

export async function cotdUpdate(cotd: discord.Role) {
  let data = await GetData();
  if (typeof data['cotdRoles'] !== 'object') {
    data['cotdRoles'] = [];
    await SaveData(data);
  }
  let cotdRoles = data['cotdRoles'];
  if (cotdRoles.length < 1) return;
  let guild = await discord.getGuild(cotd.guildId);
  if (typeof guild !== 'object' || guild === null) return;
  let roles = await guild.getRoles();
  if (typeof roles === null) return;
  if (roles.length < 1) return;
  for (var i = 0; i < cotdRoles.length; i++) {
    let rl = roles.find((role) => role.id === cotdRoles[i]);
    if (typeof rl === 'undefined') continue;
    if (rl.color !== cotd.color) await rl.edit({ color: cotd.color });
  }
}

export async function CheckRole(role: discord.Role) {
  if (!rolePerms) return;
  if (!(await RoleHasUser(role.id))) return;
  //console.log(`Checking ${role.name} perms`);
  if (role.permissions > 0)
    await role.edit({
      permissions: 0
    });
}

export async function CheckUserRoles(member: discord.GuildMember) {
  let roles = await utils.getUserRoles(member);
  let customRole = await GetUserRole(member.user.id);
  let hasOwnRole =
    typeof roles.find((rl) => rl.id === customRole) !== 'undefined';
  if (await UserHasRole(member.user.id)) {
    if (!hasOwnRole) await member.addRole(customRole);
  }
  let removeRoles = [];
  let otherRoles = Object.values(await GetUserData());
  otherRoles.map(function(role) {
    let has = typeof roles.find((rl) => rl.id === role) !== 'undefined';
    if (has && (!hasOwnRole || role !== customRole)) removeRoles.push(role);
  });
  if (removeRoles.length > 0) {
    await Promise.all(
      removeRoles.map(async function(rl) {
        await member.removeRole(rl);
      })
    );
  }
}

export async function GetData() {
  let data = await pylon.kv.get(kvKey);
  if (typeof data !== 'object' || typeof data['users'] !== 'object') {
    data = {
      users: {}
    };
  }
  return data;
}
async function GetUserData() {
  return (await GetData())['users'];
}

export async function SaveData(data, users = false) {
  if (typeof data !== 'object') data = await GetData();
  if (users && typeof data['users'] !== 'object')
    data = {
      users: data
    };
  await pylon.kv.put(kvKey, data);
}

export async function UserHasRole(userId: string) {
  return typeof (await GetUserData())[userId] !== 'undefined';
}

export async function RoleHasUser(roleId: string) {
  let data = Object.values(await GetUserData());
  return data.indexOf(roleId) > -1;
}

export async function GetUserRole(userId: string) {
  let data = await GetUserData();
  return data[userId];
}

export async function GetRoleUser(roleId: string) {
  let data = await GetUserData();
  if (Object.values(data).indexOf(roleId) === -1) return;
  for (var key in data) {
    let obj = data[key];
    if (obj === roleId) return key;
  }
  return;
}

export async function SetUserRole(userId: string, roleId: string) {
  let data = await GetUserData();
  data[userId] = roleId;
  await SaveData(data, true);
}

export async function UnsetUserRole(userId: string) {
  let data = await GetUserData();
  delete data[userId];
  await SaveData(data, true);
}

export async function NewRole(member: discord.GuildMember) {
  // todo when createRole is added, lol
}

export async function getUserRoleObject(userId: string, guild: discord.Guild) {
  if (!(await UserHasRole(userId))) return;
  let customRole = await GetUserRole(userId);
  let roleObj = await guild.getRole(customRole);
  return roleObj;
}

export async function ModifyUserRole(
  userId: string,
  guild: discord.Guild,
  data
) {
  if (!(await UserHasRole(userId))) return;
  let roleObj = await getUserRoleObject(userId, guild);
  if (!roleObj || roleObj === null || typeof roleObj === 'undefined') return;
  await CheckRole(roleObj);
  let color = data.color;
  let name = data.name;
  let cotd = data.cotd;
  let toEdit = {};
  if (typeof color !== 'undefined') toEdit['color'] = color;
  if (typeof name !== 'undefined') toEdit['name'] = name;
  if (typeof cotd !== 'undefined') {
    let cotdData = await GetData();
    if (
      typeof cotdData['cotdRoles'] !== 'object' ||
      cotdData['cotdRoles'] === null
    )
      cotdData['cotdRoles'] = [];
    if (cotdData['cotdRoles'] !== null) {
      let isCotd =
        typeof cotdData['cotdRoles'].find((rl) => rl === roleObj.id) !==
        'undefined';
      if (!isCotd) {
        let roles = await guild.getRoles();
        let cotdR = roles.find((role) => role.id === cotdId);
        if (typeof cotdR !== 'undefined') {
          cotdData['cotdRoles'].push(roleObj.id);
          cotd = true;
          await SaveData(cotdData);
          await cotdUpdate(cotdR);
        }
      } else {
        cotdData['cotdRoles'].splice(
          cotdData['cotdRoles'].indexOf(roleObj.id),
          1
        );
        cotd = false;
        await SaveData(cotdData);
      }
    }
  }
  if (Object.keys(toEdit).length > 0) await roleObj.edit(toEdit);
  if (typeof cotd === 'boolean') return cotd;
}
