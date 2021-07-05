/* eslint-disable @typescript-eslint/ban-ts-comment */
import { version, globalConfig, InitializeConfig, config, deployDate } from '../config';
import * as utils from '../lib/utils';
import * as infractions from '../modules/infractions';
import * as starboard from '../modules/starboard';
import * as antiSpam from '../modules/antiSpam';
import * as admin from '../modules/admin';
import * as pools from '../lib/storagePools';
import * as ratelimit from '../lib/eventHandler/ratelimit';
import * as queue from '../lib/eventHandler/queue';
import * as crons from '../lib/crons';
import * as github from '../lib/github';
import * as updates from '../updates';
import { AL_OnMessageDelete } from '../modules/logging/events/messageDelete';
import { registerChatOn, registerChatRaw, registerChatSubCallback } from '../modules/commands';
import { language as i18n } from '../localization/interface';
import { buildLanguage } from '../localization/builder';

type Runner<T> = (setup: T) => Promise<void>;
type Setup<T> = () => Promise<T> | T;
type Teardown<T> = (setup: T) => Promise<void>;
type TestF<T> = (name: string, runner: Runner<T>) => void;
type Result =
  | { name: string; success: true }
  | { name: string; success: false; error: Error };

function arrayEquals<T>(array1: T[], array2: T[]): boolean {
  return (
    array1.length === array2.length
      && array1.every((value, index) => value === array2[index])
  );
}

function jsonWordCounter(json: any) {
  let count = 0;
  if (typeof json === 'string') {
    json.split(' ').map((word) => {
      if (word.length > 2 && /^[a-z]+$/ig.test(word)) {
        count++;
      }
    });
  } else {
    for (const key in json) {
      count += jsonWordCounter(json[key]);
    }
  }
  return count;
}
async function runTests<T = undefined>(
  globalRunner: (test: TestF<T>) => void,
  filter = '',
  setup?: Setup<T>,
  teardown?: Teardown<T>,
): Promise<{ results: Result[]; numTestsSkipped: number }> {
  const tests: { name: string; runner: Runner<T> }[] = [];
  const collector = (name: string, runner: (setup: T) => Promise<void>) => {
    tests.push({ name, runner });
  };

  globalRunner(collector);
  const results: Result[] = [];
  let numTestsSkipped = 0;

  filter = filter.toLowerCase();
  // await Promise.all(tests.map(async ({name, runner}) => {
  for (const { name, runner } of tests) {
    if (filter !== '' && !name.toLowerCase().includes(filter)) {
      numTestsSkipped += 1;
      continue;
    }

    const t = setup != null ? await setup() : undefined;
    try {
      await runner(t!);
      results.push({ name, success: true });
    } catch (e) {
      results.push({ name, success: false, error: e });
    }

    if (t !== undefined && teardown) {
      await teardown(t);
    }
  }
  return { results, numTestsSkipped };
}

function formatResults({
  results,
  numTestsSkipped,
}: {
  results: Result[];
  numTestsSkipped: number;
}): discord.Embed {
  const testsPassed: string[] = [];
  const testsFailed: { name: string; error: Error }[] = [];

  for (const result of results) {
    if (result.success === true) {
      testsPassed.push(result.name);
    } else {
      testsFailed.push({ name: result.name, error: result.error });
    }
  }

  const embed = new discord.Embed();
  const titleParts = [];
  if (testsPassed.length > 0) {
    titleParts.push(`:green_circle: **${testsPassed.length}** tests passed`);
  }
  if (testsFailed.length > 0) {
    titleParts.push(`:red_circle: **${testsFailed.length}** tests failed`);
  }
  if (numTestsSkipped > 0) {
    titleParts.push(`:yellow_circle: **${numTestsSkipped}** tests skipped`);
  }

  embed.setTitle(`${titleParts.join(', ')}.`);
  const descriptionLines = [];
  for (const { name, error } of testsFailed) {
    descriptionLines.push(`🔴 **${name}** - ${error.message}`);
  }

  for (const name of testsPassed) {
    descriptionLines.push(`🟢 **${name}**`);
  }

  const description = descriptionLines.join('\n').substr(0, 2000);
  embed.setDescription(description);

  return embed;
}

function assert(x: any, message: string): asserts x {
  if (!x) {
    throw new Error(message);
  }
}

// const F = discord.command.filters;
// const kv = new pylon.KVNamespace('commands_dev');
export function InitializeCommands() {
  const _groupOptions: any = {
    description: 'Dev commands',
    defaultPrefix: globalConfig.devPrefix,
    mentionPrefix: false,
    register: false,
  };

  const cmdGroup = new discord.command.CommandGroup(_groupOptions);

  const cmdGroupOverrides = new discord.command.CommandGroup(_groupOptions);

  registerChatOn(
    cmdGroupOverrides,
    'override',
    (ctx) => ({ txt: ctx.textOptional() }),
    async (msg, { txt }) => {
      const res: any = await msg.inlineReply(async () => {
        const hasActiveOv = await utils.isGAOverride(msg.author.id);
        if (typeof (txt) === 'string' && txt.length > 0) {
          if (hasActiveOv) {
            if (['disable', 'delete', 'remove'].includes(txt.toLowerCase())) {
              const rtv = await utils.deleteGaOverride(msg.author.id);
              if (rtv !== true) {
                return `Error while deleting override: ${rtv}`;
              }
              return `${discord.decor.Emojis.WHITE_CHECK_MARK} Override disabled!`;
            }
          } else {
            const msd = utils.timeArgumentToMs(txt);
            if (msd !== 0) {
              if (msd < 60 * 1000 || msd > 7 * 24 * 60 * 60 * 1000) {
                return 'time to override must be at least 1 minute and at most 7 days';
              }
              const retv = await utils.insertGaOverride(msg.author.id, msd);
              if (retv !== true) {
                return `Error while adding override: ${retv}`;
              }
              return `${discord.decor.Emojis.WHITE_CHECK_MARK} Override added!`;
            }
          }
        }
        if (globalConfig.masterGuild === msg.guildId) {
          return `${discord.decor.Emojis.WHITE_CHECK_MARK} You have an override active in this guild permanently due to it being the control guild.`;
        }
        const tmleft = hasActiveOv === true ? await utils.getOverrideTimeLeft(msg.author.id) : 0;
        const parsedTimeLeft = utils.getLongAgoFormat(tmleft, 2, false, 'second');
        let txtR = hasActiveOv === true ? `${discord.decor.Emojis.WHITE_CHECK_MARK} You currently have an override active which expires ${parsedTimeLeft}` : `${discord.decor.Emojis.X} You do not have any overrides active in this guild.`;
        txtR += hasActiveOv === true ? `\nTo revoke this override, please run the command \`${globalConfig.devPrefix}override disable\`` : `\nTo active an override, please run the command \`${globalConfig.devPrefix}override <time>\``;
        return txtR;
      });
      admin.saveMessage(res);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );

  registerChatRaw(
    cmdGroup,
    'eval',
    async (msg) => {
      if (msg.content.length < 4 || !msg.content.includes(' ')) {
        throw new TypeError('No eval argument specified');
      }
      const code = msg.content
        .split(' ')
        .splice(1)
        .join(' ');
      if (code === null || code.length < 3) {
        throw new TypeError('No eval argument specified');
      }
      const guild = await msg.getGuild();
      // eslint-disable-next-line
    const AsyncFunction = Object.getPrototypeOf(async () => {})
        .constructor;
      const fakeConsole = new utils.FakeConsole(await msg.getChannel());
      const _args = ['console', 'msg', 'discord', 'pylon', 'fetch', 'guild'];
      try {
        const func = new AsyncFunction(..._args, code);

        await func(fakeConsole, msg, discord, pylon, fetch, guild);
      } catch (e) {
        fakeConsole.log(e);
      }
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );
  registerChatOn(
    cmdGroup,
    'falseupdate',
    (ctx) => ({ member: ctx.guildMember() }),
    async (msg, { member }) => {
      await member.edit({
        nick: typeof member.nick === 'string' ? member.nick : undefined,
        roles: member.roles,
        // mute: false,
        // deaf: false
        channelId: null,
      });
      const res: any = await msg.inlineReply('done');
      admin.saveMessage(res);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );
  registerChatRaw(
    cmdGroup,
    'reload',
    async (msg) => {
      const cfgres = await InitializeConfig(true);
      let txt = `${discord.decor.Emojis.WHITE_CHECK_MARK} reloaded the servers config!`;
      if (!cfgres) {
        txt = `${discord.decor.Emojis.X} Failed to reload the server's config`;
      }
      const res: any = await msg.inlineReply(txt);
      admin.saveMessage(res);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );
  registerChatRaw(
    cmdGroup,
    'deploy',
    async (msg, repo) => {
      if (repo === null || repo.length < 1) {
        repo = 'pyboat';
      }
      if (!globalConfig.github.deployments[repo.toLowerCase()]) {
        return 'Invalid repo name';
      }
      const res = await msg.inlineReply(`<a:loading:735794724480483409> Deploying __${repo.toLowerCase()}__ @ master`);
      if (res instanceof discord.GuildMemberMessage) {
        admin.saveMessage(res);
      }
      const r = await github.sendDispatchEvent(globalConfig.github.org, repo, globalConfig.github.deployments[repo.toLowerCase()]);
      if (r === true) {
        for (let i = 0; i < 9; i++) {
          const runs = await github.getWorkflowRuns(globalConfig.github.org, repo, globalConfig.github.deployments[repo.toLowerCase()], 'queued');
          if (runs && runs.workflow_runs && runs.workflow_runs.length > 0) {
            await res.edit(`Sent deployment dispatch event: <https://github.com/${globalConfig.github.org}/${repo.toLowerCase()}>\n\t**=>** <${runs.workflow_runs[0].html_url}>`);
            return;
          }
          await sleep(300);
        }
        await res.edit(`Sent deployment dispatch event: <https://github.com/${globalConfig.github.org}/${repo.toLowerCase()}>\n\t**=>** __Could not grab run URL__`);
        return;
      }
      await res.edit(`${discord.decor.Emojis.X} Failed to deploy!`);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );
  registerChatSubCallback(cmdGroup, 'test', (sub) => {
    registerChatRaw(
      sub,
      'error',
      async () => {
        throw new Error('testing pls ignore');
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'permerror',
      async (msg) => {
        const guild = await msg.getGuild();
        const owner = await guild.getMember(guild.ownerId);
        await owner.edit({ nick: 'asdasdasd' });
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'argerror',
      (ctx) => ({
        u: ctx.user(),
        usr2: ctx.integer(),
        usr3: ctx.guildChannelOptional(),
      }),
      async () => {
        console.log('cmd ran!');
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    // http://i0.tf/q261q.zip
    registerChatRaw(
      sub,
      'cpu',
      async (m) => {
      // @ts-ignore
        const cpuinitial = await pylon.getCpuTime();
        const res: any = await m.inlineReply('<a:loading:735794724480483409>');
        await InitializeConfig(true);
        // @ts-ignore
        const cfgafter = Math.floor(await pylon.getCpuTime() - cpuinitial);
        await res.edit(`**Command Handler Reached:** ${Math.floor(cpuinitial)}ms\n**Reload:** ${cfgafter}ms`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'kv',
      async (m, filter) => {
        const res: any = await m.inlineReply(async () => {
          const start = Date.now();
          const results = await runTests(
            (test) => {
              test('get / put', async (kv) => {
                await kv.put('put', 1);
                assert((await kv.get('put')) === 1, 'put did not match.');
              });

              test('put if not exists fails if key exists', async (kv) => {
                await kv.put('put', 1);
                try {
                  await kv.put('put', 1, { ifNotExists: true });
                  assert(false, 'should have failed');
                } catch (_) {}
              });

              test('put if not exists sets key', async (kv) => {
                await kv.put('put', 1, { ifNotExists: true });
                assert((await kv.get('put')) === 1, 'put did not match.');
              });

              test('get / put array buffer', async (kv) => {
                const buffer = new Uint8Array([1, 2, 3]);
                await kv.putArrayBuffer('buffer', buffer.buffer);
                const buffer2 = await kv.getArrayBuffer('buffer');
                assert(buffer2 != null, 'buffer was not set?');
                const u8Buf = new Uint8Array(buffer2);
                assert(u8Buf.length === 3, 'get did not match in length');
                assert(u8Buf[0] === 1, 'idx 0 wrong');
                assert(u8Buf[1] === 2, 'idx 1 wrong');
                assert(u8Buf[2] === 3, 'idx 2 wrong');
              });

              test('get array buffer doesnt work on strings', async (kv) => {
                await kv.put('put', 'hello');
                try {
                  await kv.getArrayBuffer('put');
                  assert(false, 'should have thrown');
                } catch (e) {
                  assert(e.message === 'Value is string', `wrong error: ${e.message}`);
                }
              });

              test('get doesnt work on bytes', async (kv) => {
                const buffer = new Uint8Array([1, 2, 3]);
                await kv.putArrayBuffer('put', buffer.buffer);
                try {
                  await kv.get('put');
                  assert(false, 'should have thrown');
                } catch (e) {
                  assert(e.message === 'Value is bytes', `wrong error: ${e.message}`);
                }
              });

              test('delete', async (kv) => {
                await kv.put('delete', 1);
                await kv.delete('delete');
                assert(
                  (await kv.get('delete')) === undefined,
                  'key still exists after delete.',
                );
              });

              test('delete if equals', async (kv) => {
                await kv.put('delete', 1);
                await kv.delete('delete', { prevValue: 1 });
                assert(
                  (await kv.get('delete')) === undefined,
                  'key still exists after delete.',
                );
              });

              test('delete if equals does not delete if not equals', async (kv) => {
                await kv.put('delete', 1);
                try {
                  await kv.delete('delete', { prevValue: 2 });
                  assert(false, 'should have failed');
                } catch (_) {}

                assert((await kv.get('delete')) === 1, 'key should still exist.');
              });

              test('put with ttl', async (kv) => {
                await kv.put('ttl', 1, { ttl: 1 });
                await sleep(5);
                assert(
                  (await kv.get('ttl')) === undefined,
                  'key should have ttled out',
                );
              });

              test('put with ttlEpoch', async (kv) => {
                await kv.put('ttl', 1, { ttlEpoch: new Date(Date.now() + 1) });
                await sleep(5);
                assert(
                  (await kv.get('ttl')) === undefined,
                  'key should have ttled out',
                );
              });

              test('list', async (kv) => {
                await kv.put('a', 1);
                await kv.put('b', 1);
                await kv.put('c', 1);

                assert(arrayEquals(await kv.list(), ['a', 'b', 'c']), 'keys not equal');

                assert(
                  arrayEquals(await kv.list({ limit: 1 }), ['a']),
                  'keys not equal',
                );
                assert(
                  arrayEquals(await kv.list({ from: 'a' }), ['b', 'c']),
                  'keys not equal',
                );
                assert(
                  arrayEquals(await kv.list({ from: 'a', limit: 1 }), ['b']),
                  'keys not equal',
                );
              });

              test('cas set nx', async (kv) => {
                await kv.cas('nx', undefined, 1);
                assert((await kv.get('nx')) === 1, 'cas failed');
              });

              test('cas set nx, fail', async (kv) => {
                await kv.put('nx', 1);
                try {
                  await kv.cas('nx', undefined, 2);
                  assert(false, 'should have failed');
                } catch (_) {}
                assert((await kv.get('nx')) === 1, 'cas failed');
              });

              test('cas set nx, expires', async (kv) => {
                await kv.cas('nx', undefined, 1, 50);
                assert((await kv.get('nx')) === 1, 'cas failed');
                await sleep(50);
                assert((await kv.get('nx')) === undefined, 'key did not expire');
              });

              test('cas - compare and swap', async (kv) => {
                await kv.cas('nx', undefined, 1);
                assert((await kv.get('nx')) === 1, 'cas failed');
                await kv.cas('nx', 1, 2);
                assert((await kv.get('nx')) === 2, 'cas failed');
                await kv.cas('nx', 2, 3);
                assert((await kv.get('nx')) === 3, 'cas failed');
              });

              test('cas - compare and delete', async (kv) => {
                await kv.cas('nx', undefined, 1);
                assert((await kv.get('nx')) === 1, 'cas failed');
                await kv.cas('nx', 1, undefined);
                assert((await kv.get('nx')) === undefined, 'key did not delete');
              });

              test('cas multi - simple cas', async (kv) => {
                await kv.put('a', 1);
                await kv.put('b', 1);

                await kv.casMulti([
                  ['a', 1, 2],
                  ['b', 1, 2],
                ]);

                assert((await kv.get('a')) === 2, 'cas failed');
                assert((await kv.get('b')) === 2, 'cas failed');
              });

              test('cas multi - compare and delete', async (kv) => {
                await kv.put('a', 1);
                await kv.put('b', 1);

                await kv.casMulti([
                  { key: 'a', compare: 1, set: undefined },
                  { key: 'b', compare: 1, set: undefined },
                ]);

                assert((await kv.get('a')) === undefined, 'cas failed');
                assert((await kv.get('b')) === undefined, 'cas failed');
              });

              test('cas multi - set nx', async (kv) => {
                await kv.casMulti([
                  { key: 'a', compare: undefined, set: 1 },
                  { key: 'b', compare: undefined, set: 1 },
                ]);

                assert((await kv.get('a')) === 1, 'cas failed');
                assert((await kv.get('b')) === 1, 'cas failed');
              });

              test('cas multi - atomic', async (kv) => {
                await kv.put('b', 0);

                try {
                  await kv.casMulti([
                    { key: 'a', compare: undefined, set: 1 },
                    { key: 'b', compare: 1, set: 2 },
                  ]);
                  assert(false, 'should have failed');
                } catch (_) {}

                assert((await kv.get('a')) === undefined, 'cas: a failed');
                assert((await kv.get('b')) === 0, 'cas: b failed');
              });

              test('cas multi - expires', async (kv) => {
                await kv.casMulti([{ key: 'a', compare: undefined, set: 1, ttl: 50 }]);

                assert((await kv.get('a')) === 1, 'cas: a failed');
                await sleep(50);
                assert(
                  (await kv.get('a')) === undefined,
                  'cas: a failed, key not expired',
                );
              });

              test('transact', async (kv) => {
                const nextScore = await kv.transact<number>('transact', (prev) => {
                  assert(prev === undefined, 'prev should be undefined');
                  return (prev ?? 0) + 1;
                });

                assert(nextScore === 1, 'next should be 1');
                assert((await kv.get('transact')) === 1, 'next should be 1');
              });

              test('transact update', async (kv) => {
                await kv.put('transact', 1);
                const nextScore = await kv.transact<number>('transact', (prev) => {
                  assert(prev === 1, 'prev should be 1');
                  return (prev ?? 0) + 1;
                });

                assert(nextScore === 2, 'next should be 2');
                assert((await kv.get('transact')) === 2, 'next should be 2');
              });

              test('transact delete', async (kv) => {
                await kv.put('transact', 1);
                const nextScore = await kv.transact<number>('transact', (_prev) => undefined);

                assert(nextScore === undefined, 'next should be undefined');
                assert(
                  (await kv.get('transact')) === undefined,
                  'next should be undefined',
                );
              });

              test('transact with result', async (kv) => {
                const { next: nextScore, result } = await kv.transactWithResult<
                  number,
                  number | undefined
                >('transact', (prev) => {
                  assert(prev === undefined, 'prev should be undefined');
                  return { next: (prev ?? 0) + 1, result: prev };
                });

                assert(result === undefined, 'result should be undefined');
                assert(nextScore === 1, 'next should be 1');
                assert((await kv.get('transact')) === 1, 'next should be 1');
              });

              test('transact multi', async (kv) => {
                await kv.put('a', 10);
                await kv.put('b', 0);
                const [a, b] = await kv.transactMulti<number, number>(
                  ['a', 'b'],
                  ([a2, b2]) => [b2, a2],
                );

                assert(a === 0, 'cas failed: a');
                assert((await kv.get('a')) === 0, 'cas failed get: a');
                assert(b === 10, 'cas failed: b');
                assert((await kv.get('b')) === 10, 'cas failed get: b');
              });
              test('transact multi with result', async (kv) => {
                await kv.put('a', 10);
                await kv.put('b', 0);
                const {
                  next: [a, b],
                  result,
                } = await kv.transactMultiWithResult<number, number, number>(
                  ['a', 'b'],
                  ([a2, b2]) => ({ next: [b2, a2], result: (a2 ?? 0) + (b2 ?? 0) }),
                );

                assert(result === 10, 'result failed');
                assert(a === 0, 'cas failed: a');
                assert((await kv.get('a')) === 0, 'cas failed get: a');
                assert(b === 10, 'cas failed: b');
                assert((await kv.get('b')) === 10, 'cas failed get: b');
              });
            },
            filter,
            () => new pylon.KVNamespace('test'),
            async (kv) => {
              for (const key of await kv.list()) {
                await kv.delete(key);
              }
            },
          );
          return { content: `Took ${Date.now() - start}ms`, embed: formatResults(results) };
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'kvmkeys',
      async (m) => {
        const keys = await utils.KVManager.listKeys();
        console.log(keys);
        const res: any = await m.inlineReply(`Found ${keys.length} keys!`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'user',
      async (m) => {
        const resUsr = await utils.getUser(m.author.id, true);
        if (!resUsr || !(resUsr instanceof utils.BetterUser)) {
          throw new Error('no user found');
        }
        const flags = new utils.UserFlags(resUsr.public_flags);
        const res: any = await m.inlineReply(`\`\`\`json\n${JSON.stringify(flags.serialize(), null, 2)}\n\`\`\``);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'clearkvm',
      async (m) => {
        const dt = Date.now();
        await utils.KVManager.clear();
        const res: any = await m.inlineReply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'runcleans',
      async (m) => {
        const dt = Date.now();
        await Promise.all(pools.InitializedPools.map(async (pool) => {
          await pool.clean();
        }));
        const res: any = await m.inlineReply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'avatar',
      async (m) => {
      // @ts-ignore
        const initial = await pylon.getCpuTime();
        const url = m.author.getAvatarUrl();
        const ext = url.split('.').slice(-1)[0];
        const avatar = await fetch(url);
        const data = await avatar.arrayBuffer();
        // @ts-ignore
        const diff = Math.floor(await pylon.getCpuTime() - initial);
        const res: any = await m.inlineReply({ content: `Done, took ${diff}ms cpu`, attachments: [{ name: `avatar.${ext}`, data }] });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'cron',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        await crons.onCron(key);
        const res: any = await m.inlineReply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'whmeme',
      (ctx) => ({ whUrl: ctx.string() }),
      async (m, { whUrl }) => {
        await m.delete();
        const embed = new discord.Embed();
        const guild = await m.getGuild();
        embed.setDescription(' ឵឵ ');
        let txt = '';
        for (let i = 0; i < 1900; i += 1) {
          txt += Math.floor(Math.random() * 10).toString();
        }
        embed.setFooter({ text: txt });
        embed.setTimestamp(new Date().toISOString());
        embed.setThumbnail({ url: 'https://cdn.discordapp.com/icons/307927177154789386/d9d9f4d5ebdc213a770f31c3860041e3.webp' });
        await utils.executeWebhook(whUrl, '', [embed], ' ឵឵ ', guild.getIconUrl(), false, {});
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'escape',
      (ctx) => ({ text: ctx.text() }),
      async (m, { text }) => {
        const len = text.length;
        const parsed = utils.escapeString(text);
        await m.inlineReply(`Parsed (${len} : ${parsed.length}) => ${parsed}`);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'invisrole',
      (ctx) => ({ roleid: ctx.string() }),
      async (m, { roleid }) => {
        const res: any = await m.inlineReply(async () => {
          const guild = await m.getGuild();
          const botMember = await guild.getMember(discord.getBotId());
          if (!botMember) {
            return 'Bot not found';
          }
          const roles = await guild.getRoles();
          const thisRole = roles.find((v) => v.id === roleid);
          if (!thisRole) {
            return 'Role not found';
          }
          await thisRole.edit({ name: '\u200b' });
          return 'Done';
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'invisrole2',
      (ctx) => ({ roleid: ctx.string() }),
      async (m, { roleid }) => {
        const res: any = await m.inlineReply(async () => {
          const guild = await m.getGuild();
          const roles = await guild.getRoles();
          const thisRole = roles.find((v) => v.id === roleid);
          if (!thisRole) {
            return 'Role not found';
          }
          await thisRole.edit({ name: ' ឵឵ ' });
          return 'Done';
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'getkvm',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        const keys = await utils.KVManager.get(key);
        console.log(keys);
        const res: any = await m.inlineReply(`Done, check console (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'getpool',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        const pool = pools.InitializedPools.find((v) => v.options.name === key);
        if (!pool) {
          const res: any = await m.inlineReply('Couldnt find that key');
          admin.saveMessage(res);
          return;
        }
        const items = await pool.getAll();
        const json = `\`\`\`json\n${JSON.stringify(items)}\n\`\`\``;
        if (json.length > 1990) {
          console.log(items);
          const res: any = await m.inlineReply(`Done, check console (${Date.now() - dt}ms)`);
          admin.saveMessage(res);
          return;
        }
        const res: any = await m.inlineReply(json);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'clearpool',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        const pool = pools.InitializedPools.find((v) => v.options.name === key);
        if (!pool) {
          const res: any = await m.inlineReply('Couldnt find that key');
          admin.saveMessage(res);
          return;
        }
        await pool.clear();
        const res: any = await m.inlineReply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'upd',
      (ctx) => ({ updnum: ctx.string() }),
      async (m, { updnum }) => {
        const res: any = await m.inlineReply(async () => {
          if (!updates.updates[updnum]) {
            return 'Update not found!';
          }
          // @ts-ignore
          const startms = Math.floor(await pylon.getCpuTime());
          await updates.updates[updnum]();
          // @ts-ignore
          const mstook = Math.floor(await pylon.getCpuTime()) - startms;
          return `Done! (Took **${mstook}**ms)`;
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );

    registerChatOn(
      sub,
      'movehighest',
      (ctx) => ({ roleid: ctx.string() }),
      async (m, { roleid }) => {
        const res: any = await m.inlineReply(async () => {
          const guild = await m.getGuild();
          const botMember = await guild.getMember(discord.getBotId());
          if (!botMember) {
            return 'Bot not found';
          }
          const highestBot = await utils.getMemberHighestRole(botMember);
          const roles = await guild.getRoles();
          const thisRole = roles.find((v) => v.id === roleid);
          if (!thisRole) {
            return 'Role not found';
          }
          if (thisRole.position >= highestBot.position) {
            return 'Bot can\'t move this role';
          }
          if (thisRole.position === highestBot.position - 1) {
            return 'Role already at max highness';
          }
          await guild.editRolePositions([{ id: thisRole.id, position: highestBot.position }, { id: highestBot.id, position: highestBot.position + 1 }]);
          return 'Done';
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatOn(
      sub,
      'movelowest',
      (ctx) => ({ roleid: ctx.string() }),
      async (m, { roleid }) => {
        const res: any = await m.inlineReply(async () => {
          const guild = await m.getGuild();
          const botMember = await guild.getMember(discord.getBotId());
          if (!botMember) {
            return 'Bot not found';
          }
          const highestBot = await utils.getMemberHighestRole(botMember);
          const roles = await guild.getRoles();
          const thisRole = roles.find((v) => v.id === roleid);
          if (!thisRole) {
            return 'Role not found';
          }
          if (thisRole.position >= highestBot.position) {
            return 'Bot can\'t move this role';
          }
          if (thisRole.position === 0) {
            return 'Role already at lowest';
          }
          await guild.editRolePositions([{ id: thisRole.id, position: 0 }]);
          return 'Done';
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'embed', async (m) => {
        const embed = new discord.Embed();
        embed.setDescription('does this even look good');
        let txt = '';
        for (let i = 0; i < 1900; i += 1) {
          txt += Math.floor(Math.random() * 10).toString();
        }
        // txt = '.' + '\n'.repeat(1000) + '.';
        embed.setFooter({ text: txt });
        embed.setTimestamp(new Date().toISOString());

        const res: any = await m.inlineReply({ embed });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'channelow',
      async (m) => {
        await admin.storeChannelData();
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'deployed',
      async (m) => {
        const formattedDtCreation = utils.getDiscordTimestamp(deployDate, 'D');
        const tdiff = utils.getDiscordTimestamp(deployDate, 'R');
        const res: any = await m.inlineReply(`The bot was deployed ${tdiff} **[**${formattedDtCreation}**]** - version **${version}**${globalConfig.version !== version ? ` - **OUTDATED** (newest: ${globalConfig.version})` : ''}`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'logqueue',
      async (m) => {
        const ev = { channelId: m.channelId, guildId: m.guildId, id: m.id } as discord.Event.IMessageDelete;
        const count = 50;
        for (let i = 0; i < count; i++) {
          AL_OnMessageDelete(utils.composeSnowflake(), m.guildId, {}, ev, m);
        }
        const res: any = await m.inlineReply(`Done sending ${count} message delete logs`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'i18nwords',
      async (m) => {
        const englando = await buildLanguage(globalConfig.localization.default, '');
        const wordCount = jsonWordCounter(englando);
        const res: any = await m.inlineReply(`i18n (source) has **${wordCount.toLocaleString()}** calculated words`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'mychannelow',
      async (m) => {
        await admin.storeChannelData();
        const res = await admin.getStoredUserOverwrites(m.author.id);
        console.log(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );

    registerChatRaw(
      sub,
      'clearsb',
      async (m) => {
        const now = Date.now();
        await starboard.clearData();
        const res: any = await m.inlineReply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );

    registerChatRaw(
      sub,
      'asclear',
      async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('antiSpam').clear();
        const res: any = await m.inlineReply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'asget',
      async (m) => {
        const now = Date.now();
        const res1 = await antiSpam.pools.getAll();
        const res: any = await m.inlineReply(`Done - ${res1.length} - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'getinfs',
      async (m) => {
        const now = Date.now();
        const infs = await infractions.infsPool.getAll();
        const res: any = await m.inlineReply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
        console.log(infs);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'clearinfs',
      async (m) => {
        await infractions.clearInfractions();
        const res: any = await m.inlineReply('Done');
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'modules',
      async (m) => {
        const res: any = await m.inlineReply(async () => {
          const mods = [];
          for (const key in config.modules) {
            if (typeof config.modules[key] === 'object' && typeof config.modules[key].enabled === 'boolean') {
              if (config.modules[key].enabled === true) {
                mods.push(key);
              }
            }
          }
          if (mods.length === 0) {
            return 'No modules enabled!';
          }
          return `Modules enabled: **(${mods.length})**\n\n\`${mods.join(', ')}\``;
        });
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'tracking',
      async (m) => {
        const now = Date.now();
        const res1 = await admin.adminPool.getItems();
        const poolsL = await admin.adminPool.getAll();
        console.log(`(4) res length: ${res1.length}, pools length: ${poolsL.length}`);

        let txt = '';
        let c = 0;
        res1.map((item: any) => {
          c++;
          txt += `\n${c} => ${item.value.length}`;
          if (item.value.length === 1) {
            console.log(item.key, item.value);
          }
        });
        const res: any = await m.inlineReply(`Done - **${res1.length} key(s)** // **${poolsL.length} total items** - (Took ${Date.now() - now}ms)\n\n\`\`\`\n${txt}\n\`\`\``);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );

    registerChatRaw(
      sub,
      'tracking_clr_ones',
      async (m) => {
        const now = Date.now();
        const res1 = await admin.adminPool.getItems();
        let txt = '';
        let c = 0;
        await Promise.all(res1.map(async (item: any) => {
          if (item.value.length === 1) {
            await new pylon.KVNamespace('admin').put(item.key, []);
            console.log('EMPTIED', item.key, item.value);
          } else {
            c++;
            txt += `\n${c} => ${item.value.length}`;
          }
        }));
        const res2 = await admin.adminPool.getItems();
        const poolsL = await admin.adminPool.getAll();
        console.log(`(4) res length: ${res1.length}, pools length: ${poolsL.length}`);
        const res: any = await m.inlineReply('done');
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'ratelimit',
      async (m) => {
        const now = Date.now();
        const res1 = ratelimit.poolGlob;
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'auditlogmsgdeletes',
      async (m) => {
        const chan = await m.getChannel();
        const guild = await m.getGuild();
        const randchan: Array<discord.GuildTextChannel> = <any>(await guild.getChannels()).filter((v) => v.type === discord.Channel.Type.GUILD_TEXT);
        if (randchan.length < 1) {
          throw new Error('no channels to post bot msg to');
        }

        const msgn = await randchan[0].sendMessage('lol');
        await chan.bulkDeleteMessages([m.id, msgn.id]);
        try {
          await msgn.delete();
        } catch (_) {}
        const res: any = await m.inlineReply('Done - Check audit logs.');
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'auditlogmsgdeletes2',
      async (m) => {
        const chan = await m.getChannel();
        const guild = await m.getGuild();
        const randchan: Array<discord.GuildTextChannel> = <any>(await guild.getChannels()).filter((v) => v.type === discord.Channel.Type.GUILD_TEXT);
        if (randchan.length < 1) {
          throw new Error('no channels to post bot msg to');
        }

        const msgn = await randchan[0].sendMessage('lol');
        const msgn2 = await randchan[1].sendMessage('lol');
        await chan.bulkDeleteMessages([m.author.id, msgn2.id, msgn.id]);
        try {
          await msgn.delete();
        } catch (_) {}
        try {
          await msgn2.delete();
        } catch (_) {}
        const res: any = await m.inlineReply('Done - Check audit logs.');
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'queue',
      async (m) => {
        const now = Date.now();
        const res1 = queue.queue;
        const res: any = await m.inlineReply(`Done - **${res1.length} item(s)** - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'cleartracking',
      async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('admin').clear();
        const res: any = await m.inlineReply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'join',
      async (m) => {
        const ch = await discord.getChannel('691752063134203974');
        if (!(ch instanceof discord.GuildVoiceChannel)) {
          return;
        }
        // await ch.voiceConnect();
        const res: any = await m.inlineReply('done');
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
    registerChatRaw(
      sub,
      'perms',
      async (m) => {
        // let permsVal: number | BigInt = BigInt('17179869186');
        const bot = await (await discord.getGuild()).getMember(discord.getBotId());
        const permsVal = bot.permissions;
        console.log(permsVal, typeof permsVal);
        console.log(m.member.permissions, typeof m.member.permissions);
        const p = new utils.Permissions(permsVal);
        console.log(p);
        const mp = p.serialize(false);
        /* for (const k in mp) {
          if (mp[k] === false) {
            delete mp[k];
          }
        } */
        const res: any = await m.inlineReply(
          `Test: \`${permsVal}n\`\n\`\`\`json\n${JSON.stringify(mp)}\n\`\`\``,
        );
        admin.saveMessage(res);
      },
      {
        permissions: {
          globalAdmin: true,
        },
      },
    );
  });

  registerChatOn(
    cmdGroup,
    'clearkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      await kve.clear();
      const res: any = await msg.inlineReply('done');
      admin.saveMessage(res);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'listkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      const items = await kve.items();
      const res: any = await msg.inlineReply(`\`\`\`json\n${JSON.stringify(items)}\n\`\`\``);
      admin.saveMessage(res);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );

  registerChatOn(
    cmdGroup,
    'getemoji',
    (ctx) => ({ emj: ctx.string() }),
    async (msg, { emj }) => {
      const guild = await msg.getGuild();
      const emoji = await guild.getEmoji(emj);
      const res: any = await msg.inlineReply(`\`\`\`\n${JSON.stringify(emoji)}\n\`\`\``);
      admin.saveMessage(res);
    },
    {
      permissions: {
        globalAdmin: true,
      },
    },
  );
  return [cmdGroup, cmdGroupOverrides];
}
