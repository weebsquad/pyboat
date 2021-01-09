import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { Ranks, config, globalConfig } from '../config';
import { saveMessage } from './admin';
import { registerSlash, registerSlashGroup, registerSlashSub, interactionChannelRespond, registerChatOn, registerChatRaw, executeChatCommand } from './commands';

const pool = new utils.StoragePool('tags', 0, 'id', 'ts');
class Tag {
    id: string;
    uses = 0;
    authorId: string;
    content: string;
    ts: number;
    constructor(name: string, author: string, content: string) {
      this.id = name;
      this.authorId = author;
      this.content = content;
      this.ts = Date.now();
      return this;
    }
}
export async function showTag(msg: discord.GuildMemberMessage, tagName: string) {
  const res: any = await msg.inlineReply(async () => {
    const nm = tagName.toLowerCase();
    const obj = await pool.getById<Tag>(nm);
    if (!obj) {
      return { content: 'No tag found with that name' };
    }

    pool.editTransact(obj.id, (vl: Tag) => {
      vl.uses += 1;
      return vl;
    });
    const usr: discord.User | null = await utils.getUser(obj.authorId);
    const emb = new discord.Embed();
    if (usr !== null) {
      emb.setAuthor({ name: usr.getTag(), iconUrl: usr.getAvatarUrl() });
    }
    emb.setDescription(obj.content);
    emb.setTitle(`Tag: ${obj.id}`);
    emb.setFooter({ text: `Requested by ${msg.author.getTag()} (${msg.author.id})` });
    emb.setTimestamp(new Date().toISOString());
    emb.setColor(0xfa7814);
    return { content: '', embed: emb };
  });
  saveMessage(res);
}
const blacklist = ['show', 'create', 'set', 'define', 'make', 'delete', 'del', 'rm', 'remove', 'info', 'inf', 'list', 'all', 'removeall', 'clearall', 'edit'];
export function subTags(subCmdGroup: discord.command.CommandGroup) {
  subCmdGroup.default(
    (ctx) => ({ tagName: ctx.text() }),
    async (...args) => {
      await executeChatCommand(
        'remind',
        { permissions: { level: Ranks.Guest, overrideableInfo: 'tags.tag.show' } },
        async (msg, { tagName }) => {
          await showTag(msg, tagName);
        }, ...args,
      );
    },
  );

  registerChatOn(
    subCmdGroup,
    'show',
    (ctx) => ({ tagName: ctx.text() }),
    async (msg, { tagName }) => {
      await showTag(msg, tagName);
    },
    {
      permissions: {
        level: Ranks.Guest,
        overrideableInfo: 'tags.tag.show',
      },
    },
  );
  registerChatOn(
    subCmdGroup,
    { name: 'set', aliases: ['set', 'define', 'make', 'edit', 'create'] },
    (ctx) => ({ tagName: ctx.string(), content: ctx.text() }),
    async (msg, { tagName, content }) => {
      const res: any = await msg.inlineReply(async () => {
        const testalph = tagName.toLowerCase().replace(/[a-zA-Z0-9_]+/g, '');
        const nm = tagName.toLowerCase();
        if (testalph.length !== 0 || nm.length < 2 || nm.length > 20) {
          return 'Tag name must be between 2 and 20 characters in length and may only contain alphanumeric characters!';
        }
        if (blacklist.includes(nm)) {
          return 'Invalid tag name!';
        }
        if (typeof config.modules.tags.maxLength === 'number' && content.length > config.modules.tags.maxLength) {
          return `Tag content may only be up to ${config.modules.tags.maxLength} characters in size!`;
        }
        const ex = await pool.getById<Tag>(nm);
        if (ex) {
          if (ex.authorId !== msg.author.id) {
            const lvl = utils.getUserAuth(msg.member);
            if (typeof config.modules.tags.levelEditOthers === 'number' && lvl < config.modules.tags.levelEditOthers) {
              return 'You may not edit other user\'s tags!';
            }
            const oldV = `${ex.content}`;
            ex.content = content;
            await pool.editPool(nm, ex);
            return `Edited tag with name \`${nm}\` !`;
          }
        }
        const newObj = new Tag(nm, msg.author.id, content);
        await pool.saveToPool(newObj);
        return `Saved tag with name \`${nm}\` !`;
      });
      saveMessage(res);
    },
    {
      permissions: {
        level: Ranks.Guest,
        overrideableInfo: 'tags.tag.set',
      },
    },
  );
  registerChatOn(
    subCmdGroup,
    { name: 'delete', aliases: ['remove', 'rm', 'del'] },
    (ctx) => ({ tagName: ctx.string() }),
    async (msg, { tagName }) => {
      const res: any = await msg.inlineReply(async () => {
        const nm = tagName.toLowerCase();
        const ex = await pool.getById<Tag>(nm);
        if (!ex) {
          return 'There is no tag with that name!';
        }
        if (ex.authorId !== msg.author.id) {
          const lvl = utils.getUserAuth(msg.member);
          if (typeof config.modules.tags.levelEditOthers === 'number' && lvl < config.modules.tags.levelEditOthers) {
            return 'You may not edit other user\'s tags!';
          }
        }
        await pool.editPool(nm, null);
        return `Deleted tag \`${nm}\` !`;
      });
      saveMessage(res);
    },
    {
      permissions: {
        level: Ranks.Guest,
        overrideableInfo: 'tags.tag.delete',
      },
    },
  );
  registerChatOn(
    subCmdGroup,
    { name: 'info', aliases: ['inf'] },
    (ctx) => ({ tagName: ctx.string() }),
    async (msg, { tagName }) => {
      const res: any = await msg.inlineReply(async () => {
        const nm = tagName.toLowerCase();
        const obj = await pool.getById<Tag>(nm);
        if (!obj) {
          return { content: 'There is no tag with that name!' };
        }
        const usr: discord.User | null = await utils.getUser(obj.authorId);
        const emb = new discord.Embed();
        emb.setDescription(`\n**By**: ${usr !== null ? `${usr.getTag()} ` : ''}[\`${obj.authorId}\`]\n**Uses**: **${obj.uses}**\n**Created**: ${new Date(obj.ts).toLocaleDateString()}`);
        emb.setTitle(`Tag: ${obj.id}`);
        emb.setFooter({ text: `Requested by ${msg.author.getTag()} (${msg.author.id})` });
        emb.setTimestamp(new Date().toISOString());
        emb.setColor(0xfa7814);
        return { content: '', embed: emb };
      });
      saveMessage(res);
    },
    {
      permissions: {
        level: Ranks.Guest,
        overrideableInfo: 'tags.tag.info',
      },
    },
  );
  registerChatRaw(
    subCmdGroup,
    { name: 'clearall', aliases: ['removeall'] },
    async (msg) => {
      const res: any = await msg.inlineReply(async () => {
        const removed = await pool.getAll<Tag>();
        await pool.clear();
        return `Removed ${removed.length} tags!`;
      });
      saveMessage(res);
    },
    {
      permissions: {
        level: Ranks.Administrator,
        overrideableInfo: 'tags.tag.clearall',
      },
    },
  );
  registerChatRaw(
    subCmdGroup,
    { name: 'list', aliases: ['all'] },
    async (msg) => {
      const res: any = await msg.inlineReply(async () => {
        const ex = await pool.getAll<Tag>();
        if (ex.length === 0) {
          return { content: 'There are no tags saved!' };
        }
        const emb = new discord.Embed();
        const sorted = ex.sort((a, b) => b.uses - a.uses).map((tag) => tag.id);
        emb.setDescription(sorted.join(', '));
        emb.setTitle('Tag List');
        emb.setColor(0xfa7814);
        return { content: '', embed: emb };
      });
      saveMessage(res);
    },
    {
      permissions: {
        level: Ranks.Authorized,
        overrideableInfo: 'tags.tag.list',
      },
    },
  );
}
export function InitializeCommands() {
  const _groupOptions = {
    description: 'Tag Commands',
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  cmdGroup.subcommand('tag', subTags);
  // cmdGroup.subcommand('tags', subTags);
  return cmdGroup;
}

const tagGroup = registerSlashGroup({ name: 'tag', description: 'Tags commands' }, { module: 'tags' });

registerSlashSub(
  tagGroup,
  { name: 'show', description: 'Gets a tag\'s value', options: (ctx) => ({ tag_name: ctx.string('The tag name to show') }) },
  async (inter, { tag_name }) => {
    const nm = tag_name.toLowerCase();
    const obj = await pool.getById<Tag>(nm);
    if (!obj) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('No tag found with that name');
      return false;
    }
    await inter.acknowledge(true);
    await pool.editTransact<Tag>(obj.id, (vl: Tag) => {
      vl.uses += 1;
      return vl;
    });
    const usr: discord.User | null = await utils.getUser(obj.authorId);
    const emb = new discord.Embed();
    if (usr !== null) {
      emb.setAuthor({ name: usr.getTag(), iconUrl: usr.getAvatarUrl() });
    }
    emb.setDescription(obj.content);
    emb.setTitle(`Tag: ${obj.id}`);
    emb.setFooter({ text: `Requested by ${inter.member.user.getTag()} (${inter.member.user.id})` });
    emb.setTimestamp(new Date().toISOString());
    emb.setColor(0xfa7814);

    await interactionChannelRespond(inter, { embed: emb });
  }, {
    permissions: {
      overrideableInfo: 'tags.tag.show',
      level: Ranks.Guest,
    },
    module: 'tags',
    parent: 'tag',
  },
);

registerSlashSub(
  tagGroup,
  { name: 'set', description: 'Creates or edits a tag', options: (ctx) => ({ tag_name: ctx.string('The tag name to edit'), value: ctx.string('The new value for this tag') }) },
  async (inter, { tag_name, value }) => {
    const testalph = tag_name.toLowerCase().replace(/[a-zA-Z0-9_]+/g, '');
    const nm = tag_name.toLowerCase();
    if (testalph.length !== 0 || nm.length < 2 || nm.length > 20) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('Tag name must be between 2 and 20 characters in length and may only contain alphanumeric characters!');
      return false;
    }
    if (blacklist.includes(nm)) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('Invalid tag name!');
      return false;
    }
    if (typeof config.modules.tags.maxLength === 'number' && value.length > config.modules.tags.maxLength) {
      await inter.acknowledge(false);
      await inter.respondEphemeral(`Tag content may only be up to ${config.modules.tags.maxLength} characters in size!`);
      return false;
    }
    const ex = await pool.getById<Tag>(nm);
    if (ex) {
      if (ex.authorId !== inter.member.user.id) {
        const lvl = utils.getUserAuth(inter.member);
        if (typeof config.modules.tags.levelEditOthers === 'number' && lvl < config.modules.tags.levelEditOthers) {
          await inter.acknowledge(false);
          await inter.respondEphemeral('You may not edit other user\'s tags!');
          return false;
        }
        await inter.acknowledge(true);
        ex.content = value;
        await pool.editPool(nm, ex);
        await interactionChannelRespond(inter, `Edited tag with name \`${nm}\` !`);
        return;
      }
    }
    await inter.acknowledge(true);
    const newObj = new Tag(nm, inter.member.user.id, value);
    await pool.saveToPool(newObj);
    await interactionChannelRespond(inter, `Saved tag with name \`${nm}\` !`);
  }, {
    permissions: {
      overrideableInfo: 'tags.tag.set',
      level: Ranks.Guest,
    },
    module: 'tags',
    parent: 'tag',
  },
);

registerSlashSub(
  tagGroup,
  { name: 'delete', description: 'Deletes a tag', options: (ctx) => ({ tag_name: ctx.string('The tag name to delete') }) },
  async (inter, { tag_name }) => {
    const nm = tag_name.toLowerCase();
    const ex = await pool.getById<Tag>(nm);
    if (!ex) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('There is no tag with that name!');
      return;
    }
    if (ex.authorId !== inter.member.user.id) {
      const lvl = utils.getUserAuth(inter.member);
      if (typeof config.modules.tags.levelEditOthers === 'number' && lvl < config.modules.tags.levelEditOthers) {
        await inter.acknowledge(false);
        await inter.respondEphemeral('You may not edit other user\'s tags!');
        return false;
      }
    }
    await inter.acknowledge(true);
    await pool.editPool(nm, null);
    await interactionChannelRespond(inter, `Deleted tag \`${nm}\` !`);
  }, {
    permissions: {
      overrideableInfo: 'tags.tag.delete',
      level: Ranks.Guest,
    },
    module: 'tags',
    parent: 'tag',
  },
);

registerSlashSub(
  tagGroup,
  { name: 'info', description: 'Gets statistics on a tag', options: (ctx) => ({ tag_name: ctx.string('The tag name to get info on') }) },
  async (inter, { tag_name }) => {
    const nm = tag_name.toLowerCase();
    const obj = await pool.getById<Tag>(nm);
    if (!obj) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('There is no tag with that name!');
      return false;
    }
    const usr: discord.User | null = await utils.getUser(obj.authorId);
    const emb = new discord.Embed();
    emb.setDescription(`\n**By**: ${usr !== null ? `${usr.getTag()} ` : ''}[\`${obj.authorId}\`]\n**Uses**: **${obj.uses}**\n**Created**: ${new Date(obj.ts).toLocaleDateString()}`);
    emb.setTitle(`Tag: ${obj.id}`);
    emb.setFooter({ text: `Requested by ${inter.member.user.getTag()} (${inter.member.user.id})` });
    emb.setTimestamp(new Date().toISOString());
    emb.setColor(0xfa7814);
    await interactionChannelRespond(inter, { content: '', embed: emb });
  }, {
    permissions: {
      overrideableInfo: 'tags.tag.info',
      level: Ranks.Guest,
    },
    module: 'tags',
    parent: 'tag',
  },
);

registerSlashSub(
  tagGroup,
  { name: 'clearall', description: 'Clears all tags on the server' },
  async (inter) => {
    const removed = await pool.getAll<Tag>();
    await pool.clear();
    await interactionChannelRespond(inter, `Removed ${removed.length} tags!`);
  }, {
    staticAck: true,
    permissions: {
      overrideableInfo: 'tags.tag.clearall',
      level: Ranks.Administrator,
    },
    module: 'tags',
    parent: 'tag',
  },
);

registerSlashSub(
  tagGroup,
  { name: 'list', description: 'List all tags on the server' },
  async (inter) => {
    const ex = await pool.getAll<Tag>();
    if (ex.length === 0) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('There are no tags saved!');
      return false;
    }
    await inter.acknowledge(true);
    const emb = new discord.Embed();
    const sorted = ex.sort((a, b) => b.uses - a.uses).map((tag) => tag.id);
    emb.setDescription(sorted.join(', '));
    emb.setTitle('Tag List');
    emb.setColor(0xfa7814);
    await interactionChannelRespond(inter, { content: '', embed: emb });
  }, {
    permissions: {
      overrideableInfo: 'tags.tag.list',
      level: Ranks.Authorized,
    },
    module: 'tags',
    parent: 'tag',
  },
);
