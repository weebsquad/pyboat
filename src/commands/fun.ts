import * as utils from '../lib/utils';
import {
  Command,
  CommandArgument,
  CommandData,
  CommandArgumentUser,
  ResolvedCommandArgument,
  commands
} from '../lib/commands';

export function InitializeCommands() {
  let _c = [];

  let Count = new Command('count', 'Count numbers!', 0, '[Math]');
  Count.Execute = async function(m) {
    let arg1 = m.ResolvedArguments[0].Data as string;
    let addition = 1;
    let count = await pylon.kv.get('count');
    if (!count) {
      await pylon.kv.put('count', 0);
      count = 0;
    }
    count = parseFloat(count.toString());
    let showMathCalcs: any = false;
    if (
      arg1 &&
      arg1.indexOf(m.ConfigData.modules.commands.seperator) === -1 &&
      utils.isNormalInteger(arg1)
    ) {
      addition = parseInt(arg1);
    } else if (arg1) {
      let mathe = arg1;
      let res = utils.mathEval(mathe);
      if (typeof res == 'boolean' && res == false) {
        await m.Message.reply('Invalid math');
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
    await m.Message.reply(
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
    await pylon.kv.put('count', count);
  };
  Count.ConfigModuleAccess = ['modules.commands'];
  Count.Aliases = ['c'];
  let CountArg1 = new CommandArgument('Text', 1, false);
  Count.Arguments.push(CountArg1);
  _c.push(Count);

  return _c;
}
