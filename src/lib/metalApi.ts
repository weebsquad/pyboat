import { config, globalConfig, isPublic } from '../config';
import { swapKV, logError, makeFake } from './utils';
import { EntitlementTypeEnum } from '../constants/constants';

export class BetterUser extends discord.User {
  public_flags = 0;
  bot = false;
  system = false;
  premium_type = 0;
}

async function baseRequest(
  endpoint: string,
  headers: { [key: string]: string },
  method: string,
  body: string | undefined | null,
  requireAuth = false,
): Promise<Response> {
  method = method.toUpperCase();
  const baseHeaders: { [key: string]: string } = {
    'content-type': 'application/json',
    'accept': 'application/json',
    'proxy-key': globalConfig.metalApi.key,
    'api-url': endpoint,
  };
  if (requireAuth) {
    baseHeaders.Authorization = `Bot ${globalConfig.metalApi.botToken}`;
  }
  for (const key in headers) {
    if (!baseHeaders[key]) {
      baseHeaders[key] = headers[key];
    }
  }
  const request = new Request(globalConfig.metalApi.url, {
    method,
    headers: baseHeaders,
    body: body || undefined,
  });
  const response = await fetch(request);
  return response;
}

const embedsRemaps = {
  author: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url',
  },
  thumbnail: {
    proxyUrl: 'proxy_url',
  },
  footer: {
    iconUrl: 'icon_url',
    proxyIconUrl: 'proxy_icon_url',
  },
  image: {
    proxyUrl: 'proxy_url',
  },
} as any;

export async function executeWebhook(
  webhook_url: string,
  content: string,
  embeds: Array<discord.Embed> | undefined = undefined,
  username: string | undefined = undefined,
  avatar_url: string | undefined = undefined,
  tts = false,
  allowed_mentions: discord.Message.IAllowedMentions | undefined = undefined,
): Promise<boolean> {
  const [id, token] = getWebhookIdTokenFromUrl(webhook_url);
  const url = `webhooks/${id}/${token}`;
  if (Array.isArray(embeds) && embeds.length > 0) {
    embeds = embeds.map((e: any) => {
      for (const key in embedsRemaps) {
        const value = e[key];
        if (typeof e[key] === 'undefined' || e[key] === null || (Array.isArray(e[key]) && e[key].length === 0)) {
          continue;
        }
        for (const prop in value) {
          const conv = embedsRemaps[key][prop];
          if (typeof conv === 'undefined' || conv === null) {
            continue;
          }
          e[key][conv] = e[key][prop];
          delete e[key][prop];
        }
      }
      for (const key in e) {
        const value = e[key];
        if (value === null || typeof value === 'undefined' || (Array.isArray(value) && value.length === 0)) {
          delete e[key];
        }
      }
      return e;
    });
  }
  const bodyJson: { [key: string]: any } = {
    content: content.length > 0 ? content : '',
    username,
    avatar_url,
    tts: !!tts,
    embeds: Array.isArray(embeds) && embeds.length > 0 ? embeds : [],
    allowed_mentions: allowed_mentions || {},
  };
  for (const k in bodyJson) {
    if (typeof bodyJson[k] === 'undefined') {
      delete bodyJson[k];
    }
  }
  const response = await baseRequest(
    url,
    {},
    'POST',
    JSON.stringify(bodyJson),
    false,
  );
  const { status } = response;
  if (status !== 204) {
    const text = await response.json();
    logError(`Webhook - ${status} - `, JSON.stringify(text));
    return false;
  }

  return true;
}

export function getWebhookIdTokenFromUrl(webhook_url: string) {
  webhook_url = webhook_url
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discord.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('')
    .split('https://discordapp.com/api/webhooks/')
    .join('');
  return webhook_url.split('/');
}

export async function getUser(userId: string, forceFetch = false): Promise<BetterUser | discord.User | null> {
  let userData;
  try {
    if (!forceFetch || isPublic) {
      userData = await discord.getUser(userId);
    }
  } catch (e) {}
  if (typeof userData !== 'undefined') {
    return userData;
  }
  if (isPublic) {
    return null;
  }
  const data = await baseRequest(
    `users/${userId}`,
    {},
    'GET',
    null,
    true,
  );
  try {
    const res = await data.json();
    if (res.id && !res.code && !res.message) {
      return makeFake<BetterUser>(res, BetterUser);
    }
    return null;
  } catch (e) {
    logError(e);
    return null;
  }
}

export async function getGuild(gid: string, forceFetch = false) {
  let guildData;
  try {
    if (!forceFetch && gid === config.guildId) {
      guildData = await discord.getGuild();
    }
  } catch (e) {}
  if (typeof guildData !== 'undefined') {
    return guildData;
  }
  const data = await baseRequest(
    `guilds/${gid}?with_counts=true`,
    {},
    'GET',
    null,
    true,
  );
  try {
    const res = await data.json();
    // convert to camelcase
    if (typeof res.id === 'string') {
      for (const key in res) {
        if (key === 'roles' || key === 'emojis') {
          res[key] = res[key].map((v: any) => v.id);
        } else if (key === 'approximate_member_count') {
          res.memberCount = res[key];
          delete res[key];
        } else if (key === 'max_presences' && res[key] === null) {
          delete res[key];
        } else if (key === 'premium_tier' && res[key] === 0) {
          res[key] = null;
        } else if (key.includes('_')) {
          const camel = key.split('_');
          for (let i = 1; i < camel.length; i++) {
            camel[i] = `${camel[i].substr(0, 1).toUpperCase()}${camel[i].substr(1).toLowerCase()}`;
          }
          res[camel.join('')] = res[key];
          delete res[key];
        }
      }
      return makeFake<discord.Guild>(res, discord.Guild);
    }
  } catch (e) {
    logError(e);
  }
  return null;
}

export async function getUserEntitlements(
  userId: string,
  appId: string,
  skuId: string,
  seperateBranches = false,
) {
  const res = await baseRequest(
    `applications/${appId}/entitlements?user_id=${userId}&sku_ids=${skuId}&with_payments=true`,
    {},
    'GET',
    null,
    true,
  );
  const data = await res.json();
  const mainData: any = {
    branches: <any>{},
    type: 'none',
  };
  const masterBranchId = swapKV(config.global.game.applicationBranches).master;
  const typesId = swapKV(EntitlementTypeEnum);
  data.forEach((table: any) => {
    if (
      table.user_id === userId
      && table.application_id === appId
      && table.sku_id === skuId
    ) {
      const typeText = typesId[table.type];
      const [branchId] = masterBranchId;
      const branchData = <any>{
        type: 'none',
      };

      branchData.type = typeText;
      for (const key in table) {
        if (typeof branchData[key] === 'undefined' && key !== 'branches') {
          branchData[key] = table[key];
        } // Add missing params
      }
      mainData.branches[branchId] = branchData;
    }
  });
  if (mainData.branches[masterBranchId]) {
    mainData.type = mainData.branches[masterBranchId].type;
  }
  if (
    seperateBranches === true
    && typeof mainData.branches[masterBranchId] !== 'undefined'
  ) {
    mainData.master = mainData.branches[masterBranchId];
    delete mainData.branches[masterBranchId];
  }
  return mainData;
}
