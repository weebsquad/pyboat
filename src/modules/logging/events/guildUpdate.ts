import { handleEvent, getUserTag } from '../main';
import * as utils from '../../../lib/utils';
import { language as i18n } from '../../../localization/interface';

export function getKeys(
  log: discord.AuditLogEntry,
  guild: discord.Guild,
  oldGuild: discord.Guild,
) {
  const keys = [];
  if (guild.name !== oldGuild.name) {
    keys.push('name');
  }
  if (guild.region !== oldGuild.region) {
    keys.push('region');
  }
  if (guild.description !== oldGuild.description) {
    keys.push('description');
  }
  if (
    guild.defaultMessageNotifications !== oldGuild.defaultMessageNotifications
  ) {
    keys.push('defaultMessageNotifications');
  }
  if (guild.explicitContentFilter !== oldGuild.explicitContentFilter) {
    keys.push('explicitContentFilter');
  }
  if (guild.verificationLevel !== oldGuild.verificationLevel) {
    keys.push('verificationLevel');
  }
  if (guild.banner !== oldGuild.banner) {
    keys.push('banner');
  }
  if (guild.icon !== oldGuild.icon) {
    keys.push('icon');
  }
  if (guild.maxPresences !== oldGuild.maxPresences) {
    keys.push('maxPresences');
  }
  if (guild.mfaLevel !== oldGuild.mfaLevel) {
    keys.push('mfaLevel');
  }
  if (guild.ownerId !== oldGuild.ownerId) {
    keys.push('ownerId');
  }
  if (guild.afkChannelId !== oldGuild.afkChannelId) {
    keys.push('afkChannelId');
  }
  if (guild.afkTimeout !== oldGuild.afkTimeout) {
    keys.push('afkTimeout');
  }
  if (guild.premiumTier !== oldGuild.premiumTier) {
    keys.push('premiumTier');
  }
  if (guild.premiumSubscriptionCount !== oldGuild.premiumSubscriptionCount) {
    keys.push('premiumSubscriptionCount');
  }
  if (guild.preferredLocale !== oldGuild.preferredLocale) {
    keys.push('preferredLocale');
  }
  if (guild.splash !== oldGuild.splash) {
    keys.push('splash');
  }
  if (guild.systemChannelId !== oldGuild.systemChannelId) {
    keys.push('systemChannelId');
  }
  if (guild.vanityUrlCode !== oldGuild.vanityUrlCode) {
    keys.push('vanityUrlCode');
  }

  if (guild.widgetEnabled !== oldGuild.widgetEnabled) {
    keys.push('widgetEnabled');
  }
  if (guild.widgetChannelId !== oldGuild.widgetChannelId) {
    keys.push('widgetChannelId');
  }
  let feats = false;
  guild.features.forEach((fe) => {
    if (!oldGuild.features.includes(fe)) {
      feats = true;
    }
  });
  oldGuild.features.forEach((fe) => {
    if (!guild.features.includes(fe)) {
      feats = true;
    }
  });
  if (feats) {
    keys.push('features');
  }

  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  guild: discord.Guild,
  oldGuild: discord.Guild,
) {
  if (
    [
      'maxPresences',
      'features',
      'premiumSubscriptionCount',
      'premiumTier',
      'features',
    ].indexOf(key) > -1
  ) {
    return false;
  }
  return true;
}

export const messages = {
  name(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'NAME_CHANGED'],
      ['OLD_NAME', utils.escapeString(oldGuild.name, true)],
      ['NEW_NAME', utils.escapeString(guild.name, true)],
    ]);
  },
  region(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'REGION_CHANGED'],
      ['OLD_REGION', oldGuild.region],
      ['NEW_REGION', guild.region],
    ]);
  },
  description(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'DESCRIPTION_CHANGED'],
      ['OLD_DESC', typeof oldGuild.description === 'string' ? i18n.modules.logging.l_terms.none : utils.escapeString(oldGuild.description, true)],
      ['NEW_DESC', typeof guild.description === 'string' ? i18n.modules.logging.l_terms.none : utils.escapeString(guild.description, true)],
    ]);
  },
  defaultMessageNotifications(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: i18n.modules.logging.l_terms.default_message_notifs.all_messages,
      1: i18n.modules.logging.l_terms.default_message_notifs.only_mentions,
    };
    return new Map([
      ['TYPE', 'DMN_CHANGED'],

      ['OLD_DMN', levels[oldGuild.defaultMessageNotifications]],

      ['NEW_DMN', levels[guild.defaultMessageNotifications]],
    ]);
  },
  explicitContentFilter(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: i18n.modules.logging.l_terms.explicit_filter.disabled,
      1: i18n.modules.logging.l_terms.explicit_filter.without_roles,
      2: i18n.modules.logging.l_terms.explicit_filter.all_members,
    };
    return new Map([
      ['TYPE', 'EXPLICIT_FILTER_CHANGED'],
      ['OLD_FILTER', levels[oldGuild.explicitContentFilter]],
      ['NEW_FILTER', levels[guild.explicitContentFilter]],
    ]);
  },
  verificationLevel(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: i18n.modules.logging.l_terms.verification_level.none,
      1: i18n.modules.logging.l_terms.verification_level.low,
      2: i18n.modules.logging.l_terms.verification_level.medium,
      3: i18n.modules.logging.l_terms.verification_level.high,
      4: i18n.modules.logging.l_terms.verification_level.very_high,
    };
    return new Map([
      ['TYPE', 'VERIFICATION_LEVEL_CHANGED'],
      ['OLD_LEVEL', levels[oldGuild.verificationLevel]],
      ['NEW_LEVEL', levels[guild.verificationLevel]],
    ]);
  },
  async banner(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldBanner = oldGuild.banner !== null ? '' : null;
    const newBanner = guild.banner !== null ? guild.getBannerUrl() : null;
    const newData = newBanner ? await (await fetch(newBanner)).arrayBuffer() : null;
    let type = '';
    if (oldBanner !== null && newBanner !== null) {
      type = 'BANNER_CHANGED';
    } else if (oldBanner !== null && newBanner === null) {
      type = 'BANNER_REMOVED';
    } else if (oldBanner === null && newBanner !== null) {
      type = 'BANNER_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map<string, any>([
      ['TYPE', type],
      ['OLD_BANNER', oldBanner],
      ['NEW_BANNER', newBanner],
      ['ATTACHMENTS', newData ? [{ name: `banner.${newBanner.split('.').slice(-1)[0].split('?')[0]}`, data: newData, url: newBanner }] : []],
    ]);
  },
  async icon(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldIcon = oldGuild.icon !== null ? '' : null;
    const newIcon = guild.icon !== null ? guild.getIconUrl() : null;
    const newData = newIcon ? await (await fetch(newIcon)).arrayBuffer() : null;
    let type = '';
    if (oldIcon !== null && newIcon !== null) {
      type = 'ICON_CHANGED';
    } else if (oldIcon !== null && newIcon === null) {
      type = 'ICON_REMOVED';
    } else if (oldIcon === null && newIcon !== null) {
      type = 'ICON_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map<string, any>([
      ['TYPE', type],
      ['OLD_ICON', oldIcon],
      ['NEW_ICON', newIcon],
      ['ATTACHMENTS', newData ? [{ name: `icon.${newIcon.split('.').slice(-1)[0].split('?')[0]}`, data: newData, url: newIcon }] : []],
    ]);
  },
  maxPresences(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'PRESENCES_CHANGED'],
      ['OLD_PRES', oldGuild.maxPresences.toString()],
      ['NEW_PRES', guild.maxPresences.toString()],
    ]);
  },
  mfaLevel(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: i18n.modules.logging.l_terms.disabled,
      1: i18n.modules.logging.l_terms.enabled,
    };
    return new Map([
      ['TYPE', 'MFA_LEVEL_CHANGED'],
      ['OLD_LEVEL', levels[oldGuild.mfaLevel]],
      ['NEW_LEVEL', levels[guild.mfaLevel]],
    ]);
  },
  ownerId(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'OWNER_CHANGED'],
      ['OLD_OWNER', oldGuild.ownerId],
      ['NEW_OWNER', guild.ownerId],
    ]);
  },
  afkChannelId(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    let type = '';
    if (oldGuild.afkChannelId !== null && guild.afkChannelId !== null) {
      type = 'AFKCHANNEL_CHANGED';
    } else if (oldGuild.afkChannelId !== null && guild.afkChannelId === null) {
      type = 'AFKCHANNEL_REMOVED';
    } else if (oldGuild.afkChannelId === null && guild.afkChannelId !== null) {
      type = 'AFKCHANNEL_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map([
      ['TYPE', type],
      ['OLD_CHANNEL', oldGuild.afkChannelId],
      ['NEW_CHANNEL', guild.afkChannelId],
    ]);
  },
  afkTimeout(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'AFKTIMEOUT_CHANGED'],
      ['OLD_TIMEOUT', oldGuild.afkTimeout.toString()],
      ['NEW_TIMEOUT', guild.afkTimeout.toString()],
    ]);
  },
  premiumTier(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldTier = oldGuild.premiumTier !== null ? oldGuild.premiumTier.toString() : i18n.modules.logging.l_terms.none;
    const newTier = guild.premiumTier !== null ? guild.premiumTier.toString() : i18n.modules.logging.l_terms.none;
    return new Map([
      ['TYPE', 'BOOST_TIER_CHANGED'],
      ['OLD_TIER', oldTier],
      ['NEW_TIER', newTier],
    ]);
  },
  premiumSubscriptionCount(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'BOOST_SUBSCRIPTIONS_CHANGED'],
      ['OLD_SUBS', oldGuild.premiumSubscriptionCount.toString()],
      ['NEW_SUBS', guild.premiumSubscriptionCount.toString()],
    ]);
  },
  preferredLocale(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['TYPE', 'PREFERRED_LOCALE_CHANGED'],
      ['OLD_LOCALE', oldGuild.preferredLocale],
      ['NEW_LOCALE', guild.preferredLocale],
    ]);
  },
  async splash(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldSplash = oldGuild.splash !== null ? '' : null;
    const newSplash = guild.splash !== null ? guild.getSplashUrl() : null;
    const newData = newSplash ? await (await fetch(newSplash)).arrayBuffer() : null;
    let type = '';
    if (oldSplash !== null && newSplash !== null) {
      type = 'SPLASH_CHANGED';
    } else if (oldSplash !== null && newSplash === null) {
      type = 'SPLASH_REMOVED';
    } else if (oldSplash === null && newSplash !== null) {
      type = 'SPLASH_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map<string, any>([
      ['TYPE', type],
      ['OLD_SPLASH', oldSplash],
      ['NEW_SPLASH', newSplash],
      ['ATTACHMENTS', newData ? [{ name: `splash.${newSplash.split('.').slice(-1)[0].split('?')[0]}`, data: newData, url: newSplash }] : []],
    ]);
  },
  systemChannelId(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldChannel = oldGuild.systemChannelId !== null ? oldGuild.systemChannelId : null;
    const newChannel = guild.systemChannelId !== null ? guild.systemChannelId : null;
    let type = '';
    if (oldChannel !== null && newChannel !== null) {
      type = 'SYSTEM_CHANNEL_CHANGED';
    } else if (oldChannel !== null && newChannel === null) {
      type = 'SYSTEM_CHANNEL_REMOVED';
    } else if (oldChannel === null && newChannel !== null) {
      type = 'SYSTEM_CHANNEL_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map([
      ['TYPE', type],
      ['OLD_CHANNEL', oldChannel],
      ['NEW_CHANNEL', newChannel],
    ]);
  },
  vanityUrlCode(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldVanity = oldGuild.vanityUrlCode !== null ? oldGuild.vanityUrlCode : null;
    const newVanity = guild.vanityUrlCode !== null ? guild.vanityUrlCode : null;
    let type = '';
    if (oldVanity !== null && newVanity !== null) {
      type = 'VANITY_URL_CHANGED';
    } else if (oldVanity !== null && newVanity === null) {
      type = 'VANITY_URL_REMOVED';
    } else if (oldVanity === null && newVanity !== null) {
      type = 'VANITY_URL_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map([
      ['TYPE', type],
      ['OLD_VANITY', oldVanity],
      ['NEW_VANITY', newVanity],
    ]);
  },
  widgetEnabled(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const widget = guild.widgetEnabled === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled;
    const widgetOld = oldGuild.widgetEnabled === true ? i18n.modules.logging.l_terms.enabled : i18n.modules.logging.l_terms.disabled;
    return new Map([
      ['TYPE', 'WIDGET_CHANGED'],
      ['OLD_WIDGET', widgetOld],
      ['NEW_WIDGET', widget],
    ]);
  },
  widgetChannelId(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldChannel = oldGuild.widgetChannelId !== null ? oldGuild.widgetChannelId : null;
    const newChannel = guild.widgetChannelId !== null ? guild.widgetChannelId : null;
    let type = '';
    if (oldChannel !== null && newChannel !== null) {
      type = 'WIDGET_CHANNEL_CHANGED';
    } else if (oldChannel !== null && newChannel === null) {
      type = 'WIDGET_CHANNEL_REMOVED';
    } else if (oldChannel === null && newChannel !== null) {
      type = 'WIDGET_CHANNEL_ADDED';
    }
    if (type === '') {
      return null;
    }
    return new Map([
      ['TYPE', type],
      ['OLD_CHANNEL', oldChannel],
      ['NEW_CHANNEL', newChannel],
    ]);
  },
  features(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const featsAdded = [];
    const featsRemoved = [];
    let type = '';
    const mp = new Map();
    guild.features.forEach((rl) => {
      if (oldGuild.features.indexOf(rl) === -1) {
        featsAdded.push(rl);
      }
    });
    oldGuild.features.forEach((rl) => {
      if (guild.features.indexOf(rl) === -1) {
        featsRemoved.push(rl);
      }
    });
    if (featsAdded.length > 0 && featsRemoved.length === 0) {
      type = 'FEATURES_ADDED';
      mp.set('ADDED_FEATURES', featsAdded.join(', '));
    } else if (featsAdded.length === 0 && featsRemoved.length > 0) {
      type = 'FEATURES_REMOVED';
      mp.set('REMOVED_FEATURES', featsRemoved.join(', '));
    } else {
      type = 'FEATURES_CHANGED';
      mp.set(
        'CHANGED_FEATURES',
        featsAdded
          .map((e: string) => `**+**${e}`)
          .concat(
            featsRemoved.map((e: string) => `**-**${e}`),
          )
          .join(', '),
      );
    }
    mp.set('TYPE', type);
    return mp;
  },
};

export async function AL_OnGuildUpdate(
  id: string,
  guildId: string,
  log: any,
  ...args: any
) {
  await handleEvent(id, guildId, discord.Event.GUILD_UPDATE, log, ...args);
}
