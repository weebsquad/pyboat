import { config } from '../config';
import * as utils from '../lib/utils';
import * as commands2 from '../lib/commands2';

const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_fun');
export function InitializeCommands() {
  const _groupOptions = {
    additionalPrefixes: [],
    description: 'Fun commands',
  };

  const optsGroup = commands2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);

  cmdGroup.on('count',
              (ctx) => ({ countArg: ctx.stringOptional() }),
              async (msg, { countArg }) => {
                const arg1 = countArg;
                let addition = 1;
                let countm = await kv.get('count');
                if (!countm) {
                  await kv.put('count', 0);
                  countm = 0;
                }
                countm = parseFloat(countm.toString());
                let showMathCalcs: any = false;
                if (arg1 && arg1.indexOf(' ') === -1 && utils.isNormalInteger(arg1)) {
                  addition = parseInt(arg1, 10);
                } else if (arg1) {
                  const mathe = arg1;
                  const res = utils.mathEval(mathe);
                  if (typeof res === 'boolean' && res === false) {
                    await msg.reply('Invalid math');
                    return;
                  }
                  addition = res;
                  showMathCalcs = mathe;
                }
                let symbolad = '+';

                if (addition < 0) {
                  symbolad = '-';
                }
                let _desccalcs = '';
                if (showMathCalcs !== false) {
                  _desccalcs = `__Input Math__: **${showMathCalcs}** = **${addition}**\n`;
                }
                await msg.reply(
                  `${_desccalcs
                  }__Count__: **${
                    countm
                  }** ${
                    symbolad
                  } **${
                    Math.abs(addition)
                  }** = **${
                    countm + addition
                  }**`,
                );
                countm += addition;
                await kv.put('count', countm);
              });

  cmdGroup.on('yoda',
              (args) => ({ text: args.text() }),
              async (message, { text }) => {
                const opts = {
                  allowedMentions: {},
                  content: '',
                };
                const apiResult = await fetch(
                  `https://api.funtranslations.com/translate/yoda.json?text=${text}`,
                );
                const result = await apiResult.json();
                if (result.success) {
                  opts.content = result.contents.translated;
                  await message.reply(opts);
                }
                if (result.error) {
                  await message.reply(
                    `Error ${result.error.code}: ${result.error.message}`,
                  );
                }
              });
  return cmdGroup;
}
