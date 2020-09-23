import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import { Ranks, config, globalConfig } from '../config';
import { saveMessage } from './admin';

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
  const res: any = await msg.reply(async () => {
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
  subCmdGroup.default((ctx) => ({ tagName: ctx.text() }), async (msg, { tagName }) => {
    await showTag(msg, tagName);
  }, { filters: c2.getFilters('tags.tags.show', Ranks.Guest) });
  subCmdGroup.on(
    { name: 'show', filters: c2.getFilters('tags.tags.show', Ranks.Guest) },
    (ctx) => ({ tagName: ctx.text() }),
    async (msg, { tagName }) => {
      await showTag(msg, tagName);
    },
  );
  subCmdGroup.on(
    { name: 'create', aliases: ['set', 'define', 'make', 'edit'], filters: c2.getFilters('tags.tags.create', Ranks.Guest) },
    (ctx) => ({ tagName: ctx.string(), content: ctx.text() }),
    async (msg, { tagName, content }) => {
      const res: any = await msg.reply(async () => {
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
  );
  subCmdGroup.on(
    { name: 'delete', aliases: ['remove', 'rm', 'del'], filters: c2.getFilters('tags.tags.delete', Ranks.Guest) },
    (ctx) => ({ tagName: ctx.string() }),
    async (msg, { tagName }) => {
      const res: any = await msg.reply(async () => {
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
  );
  subCmdGroup.on(
    { name: 'info', aliases: ['inf'], filters: c2.getFilters('tags.tags.info', Ranks.Guest) },
    (ctx) => ({ tagName: ctx.string() }),
    async (msg, { tagName }) => {
      const res: any = await msg.reply(async () => {
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
  );
  subCmdGroup.raw(
    { name: 'clearall', aliases: ['removeall'], filters: c2.getFilters('tags.tags.removeall', Ranks.Administrator) },
    async (msg) => {
      const res: any = await msg.reply(async () => {
        const removed = await pool.getAll<Tag>();
        await pool.clear();
        return `Removed ${removed.length} tags!`;
      });
      saveMessage(res);
    },
  );
  subCmdGroup.raw(
    { name: 'list', aliases: ['all'], filters: c2.getFilters('tags.tags.all', Ranks.Authorized) },
    async (msg) => {
      const res: any = await msg.reply(async () => {
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
  );
}
export function InitializeCommands() {
  const _groupOptions = {
    description: 'Tag Commands',
    filters: c2.getFilters('tags', Ranks.Guest),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  cmdGroup.subcommand({ name: 'tag', filters: c2.getFilters('tags.tags', Ranks.Moderator) }, subTags);
  cmdGroup.subcommand({ name: 'tags', filters: c2.getFilters('tags.tags', Ranks.Moderator) }, subTags);
  return cmdGroup;
}
