export class GuildConfig {
    channels: Map<discord.Snowflake, ChannelConfig>;
    constructor(channels: Map<discord.Snowflake, ChannelConfig>) {
      this.channels = channels;
      return this;
    }
  }
  export class ChannelScopes {
    include: Array<string> = new Array<string>();
    exclude: Array<string> = new Array<string>();
    constructor(includes: Array<string>, excludes: Array<string>) {
      this.include = includes;
      this.exclude = excludes;
    }
  }
  
  export class ChannelConfig {
    description: string = '';
    scopes: ChannelScopes;
    embed: boolean = false;
    footerAvatar: string | undefined = undefined;
    webhookUrl: string | undefined = undefined;
    showEventName: boolean = false;
    showTimestamps: boolean = false;
    constructor(
      desc: string,
      includes: Array<string>,
      excludes: Array<string> = [],
      embed: boolean = false,
      footer: string | undefined = undefined,
      webhook: string | undefined = undefined,
      showEventName: boolean = false,
      showTimestamps: boolean = false
    ) {
      this.description = desc;
      this.scopes = new ChannelScopes(includes, excludes);
      this.embed = embed;
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
    showEventName = false
  ) {
    return new ChannelConfig(
      '',
      inc,
      exc,
      false,
      undefined,
      undefined,
      showEventName,
      timestamps
    );
  }
  export function chEmbed(
    desc: string,
    inc: Array<string>,
    exc: Array<string> = [],
    footerUrl: string | undefined = undefined,
    webhook: string | undefined = undefined,
    showTimestamps = true,
    showEventName = false
  ) {
    return new ChannelConfig(
      desc,
      inc,
      exc,
      true,
      footerUrl,
      webhook,
      showEventName,
      showTimestamps
    );
  }
  