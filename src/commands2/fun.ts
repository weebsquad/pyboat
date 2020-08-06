import { config } from '../config';
import * as utils from '../lib/utils';
import * as commands2 from '../lib/commands2';

const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_fun');

export const _groupOptions = {
  additionalPrefixes: [],
  description: 'Fun commands',
  filters: []
};

const optsGroup = commands2.getOpts(
  _groupOptions
) as discord.command.ICommandGroupOptions;
export const cmdGroup = new discord.command.CommandGroup(optsGroup);

export const count = discord.command.handler(
  (ctx) => ({ countArg: ctx.stringOptional() }),
  async (msg, { countArg }) => {
    let arg1 = countArg;
    let addition = 1;
    let count = await kv.get('count');
    if (!count) {
      await kv.put('count', 0);
      count = 0;
    }
    count = parseFloat(count.toString());
    let showMathCalcs: any = false;
    if (arg1 && arg1.indexOf(' ') === -1 && utils.isNormalInteger(arg1)) {
      addition = parseInt(arg1);
    } else if (arg1) {
      let mathe = arg1;
      let res = utils.mathEval(mathe);
      if (typeof res == 'boolean' && res == false) {
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
      _desccalcs +
        '__Count__: **' +
        count +
        '** ' +
        symbolad +
        ' **' +
        Math.abs(addition) +
        '** = **' +
        (count + addition) +
        '**'
    );
    count += addition;
    await kv.put('count', count);
  }
);

export const yoda = discord.command.handler(
  (args) => ({ text: args.text() }),
  async (message, { text }) => {
    const opts = {
      allowedMentions: {},
      content: ''
    };
    const apiResult = await fetch(
      'https://api.funtranslations.com/translate/yoda.json?text=' + text
    );
    const result = await apiResult.json();
    if (result.success) {
      opts.content = result.contents.translated;
      await message.reply(opts);
    }
    if (result.error)
      await message.reply(
        `Error ${result.error.code}: ${result.error.message}`
      );
  }
);
