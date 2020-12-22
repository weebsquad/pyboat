export class ChannelScopes {
    include: Array<string> = new Array<string>();
    exclude: Array<string> = new Array<string>();
    constructor(includes: Array<string>, excludes: Array<string>) {
      this.include = includes;
      this.exclude = excludes;
    }
}

export interface ParsedAttachment extends discord.Message.IOutgoingMessageAttachment {
  url: string;
}

export class ChannelConfig {
    description = '';
    scopes: ChannelScopes;
    embed = false;
    embedColor: number | undefined = undefined;
    footerAvatar: string | undefined = undefined;
    webhookUrl: string | undefined = undefined;
    showEventName = false;
    showTimestamps = false;
    constructor(
      desc: string,
      includes: Array<string>,
      excludes: Array<string> = [],
      embed = false,
      embedColor: number | undefined = undefined,
      footer: string | undefined = undefined,
      webhook: string | undefined = undefined,
      showEventName = false,
      showTimestamps = false,
    ) {
      this.description = desc;
      this.scopes = new ChannelScopes(includes, excludes);
      this.embed = embed;
      this.embedColor = embedColor;
      this.webhookUrl = webhook;
      this.footerAvatar = footer;
      this.showEventName = showEventName;
      this.showTimestamps = showTimestamps;
      return this;
    }
}

export function chPlain(
  inc: Array<string>,
  exc: Array<string> = [],
  timestamps = true,
  showEventName = false,
) {
  return new ChannelConfig(
    '',
    inc,
    exc,
    false,
    undefined,
    undefined,
    undefined,
    showEventName,
    timestamps,
  );
}
export function chEmbed(
  desc: string,
  inc: Array<string>,
  exc: Array<string> = [],
  footerUrl: string | undefined = undefined,
  embedColor: number | undefined = undefined,
  webhook: string | undefined = undefined,
  showTimestamps = true,
  showEventName = false,
) {
  return new ChannelConfig(
    desc,
    inc,
    exc,
    true,
    embedColor,
    footerUrl,
    webhook,
    showEventName,
    showTimestamps,
  );
}
