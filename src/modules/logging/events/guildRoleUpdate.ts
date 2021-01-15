import { handleEvent, getUserTag, getMemberTag } from '../main';
import * as utils from '../../../lib/utils';
import { language as i18n, setPlaceholders } from '../../../localization/interface';

export function getKeys(
  log: discord.AuditLogEntry,
  role: discord.Role,
  oldRole: discord.Role,
) {
  const keys = [];
  if (role.name !== oldRole.name) {
    keys.push('name');
  }
  if (role.color !== oldRole.color) {
    keys.push('color');
  }
  if (role.hoist !== oldRole.hoist) {
    keys.push('hoist');
  }
  if (role.mentionable !== oldRole.mentionable) {
    keys.push('mentionable');
  }
  if (role.managed !== oldRole.managed) {
    keys.push('managed');
  } // why not
  if (role.position !== oldRole.position) {
    keys.push('position');
  }
  if (role.permissions !== oldRole.permissions) {
    keys.push('permissions');
  }
  return keys;
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  name(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'NAME_CHANGED'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    mp.set('OLD_NAME', utils.escapeString(oldRole.name, true));
    mp.set('NEW_NAME', utils.escapeString(role.name, true));
    return mp;
  },
  color(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'COLOR_CHANGED'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    mp.set('OLD_COLOR', oldRole.color.toString(16));
    mp.set('NEW_COLOR', role.color.toString(16));
    return mp;
  },
  hoist(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'HOIST_CHANGED'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    mp.set('OLD_HOIST', oldRole.hoist === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled);
    mp.set('NEW_HOIST', role.hoist === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled);
    return mp;
  },
  mentionable(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'MENTIONABLE_CHANGED'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    mp.set(
      'OLD_MENTIONABLE',
      oldRole.mentionable === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled,
    );
    mp.set(
      'NEW_MENTIONABLE',
      role.mentionable === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled,
    );
    return mp;
  },
  position(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'POSITION_CHANGED'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    mp.set('OLD_POSITION', oldRole.position.toString());
    mp.set('NEW_POSITION', role.position.toString());
    return mp;
  },
  managed(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([
      ['ROLE_ID', role.id],
      ['TYPE', 'MANAGED_CHANGED'],
      ['ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone')],
    ]);
    mp.set(
      'OLD_MANAGED',
      oldRole.mentionable === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled,
    );
    mp.set('NEW_MANAGED', role.mentionable === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled);
    return mp;
  },
  permissions(
    log: discord.AuditLogEntry,
    role: discord.Role,
    oldRole: discord.Role,
  ) {
    const mp = new Map([['ROLE_ID', role.id]]);
    let type = '';
    const newPerms = new utils.Permissions(role.permissions).serialize(false);
    const oldPerms = new utils.Permissions(oldRole.permissions).serialize(false);
    const permsAdded = [];
    const permsRemoved = [];
    for (const key in newPerms) {
      if (newPerms[key] === true && oldPerms[key] === false) {
        permsAdded.push(key);
      }
      if (newPerms[key] === false && oldPerms[key] === true) {
        permsRemoved.push(key);
      }
    }
    function prettifyPerms(e: string) {
      return e
        .split('_')
        .join(' ')
        .split(' ')
        .map((e2) => {
          if (e2.length > 1) {
            e2 = e2.substring(0, 1).toUpperCase() + e2.substring(1).toLowerCase();
          }
          return e2;
        })
        .join(' ');
    }
    if (permsAdded.length > 0 && permsRemoved.length === 0) {
      type = 'PERMS_ADDED';
      mp.set(
        'ADDED_PERMS',
        permsAdded
          .map((e: string) => `\`${prettifyPerms(e)}\``)
          .join(',  '),
      );
    } else if (permsAdded.length === 0 && permsRemoved.length > 0) {
      type = 'PERMS_REMOVED';
      mp.set(
        'REMOVED_PERMS',
        permsRemoved
          .map((e: string) => `\`${prettifyPerms(e)}\``)
          .join(',  '),
      );
    } else {
      type = 'PERMS_CHANGED';
      let cc = permsAdded
        .map((e: string) => `+ ${prettifyPerms(e)}`)
        .concat(
          permsRemoved.map((e: string) => `- ${prettifyPerms(e)}`),
        )
        .join('\n');
      cc = `\`\`\`diff\n${cc}\n\`\`\``;
      mp.set('CHANGED_PERMS', cc);
    }
    if (type === '') {
      return;
    }
    mp.set('TYPE', type);
    mp.set('ROLE_MENTION', role.id !== role.guildId ? `<@&${role.id}>` : utils.escapeString('@everyone'));
    return mp;
  },
};

export async function AL_OnGuildRoleUpdate(
  id: string,
  guildId: string,
  log: any,
  role: discord.Role,
  oldRole: discord.Role,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.GUILD_ROLE_UPDATE,
    log,
    role,
    oldRole,
  );
}
