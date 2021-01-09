import * as utils from '../lib/utils';
import { isModuleEnabled } from '../lib/eventHandler/routing';
import { config } from '../config';

enum FormatMode {
    'PLAIN' = 'PLAIN',
    'PRETTY' = 'PRETTY'
}
class Subreddit {
    name: string;
    channelId: string;
    channel: discord.GuildTextChannel | discord.GuildNewsChannel | undefined = undefined;
    mode: FormatMode;
    stats: boolean;
    role: string | undefined;
    constructor(name: string, channel: string, mode: FormatMode, stats: boolean, role: string | undefined) {
      this.name = name;
      this.channelId = channel;
      this.mode = mode;
      this.stats = stats;
      this.role = role;
      return this;
    }
}

const kv = new pylon.KVNamespace('reddit');

export async function updateSubs(): Promise<void> {
  if (!isModuleEnabled('reddit')) {
    return;
  }
  const modConfig = config.modules.reddit;
  if (!modConfig || !modConfig.subs || !Array.isArray(modConfig.subs)) {
    return;
  }
  let subs: Array<Subreddit> = modConfig.subs.map((val: any) => {
    if (typeof val.channel !== 'string' || typeof val.mode !== 'string' || typeof val.stats !== 'boolean' || typeof val.name !== 'string') {
      return;
    }
    return new Subreddit(val.name.toLowerCase(), val.channel, val.mode.toUpperCase(), val.stats, val.role);
  });
  subs = await Promise.all(subs.map(async (sub) => {
    const channel = await discord.getChannel(sub.channelId);
    if (!channel) {
      return;
    }
    if (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS) {
      return;
    }
    sub.channel = channel;
    return sub;
  }));
  subs = subs.filter((v) => v && v.channel);
  if (subs.length > 3 || subs.length === 0) {
    return;
  }
  // @ts-ignore
  const cpunow = Math.floor(await pylon.getCpuTime());
  console.log(`[REDDIT] CPU @ TRIM : ${cpunow}ms`);
  const times = await kv.get('lastUpdated') || {};
  const timesNew = JSON.parse(JSON.stringify(times));
  await Promise.all(subs.map(async (sub) => {
    // @ts-ignore
    const jsonmeas = await pylon.getCpuTime();
    const req = await fetch(`https://www.reddit.com/r/${sub.name}/new.json`);
    if (req.status !== 200) {
      return;
    }

    const json: any = await req.json();
    if (!json.data || !json.data.children) {
      return;
    }
    // @ts-ignore
    const jsonmeasend = Math.floor(await pylon.getCpuTime() - jsonmeas);
    if (jsonmeasend > 5) {
      console.log(`[REDDIT] CPU @ ONE FETCH TOOK ${jsonmeasend}ms`);
    }
    const data: Array<any> = json.data.children;
    const posts = data.map((v) => v.data).reverse();
    let postedCount = 0;
    for (let i = 0; i < posts.length; i++) {
      if (postedCount >= 3) {
        break;
      }
      const post = posts[i];
      const utc = new Date(+(post.created_utc) * 1000).getTime();
      if (times[sub.name] && utc <= times[sub.name]) {
        continue;
      }
      timesNew[sub.name] = utc;
      const res = await sendPost(sub.channel, sub, post);
      if (res) {
        postedCount++;
      }
    }
  }));
  if (times !== timesNew) {
    await kv.put('lastUpdated', timesNew);
  }
}

async function sendPost(channel: discord.GuildTextChannel | discord.GuildNewsChannel, subConfig: Subreddit, data: any): Promise<boolean> {
  const guild = await discord.getGuild();
  const me = await guild.getMember(discord.getBotId());
  if (!channel.canMember(me, discord.Permissions.SEND_MESSAGES) || !channel.canMember(me, discord.Permissions.EMBED_LINKS)) {
    return false;
  }
  if (typeof data.nsfw !== 'undefined' && data.nsfw) {
    if (!channel.nsfw) {
      return;
    }
  }
  let { title } = data;
  if (title.length > 256) {
    title = `${title.substr(0, 252)} ...`;
  }
  if (subConfig.mode === 'PLAIN') {
    await channel.sendMessage({ content: `${subConfig.role ? `<@&${subConfig.role}>` : ''}**${title}**\nhttps://reddit.com${data.permalink}`, allowedMentions: { roles: subConfig.role ? [subConfig.role] : undefined } });
  } else {
    const embed = new discord.Embed();
    if (typeof data.nsfw !== 'undefined' && data.nsfw) {
      embed.setColor(0xff6961);
    } else {
      embed.setColor(0xaecfc8);
    }
    embed.setTitle(title);
    embed.setUrl(`https://reddit.com${data.permalink}`);
    embed.setAuthor({ name: `Posted by /u/${data.author}`, url: `https://reddit.com/u/${data.author}` });
    let image;
    if (data.media) {
      if (data.media.oembed) {
        image = data.media.oembed.thumbnail_url;
      }
    } else if (data.preview) {
      if (data.preview.images) {
        image = unescape(data.preview.images[0].source.url).split('&amp;').join('&');
      }
    } else if (data.thumbnail) {
      if (data.thumbnail.startsWith('http')) {
        image = data.thumbnail;
      }
    }

    if (typeof data.selftext !== 'undefined' && data.selftext) {
      let content = data.selftext;
      if (data.selftext.length > 1900) {
        content = `${content.substr(0, 1900)} ...`;
      }
      embed.setDescription(content);
      if (image) {
        embed.setThumbnail({ url: image });
      }
    } else if (image) {
      embed.setImage({ url: image });
    }
    let footr = `/r/${subConfig.name}`;
    if (subConfig.stats) {
      footr += ` | ${data.ups} upvotes | ${data.downs} downvotes | ${data.num_comments} comments`;
    }
    embed.setFooter({ text: footr });

    embed.setTimestamp(new Date((+data.created_utc) * 1000).toISOString());
    await channel.sendMessage({ content: `${subConfig.role ? `<@&${subConfig.role}>` : ''}`, embed, allowedMentions: { roles: subConfig.role ? [subConfig.role] : undefined } });
  }
  return true;
}
