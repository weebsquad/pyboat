import { handleEvent, getUserTag } from '../main';

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
      ['_TYPE_', 'NAME_CHANGED'],
      ['_OLD_NAME_', oldGuild.name],
      ['_NEW_NAME_', guild.name],
    ]);
  },
  region(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'REGION_CHANGED'],
      ['_OLD_REGION_', oldGuild.region],
      ['_NEW_REGION_', guild.region],
    ]);
  },
  description(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'DESCRIPTION_CHANGED'],
      ['_OLD_DESC_', oldGuild.description],
      ['_NEW_DESC_', guild.description],
    ]);
  },
  defaultMessageNotifications(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: 'All Messages',
      1: 'Only Mentions',
    };
    return new Map([
      ['_TYPE_', 'DMN_CHANGED'],

      ['_OLD_DMN_', levels[oldGuild.defaultMessageNotifications]],

      ['_NEW_DMN_', levels[guild.defaultMessageNotifications]],
    ]);
  },
  explicitContentFilter(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: 'Disabled',
      1: 'Members Without Roles',
      2: 'All Members',
    };
    return new Map([
      ['_TYPE_', 'EXPLICIT_FILTER_CHANGED'],
      ['_OLD_FILTER_', levels[oldGuild.explicitContentFilter]],
      ['_NEW_FILTER_', levels[guild.explicitContentFilter]],
    ]);
  },
  verificationLevel(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High',
    };
    return new Map([
      ['_TYPE_', 'VERIFICATION_LEVEL_CHANGED'],
      ['_OLD_LEVEL_', levels[oldGuild.verificationLevel]],
      ['_NEW_LEVEL_', levels[guild.verificationLevel]],
    ]);
  },
  banner(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldBanner = oldGuild.banner !== null ? '' : null;
    const newBanner = guild.banner !== null ? guild.getBannerUrl() : null;
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
    return new Map([
      ['_TYPE_', type],
      ['_OLD_BANNER_', oldBanner],
      ['_NEW_BANNER_', newBanner],
    ]);
  },
  icon(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldIcon = oldGuild.icon !== null ? '' : null;
    const newIcon = guild.icon !== null ? guild.getIconUrl() : null;
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
    return new Map([
      ['_TYPE_', type],
      ['_OLD_ICON_', oldIcon],
      ['_NEW_ICON_', newIcon],
    ]);
  },
  maxPresences(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'PRESENCES_CHANGED'],
      ['_OLD_PRES_', oldGuild.maxPresences.toString()],
      ['_NEW_PRES_', guild.maxPresences.toString()],
    ]);
  },
  mfaLevel(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const levels = {
      0: 'Disabled',
      1: 'Enabled',
    };
    return new Map([
      ['_TYPE_', 'MFA_LEVEL_CHANGED'],
      ['_OLD_LEVEL_', levels[oldGuild.mfaLevel]],
      ['_NEW_LEVEL_', levels[guild.mfaLevel]],
    ]);
  },
  ownerId(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'OWNER_CHANGED'],
      ['_OLD_OWNER_', oldGuild.ownerId],
      ['_NEW_OWNER_', guild.ownerId],
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
      ['_TYPE_', type],
      ['_OLD_CHANNEL_', oldGuild.afkChannelId],
      ['_NEW_CHANNEL_', guild.afkChannelId],
    ]);
  },
  afkTimeout(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'AFKTIMEOUT_CHANGED'],
      ['_OLD_TIMEOUT_', oldGuild.afkTimeout.toString()],
      ['_NEW_TIMEOUT_', guild.afkTimeout.toString()],
    ]);
  },
  premiumTier(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldTier = oldGuild.premiumTier !== null ? oldGuild.premiumTier.toString() : 'None';
    const newTier = guild.premiumTier !== null ? guild.premiumTier.toString() : 'None';
    return new Map([
      ['_TYPE_', 'BOOST_TIER_CHANGED'],
      ['_OLD_TIER_', oldTier],
      ['_NEW_TIER_', newTier],
    ]);
  },
  premiumSubscriptionCount(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'BOOST_SUBSCRIPTIONS_CHANGED'],
      ['_OLD_SUBS_', oldGuild.premiumSubscriptionCount.toString()],
      ['_NEW_SUBS_', guild.premiumSubscriptionCount.toString()],
    ]);
  },
  preferredLocale(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    return new Map([
      ['_TYPE_', 'PREFERRED_LOCALE_CHANGED'],
      ['_OLD_LOCALE_', oldGuild.preferredLocale],
      ['_NEW_LOCALE_', guild.preferredLocale],
    ]);
  },
  splash(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const oldSplash = oldGuild.splash !== null ? '' : null;
    const newSplash = guild.splash !== null ? guild.getSplashUrl() : null;
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
    return new Map([
      ['_TYPE_', type],
      ['_OLD_SPLASH_', oldSplash],
      ['_NEW_SPLASH_', newSplash],
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
      ['_TYPE_', type],
      ['_OLD_CHANNEL_', oldChannel],
      ['_NEW_CHANNEL_', newChannel],
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
      ['_TYPE_', type],
      ['_OLD_VANITY_', oldVanity],
      ['_NEW_VANITY_', newVanity],
    ]);
  },
  widgetEnabled(
    log: discord.AuditLogEntry,
    guild: discord.Guild,
    oldGuild: discord.Guild,
  ) {
    const widget = guild.widgetEnabled === true ? 'Enabled' : 'Disabled';
    const widgetOld = oldGuild.widgetEnabled === true ? 'Enabled' : 'Disabled';
    return new Map([
      ['_TYPE_', 'WIDGET_CHANGED'],
      ['_OLD_WIDGET_', widgetOld],
      ['_NEW_WIDGET_', widget],
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
      ['_TYPE_', type],
      ['_OLD_CHANNEL_', oldChannel],
      ['_NEW_CHANNEL_', newChannel],
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
      mp.set('_ADDED_FEATURES_', featsAdded.join(', '));
    } else if (featsAdded.length === 0 && featsRemoved.length > 0) {
      type = 'FEATURES_REMOVED';
      mp.set('_REMOVED_FEATURES_', featsRemoved.join(', '));
    } else {
      type = 'FEATURES_CHANGED';
      mp.set(
        '_CHANGED_FEATURES_',
        featsAdded
          .map((e: string) => `**+**${e}`)
          .concat(
            featsRemoved.map((e: string) => `**-**${e}`),
          )
          .join(', '),
      );
    }
    mp.set('_TYPE_', type);
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
