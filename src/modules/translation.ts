import * as gTranslate from '../lib/gTranslate';
import * as constants from '../constants/translation';
import * as utils from '../lib/utils';
import {messageJump} from '../modules/logging/messages';

const kv = new pylon.KVNamespace('translation');

class PooledMessage {
  id: string;
  translations: Array<string>;
  constructor(id: string) {
    this.id = id;
    this.translations = new Array<string>();
    return this;
  }
}

async function cleanPool() {
  const pool = await kv.get('translatedMessages');
  if (!Array.isArray(pool)) {
    return;
  }
  const newP = pool.filter(function(mid: any) {
    //if (!(mid instanceof PooledMessage)) return false;
    const date = new Date(utils.decomposeSnowflake(mid.id).timestamp).getTime();
    const now = new Date().getTime();
    const diff = now - date;
    if (now - date > 10 * 60 * 60 * 1000) {
      return false;
    }
    return true;
  });
  if (!utils.deepCompare(newP, pool)) {
    await kv.put('translatedMessages', newP);
  }
}

async function pirateSpeak(query: string) {
  const endpoint = 'https://api.funtranslations.com/translate/pirate.json';
  //let queryParams = '?' + gTranslate.formParams({ text: query });
  //let fullUrl = `${endpoint}${queryParams}`;
  const req = new Request(endpoint, {
    method: 'POST',
    body: JSON.stringify({ text: query }),
    headers: {
      'Content-Type': 'application/json',
      "Accept": 'application/json'
    }
  });
  const request = await (await fetch(req)).json();
  if (typeof request.contents !== 'object') {
    return request;
  }
  return request.contents.translated;
}

function getLanguageFromFlag(flag: string) {
  if (flag === discord.decor.Emojis.RAINBOW_FLAG) {
    return 'pride';
  }
  if (flag === discord.decor.Emojis.PIRATE_FLAG) {
    return 'piratespeak';
  }
  const country = constants.countries.find((e) => {
    if (typeof e.flag === 'string') {
      return e.flag === flag;
    }
    return e.flag.indexOf(flag) > -1;
  });
  if (typeof country === 'undefined') {
    return null;
  }
  //console.log('Country: ', country)
  const lang = constants.languages.find(
    (e) => e.shortcode === country.mainLanguage
  );
  //console.log('Langs: ', constants.languages);
  if (typeof lang === 'undefined') {
    return null;
  }
  return lang;
}

/*export async function OnMessageCreate(id:string, guildId: string,message: discord.Message) {
  if (!message.author) return;
  if (message.author.id !== '344837487526412300') return;
  if (message.content.length < 3 || message.content.substring(0, 2) !== '!t')
    return;
  let translation = await gTranslate.translate(
    message.content.substring(3),
    'en'
  );
  const richEmbed = new discord.Embed();
  richEmbed.setTitle(translation.detectedSourceLanguage).setColor(0x00ff00);
  richEmbed.setDescription(translation.translatedText);
  richEmbed.setTimestamp(new Date().toISOString());
  await message.reply(async () => {
    return { embed: richEmbed };
  });
}*/

async function saveToPool(pool: any, mid: string, lang: string) {
  if (!Array.isArray(pool)) {
    pool = [];
  }
  const pfi = pool.findIndex((e: any) => e.id === mid);
  const newObj = new PooledMessage(mid);
  newObj.translations.push(lang);
  if (!Array.isArray(pool) || pool === null) {
    // idk how to do this better lmao
    const pool2 = [];
    pool2.push(newObj);
    await kv.put('translatedMessages', pool2);
    return;
  }
  if (pfi > -1) {
    pool[pfi].translations.push(lang);
  } else {
    pool.push(newObj);
  }
  await kv.put('translatedMessages', pool);
}

export async function translationEmbed(
  channel: discord.GuildTextChannel,
  message: discord.Message,
  caller: discord.User,
  sourceLang: string,
  targetLang: string,
  text: string
) {
  const richEmbed = new discord.Embed();
  richEmbed.setAuthor({
    name: message.author.getTag(),
    iconUrl: message.author.getAvatarUrl(),
    url: `https://discord.com/channels/${channel.guildId}/${channel.id}/${message.id}`
  });
  richEmbed.setThumbnail({
    url:
      'https://icons-for-free.com/iconfiles/png/512/language+text+translate+translation+icon-1320183416086707155.png',
    height: 128,
    width: 128
  });
  richEmbed
    .setTitle(`${sourceLang} ${discord.decor.Emojis.ARROW_RIGHT} ${targetLang}`)
    .setColor(0x00ff00);
  richEmbed.setDescription(text);
  richEmbed.setFooter({
    iconUrl: caller.getAvatarUrl(),
    text: `Requested by ${caller.getTag()} (${caller.id})`
  });
  richEmbed.setTimestamp(new Date().toISOString());
  await channel.sendMessage({ embed: richEmbed });
}

export async function OnMessageReactionAdd(
  id: string,
  guildId: string,
  reaction: discord.Event.IMessageReactionAdd
) {
  if (!(reaction.member instanceof discord.GuildMember)) {
    return;
  }
  //if (reaction.userId !== '344837487526412300') return;
  if (
    reaction.emoji.type !== 'UNICODE' ||
    reaction.emoji.animated === true ||
    typeof reaction.emoji.name !== 'string' ||
    reaction.emoji.id !== null
  ) {
    return;
  }

  if (reaction.member === null) {
    return;
  }
  if (reaction.member.user.bot === true) {
    return;
  }
  if(utils.isBlacklisted(reaction.member)) {
      const jmp = messageJump.split('_CHANNEL_ID_').join(reaction.channelId).split('_GUILD_ID_').join(guildId).split('_MESSAGE_ID_').join(reaction.messageId);
    await utils.reportBlockedAction(reaction.member, `translation reaction attempt on <#${reaction.channelId}> on a message by <@!${reaction.userId}> ${jmp}`);
  return;
  }

  const emoji = reaction.emoji;
  const lang = getLanguageFromFlag(emoji.name);
  //console.log('Language: ', lang);
  if (lang === null) {
    return;
  }
  const channel = await discord.getChannel(reaction.channelId);
  if (!(channel instanceof discord.GuildTextChannel)) {
    return;
  } // Also stops GuildNewsChannels which might be a good idea since people might want to react on them
  if (!channel.canMember(reaction.member, discord.Permissions.SEND_MESSAGES)) {
    return;
  } // If they don't have Send Messages, we probably don't want them triggering it.

  const message = await channel.getMessage(reaction.messageId);
  if (message === null) {
    return;
  }
  if (
    message.content.length < 3 ||
    message.webhookId !== null ||
    message.author === null ||
    message.author.bot === true
  ) {
    return;
  }
  //if (!(message instanceof discord.GuildMemberMessage)) return;
  await cleanPool();
  const pool = await kv.get('translatedMessages');
  const guild = await channel.getGuild();
  const memBot = await guild.getMember(discord.getBotId());
  let shortCode = lang;
  if (typeof lang === 'object') {
    shortCode = lang.shortcode;
  }
  if (Array.isArray(pool)) {
    const pf = pool.find((e: any) => {
      return e.id === message.id && e.translations.indexOf(shortCode) > -1;
    });
    if (typeof pf !== 'undefined') {

      if (
        memBot !== null &&
        channel.canMember(memBot, discord.Permissions.MANAGE_MESSAGES)
      ) {
        await message.deleteReaction(reaction.emoji.name, reaction.userId);
      }
      return false;
    }
  }
  if (lang === 'pride') {
    await channel.sendMessage(
      reaction.member.toMention() + " , sorry but I don't speak the gay"
    );
    return false;
  } else if (lang === 'piratespeak') {
    await saveToPool(pool, message.id, lang);
    const langTyped = await gTranslate.detectLanguage(message.content);
    const foundEn = langTyped.find((e: any) => {
      return e.language === 'en' && e.confidence >= 0.9;
    });
    if (typeof foundEn === 'undefined') {
      await channel.sendMessage(
        reaction.member.toMention() +
          ' , only english messages can be pirate-spoken <:pirate:713103123912065024>'
      );
      return false;
    }
    const pirateey = await pirateSpeak(message.content);
    if (typeof pirateey !== 'string') {
      await channel.sendMessage(
        reaction.member.toMention() +
          ' , pirate api decided to fail for whatever reason <:pirate:713103123912065024>'
      );
      console.error(pirateey);
      return false;
    }
    if (pirateey.toLowerCase() === message.content.toLowerCase()) {
      await channel.sendMessage(
        reaction.member.toMention() +
          " <:pirate:713103123912065024> the pirate api is dogshit and decided to return the exact same text that we sent it, so i won't display it <:pirate:713103123912065024>"
      );
      return false;
    }
    await translationEmbed(
      channel,
      message,
      reaction.member.user,
      'English',
      `${discord.decor.Emojis.PIRATE_FLAG}<:pirate:713103123912065024>${discord.decor.Emojis.PIRATE_FLAG}`,
      pirateey
    );
    return false;
  }
  if (!(lang instanceof constants.Language)) {
    return;
  }

  const translation = await gTranslate.translate(message.content, lang.shortcode);
  const sourceLang = constants.languages.find(
    (e) => e.shortcode === translation.detectedSourceLanguage
  );
  const ll = sourceLang.name ?? translation.detectedSourceLanguage;
  await saveToPool(pool, message.id, lang.shortcode);

  if (
    ll === lang.name ||
    message.content.toLowerCase() === translation.translatedText.toLowerCase()
  ) {
    await channel.sendMessage(
      reaction.member.toMention() + " , I couldn't translate that! :("
    );
    if (
      memBot !== null &&
      channel.canMember(memBot, discord.Permissions.MANAGE_MESSAGES)
    ) {
      await message.deleteReaction(reaction.emoji.name, reaction.userId);
    }
    return false;
  }
  await translationEmbed(
    channel,
    message,
    reaction.member.user,
    ll,
    lang.name,
    translation.translatedText
  );
  return false;
}
