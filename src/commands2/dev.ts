/* eslint-disable @typescript-eslint/ban-ts-comment */
import { globalConfig, InitializeConfig, config } from '../config';
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import * as infractions from '../modules/infractions';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiSpam from '../modules/antiSpam';
import * as admin from '../modules/admin';
import * as pools from '../lib/storagePools';
import * as ratelimit from '../lib/eventHandler/ratelimit';
import * as queue from '../lib/eventHandler/queue';
import * as crons from '../lib/crons';
import * as github from '../lib/github';
import { handleEvent } from '../modules/logging/main';
import { AL_OnMessageDelete } from '../modules/logging/events/messageDelete';

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
  const _groupOptions = {
    description: 'Dev commands',
    defaultPrefix: globalConfig.devPrefix,
    filters: c2.getFilters(null, 0, false, true),
    mentionPrefix: false,
  };

  const optsGroup = c2.getOpts(_groupOptions);
  const cmdGroup = new discord.command.CommandGroup(optsGroup);

  /* const optsEval = c2.getOpts(_groupOptions);
  optsEval.defaultPrefix = '';
  optsEval.additionalPrefixes = [];
  optsEval.mentionPrefix = false;
  optsEval.filters = c2.getFilters(null, 0, false, true); */

  const optsOverrides = c2.getOpts(_groupOptions);
  optsOverrides.filters = c2.getFilters(null, 0, false, true);
  const cmdGroupOverrides = new discord.command.CommandGroup(optsOverrides);

  cmdGroupOverrides.on(
    'override',
    (ctx) => ({ txt: ctx.textOptional() }),
    async (msg, { txt }) => {
      const res: any = await msg.reply(async () => {
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
        let txtR = hasActiveOv === true ? `${discord.decor.Emojis.WHITE_CHECK_MARK} You currently have an override active which expires in ${parsedTimeLeft}` : `${discord.decor.Emojis.X} You do not have any overrides active in this guild.`;
        txtR += hasActiveOv === true ? `\nTo revoke this override, please run the command \`${globalConfig.devPrefix}override disable\`` : `\nTo active an override, please run the command \`${globalConfig.devPrefix}override <time>\``;
        return txtR;
      });
      admin.saveMessage(res);
    },
  );

  // const cmdGroupEval = new discord.command.CommandGroup(optsEval);
  cmdGroup.raw(
    { name: 'eval',
      onError(e: any) {
        return e;
      } },
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
  );
  cmdGroup.on(
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
      const res: any = await msg.reply('done');
      admin.saveMessage(res);
    },
  );
  cmdGroup.raw(
    'reload',
    async (msg) => {
      await InitializeConfig(true);
      const res: any = await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} reloaded the servers config!`);
      admin.saveMessage(res);
    },
  );
  cmdGroup.raw(
    'deploy',
    async (msg, repo) => {
      if (repo === null || repo.length < 1) {
        repo = 'pyboat';
      }
      if (!globalConfig.github.deployments[repo.toLowerCase()]) {
        return 'Invalid repo name';
      }
      const res = await msg.reply(`<a:loading:735794724480483409> Deploying __${repo.toLowerCase()}__ @ master`);
      if (res instanceof discord.GuildMemberMessage) {
        admin.saveMessage(res);
      }
      const r = await github.sendDispatchEvent(globalConfig.github.org, repo, globalConfig.github.deployments[repo.toLowerCase()]);
      if (r === true) {
        for (let i = 0; i < 6; i++) {
          const runs = await github.getWorkflowRuns(globalConfig.github.org, repo, globalConfig.github.deployments[repo.toLowerCase()], 'queued');
          if (runs && runs.workflow_runs && runs.workflow_runs.length > 0) {
            await res.edit(`Sent deployment dispatch event: <https://github.com/${globalConfig.github.org}/${repo.toLowerCase()}>\n\t**=>** <${runs.workflow_runs[0].html_url}>`);
            return;
          }
          await sleep(500);
        }
        await res.edit(`Sent deployment dispatch event: <https://github.com/${globalConfig.github.org}/${repo.toLowerCase()}>\n\t**=>** __Could not grab run URL__`);
        await sleep(2000);

        return;
      }
      await res.edit(`${discord.decor.Emojis.X} Failed to deploy!`);
    },
  );
  cmdGroup.subcommand('test', (sub) => {
    sub.on(
      'override',
      (ctx) => ({ level: ctx.number(), string: ctx.string() }),
      async (m, { string, level }) => {
        const res: any = await m.reply(async () => {
          const newlvl = c2.checkOverrides(level, string);
          if (newlvl.level === level) {
            return { content: 'Nothing changed.' };
          } if (newlvl.level === -1) {
            return { content: `\`${string}\` is disabled.` };
          }
          return { content: `Overriden level of \`${string}\`**[**${level}**]** >> **${c2.checkOverrides(level, string)}**` };
        });
        admin.saveMessage(res);
      },
    );

    sub.raw(
      'error', async () => {
        throw new Error('testing pls ignore');
      },
    );
    sub.raw(
      'kv', async (m, filter) => {
        const res: any = await m.reply(async () => {
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
    );
    sub.raw(
      'kvmkeys', async (m) => {
        const keys = await utils.KVManager.listKeys();
        console.log(keys);
        const res: any = await m.reply(`Found ${keys.length} keys!`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'user', async (m) => {
        const resUsr = await utils.getUser(m.author.id, true);
        if (!resUsr || !(resUsr instanceof utils.BetterUser)) {
          console.error('no');
          return;
        }
        const flags = new utils.UserFlags(resUsr.public_flags);
        const res: any = await m.reply(`\`\`\`json\n${JSON.stringify(flags.serialize(), null, 2)}\n\`\`\``);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'clearkvm', async (m) => {
        const dt = Date.now();
        await utils.KVManager.clear();
        const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'runcleans', async (m) => {
        const dt = Date.now();
        await Promise.all(pools.InitializedPools.map(async (pool) => {
          await pool.clean();
        }));
        const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.on(
      'cron',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        await crons.onCron(key);
        const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.on(
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
        await utils.sendWebhookPostComplex(whUrl, {
          embeds: [embed],
          allowed_mentions: {},
          avatar_url: guild.getIconUrl(),
          username: ' ឵឵ ',
        });
      },
    );
    sub.on(
      'escape',
      (ctx) => ({ text: ctx.text() }),
      async (m, { text }) => {
        const len = text.length;
        const parsed = utils.escapeString(text);
        await m.reply(`Parsed (${len} : ${parsed.length}) => ${parsed}`);
      },
    );
    sub.on(
      'getkvm',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        const keys = await utils.KVManager.get(key);
        console.log(keys);
        const res: any = await m.reply(`Done, check console (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.on(
      'getpool',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        const pool = pools.InitializedPools.find((v) => v.kvName === key);
        if (!pool) {
          const res: any = await m.reply('Couldnt find that key');
          admin.saveMessage(res);
          return;
        }
        const items = await pool.getAll();
        const json = `\`\`\`json\n${JSON.stringify(items)}\n\`\`\``;
        if (json.length > 1990) {
          console.log(items);
          const res: any = await m.reply(`Done, check console (${Date.now() - dt}ms)`);
          admin.saveMessage(res);
          return;
        }
        const res: any = await m.reply(json);
        admin.saveMessage(res);
      },
    );
    sub.on(
      'clearpool',
      (ctx) => ({ key: ctx.string() }),
      async (m, { key }) => {
        const dt = Date.now();
        const pool = pools.InitializedPools.find((v) => v.kvName === key);
        if (!pool) {
          const res: any = await m.reply('Couldnt find that key');
          admin.saveMessage(res);
          return;
        }
        await pool.clear();
        const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
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

        const res: any = await m.reply({ embed });
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'channelow', async (m) => {
        await admin.storeChannelData();
      },
    );
    sub.raw(
      'logqueue', async (m) => {
        const ev = { channelId: m.channelId, guildId: m.guildId, id: m.id } as discord.Event.IMessageDelete;
        const count = 50;
        for (let i = 0; i < count; i++) {
          AL_OnMessageDelete(utils.composeSnowflake(), m.guildId, {}, ev, m);
        }
        const res: any = await m.reply(`Done sending ${count} message delete logs`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'mychannelow', async (m) => {
        await admin.storeChannelData();
        const res = await admin.getStoredUserOverwrites(m.author.id);
        console.log(res);
      },
    );

    sub.raw(
      'clearsb', async (m) => {
        const now = Date.now();
        await starboard.clearData();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );

    sub.raw(
      'asclear', async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('antiSpam').clear();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'asget', async (m) => {
        const now = Date.now();
        const res1 = await antiSpam.pools.getAll();
        const res: any = await m.reply(`Done - ${res1.length} - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'getinfs', async (m) => {
        const now = Date.now();
        const infs = await infractions.infsPool.getAll();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
        console.log(infs);
      },
    );
    sub.raw(
      'clearinfs', async (m) => {
        await infractions.clearInfractions();
        const res: any = await m.reply('Done');
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'modules', async (m) => {
        const res: any = await m.reply(async () => {
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
          return `Modules enabled:\n\`${mods.join(', ')}\``;
        });
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'tracking', async (m) => {
        const now = Date.now();
        const res1 = await new pylon.KVNamespace('admin').items();
        const poolsL = await admin.adminPool.getAll();
        console.log(`(4) res length: ${res1.length}, pools length: ${poolsL.length}`);
        let txt = '';
        let c = 0;
        res1.map((item: any) => {
          c++;
          txt += `\n${c} => ${item.value.length}`;
        });
        const res: any = await m.reply(`Done - **${res1.length} key(s)** // **${poolsL.length} total items** - (Took ${Date.now() - now}ms)\n\n\`\`\`\n${txt}\n\`\`\``);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'ratelimit', async (m) => {
        const now = Date.now();
        const res1 = ratelimit.poolGlob;
        const res: any = await m.reply(`Done - **${res1.length} item(s)** - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'queue', async (m) => {
        const now = Date.now();
        const res1 = queue.queue;
        const res: any = await m.reply(`Done - **${res1.length} item(s)** - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'cleartracking', async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('admin').clear();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'join', async (m) => {
        const ch = await discord.getChannel('691752063134203974');
        if (!(ch instanceof discord.GuildVoiceChannel)) {
          return;
        }
        await ch.voiceConnect();
        const res: any = await m.reply('done');
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'perms', async (m) => {
        let permsVal = <any>'17179869186';
        permsVal = m.member.permissions;
        const p = new utils.Permissions(permsVal);
        const mp = p.serialize(false);
        for (const k in mp) {
          if (mp[k] === false) {
            delete mp[k];
          }
        }
        const res: any = await m.reply(
          `Test: \`${permsVal}n\`\n\`\`\`json\n${JSON.stringify(mp)}\n\`\`\``,
        );
        admin.saveMessage(res);
      },
    );
  });

  cmdGroup.on(
    'clearkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      await kve.clear();
      const res: any = await msg.reply('done');
      admin.saveMessage(res);
    },
  );

  cmdGroup.on(
    'listkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      const items = await kve.items();
      const res: any = await msg.reply(`\`\`\`json\n${JSON.stringify(items)}\n\`\`\``);
      admin.saveMessage(res);
    },
  );

  cmdGroup.on(
    'getemoji',
    (ctx) => ({ emj: ctx.string() }),
    async (msg, { emj }) => {
      const guild = await msg.getGuild();
      const emoji = await guild.getEmoji(emj);
      const res: any = await msg.reply(`\`\`\`\n${JSON.stringify(emoji)}\n\`\`\``);
      admin.saveMessage(res);
    },
  );
  return [cmdGroup, cmdGroupOverrides];
}
