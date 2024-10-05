import { Sref } from 'CONTRIBUTORS';
import GameBranch from 'game/GameBranch';
import SPECS from 'game/SPECS';
import Config, { SupportLevel } from 'parser/Config';

import CHANGELOG from './CHANGELOG';

const config: Config = {
  // 最近对该专精做出贡献的人员。贡献者不一定要是长期维护者。如果有人对该专精的某个部分做出了重要贡献或最近有相关贡献，他们可以被加入贡献者名单。如果某人长期失联，可能会在重大更改或新资料片期间被移除。
  contributors: [Sref],
  branch: GameBranch.Retail,
  // 此专精最后更新时的魔兽世界客户端补丁版本。
  patchCompatibility: '11.0.2',
  supportLevel: SupportLevel.MaintainedFull,
  // 在这里解释该专精分析的状态。尽量说明它的完整性，并提供用户可以学习更多信息的链接。如果该专精的分析不够完整，请在 `<Warning>` 组件中提及。
  description: (
    <>
      <p>欢迎使用恢复德鲁伊分析器！希望您觉得本指南和统计信息有用。</p>
      <p>
        如果您有任何关于此分析器的疑问、评论或建议，您可以通过{' '}
        <a href="https://github.com/WoWAnalyzer/WoWAnalyzer/issues/new">GitHub</a>，在{' '}
        <a href="https://discord.gg/AxphPxU">Discord</a> 上联系 WoWAnalyzer 团队，或者直接通过
        Discord 给我发消息（<a href="/contributor/Sref">Sref</a>
        ）。我们始终乐于改进分析器，无论是深入的理论研究还是重写一些文本以更易理解。本项目是开源的，欢迎贡献，您也可以直接改进它！
      </p>
      <p>
        如果您有游戏玩法问题，请查看：
        <ul>
          <li>
            Wowhead上的<a href="https://www.wowhead.com/restoration-druid-guide">恢复德鲁伊指南</a>
          </li>
          <li>
            Dreamgrove.gg上的
            <a href="https://www.dreamgrove.gg/blog/resto/compendium">恢复德鲁伊百科</a>
          </li>
          <li>
            <a href="https://discord.gg/dreamgrove" target="_blank" rel="noopener noreferrer">
              Dreamgrove
            </a>{' '}
            - 德鲁伊社区的 Discord
          </li>
        </ul>
      </p>
    </>
  ),
  // 最近的一个示例报告，用于展示该专精的有趣部分。将在主页上显示。
  exampleReport: '/report/dfv4tpJAyVakGFK9/6-Mythic+Smolderon+-+Kill+(3:53)/Nikosux/standard',

  // 以下内容请勿更改；
  // 当前专精的标识符。这是代码中唯一指定此解析器属于哪个专精的地方。
  spec: SPECS.RESTORATION_DRUID,
  // 更新日志的内容。
  changelog: CHANGELOG,
  // 当前专精的 CombatLogParser 类。
  parser: () =>
    import('./CombatLogParser' /* webpackChunkName: "RestorationDruid" */).then(
      (exports) => exports.default,
    ),
  // 当前目录的路径（相对于项目根目录）。用于直接生成指向 GitHub 上该专精代码的链接。
  path: import.meta.url,
};

export default config;
