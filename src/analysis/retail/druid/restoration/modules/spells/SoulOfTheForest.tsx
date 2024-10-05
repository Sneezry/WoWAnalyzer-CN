import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, {
  ApplyBuffEvent,
  CastEvent,
  EventType,
  HealEvent,
  RefreshBuffEvent,
  RemoveBuffEvent,
} from 'parser/core/Events';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import { isFromHardcast } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import {
  buffedBySotf,
  getSotfBuffs,
} from 'analysis/retail/druid/restoration/normalizers/SoulOfTheForestLinkNormalizer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { TALENTS_DRUID } from 'common/TALENTS';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../Guide';
import { isConvoking } from 'analysis/retail/druid/shared/spells/ConvokeSpirits';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';

const SOTF_SPELLS = [
  SPELLS.REJUVENATION,
  SPELLS.REJUVENATION_GERMINATION,
  SPELLS.WILD_GROWTH,
  SPELLS.REGROWTH,
];

const REJUVENATION_HEALING_INCREASE = 1.5;
const REGROWTH_HEALING_INCREASE = 1.5;
const WILD_GROWTH_HEALING_INCREASE = 0.5;

const debug = false;

/**
 * **森林之魂**
 * 专精天赋 第6层
 *
 * 迅捷治愈增加你下一个愈合或回春术的治疗效果150%，
 * 或下一个野性成长的治疗效果50%。
 */
class SoulOfTheForest extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
  };

  hotTracker!: HotTrackerRestoDruid;

  sotfRejuvInfo = {
    boost: REJUVENATION_HEALING_INCREASE,
    attribution: HotTrackerRestoDruid.getNewAttribution('森林之魂 回春术'),
    hardcastUses: 0,
    convokeUses: 0,
  };
  sotfRegrowthInfo = {
    boost: REGROWTH_HEALING_INCREASE,
    attribution: HotTrackerRestoDruid.getNewAttribution('森林之魂 愈合'),
    hardcastUses: 0,
    convokeUses: 0,
  };
  sotfWgInfo = {
    boost: WILD_GROWTH_HEALING_INCREASE,
    attribution: HotTrackerRestoDruid.getNewAttribution('森林之魂 野性成长'),
    hardcastUses: 0,
    convokeUses: 0,
  };
  sotfSpellInfo = {
    [SPELLS.REJUVENATION.id]: this.sotfRejuvInfo,
    [SPELLS.REJUVENATION_GERMINATION.id]: this.sotfRejuvInfo,
    [SPELLS.REGROWTH.id]: this.sotfRegrowthInfo,
    [SPELLS.WILD_GROWTH.id]: this.sotfWgInfo,
  };

  lastTalliedSotF?: RemoveBuffEvent;
  lastBuffFromHardcast: boolean = false;

  /** 检查森林之魂使用的条目 */
  useEntries: BoxRowEntry[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(
      TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT,
    );

    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.SOUL_OF_THE_FOREST_BUFF),
      this.onSotfRemove,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.SOUL_OF_THE_FOREST_BUFF),
      this.onSotfRemove,
    );
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SWIFTMEND),
      this.onSwiftmendCast,
    );

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SOTF_SPELLS),
      this.onSotfConsume,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SOTF_SPELLS),
      this.onSotfConsume,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.REGROWTH),
      this.onSotfConsume,
    );
  }

  onSwiftmendCast(event: CastEvent) {
    this.lastBuffFromHardcast = true;
  }

  /**
   * 更新追踪逻辑，判断事件是否受森林之魂增益影响
   */
  onSotfConsume(event: ApplyBuffEvent | RefreshBuffEvent | HealEvent) {
    // 检查是否有增益
    const sotf: RemoveBuffEvent | undefined = buffedBySotf(event);
    if (!sotf) {
      return;
    }

    // 检查来源
    const fromHardcast: boolean = isFromHardcast(event);
    const fromConvoke: boolean = !fromHardcast && isConvoking(this.selectedCombatant);

    // 记录治疗量
    const procInfo = this.sotfSpellInfo[event.ability.guid];
    if (!procInfo) {
      // 不应该出现的情况
      console.error('无法找到森林之魂事件的法术信息！', event);
      return;
    }

    if (!this.lastTalliedSotF || this.lastTalliedSotF.timestamp !== sotf.timestamp) {
      this.lastTalliedSotF = sotf;
      if (fromHardcast) {
        procInfo.hardcastUses += 1;
        debug &&
          console.log(
            '新的硬读条 ' +
              procInfo.attribution.name +
              ' @ ' +
              this.owner.formatTimestamp(event.timestamp, 1),
          );
      } else if (fromConvoke) {
        procInfo.convokeUses += 1;
        debug &&
          console.log(
            '新的灵魂鸣唱 ' +
              procInfo.attribution.name +
              ' @ ' +
              this.owner.formatTimestamp(event.timestamp, 1),
          );
      } else {
        console.warn(
          procInfo.attribution.name +
            ' @ ' +
            this.owner.formatTimestamp(event.timestamp, 1) +
            ' 不是来自硬读条或灵魂鸣唱？？',
        );
      }
    }

    if (event.type === EventType.Heal) {
      procInfo.attribution.healing += calculateEffectiveHealing(event, procInfo.boost);
    } else {
      this.hotTracker.addBoostFromApply(
        procInfo.attribution,
        procInfo.boost,
        event as ApplyBuffEvent,
      );
    }
  }

  onSotfRemove(event: RemoveBuffEvent | RefreshBuffEvent) {
    // 显示在此森林之魂使用工具提示中的文字
    let useText: React.ReactNode;
    let value: QualitativePerformance = QualitativePerformance.Fail;

    if (event.type === EventType.RefreshBuff) {
      if (this.lastBuffFromHardcast) {
        useText = '覆盖了';
        value = QualitativePerformance.Fail;
      }
      this.lastBuffFromHardcast = false;
    } else {
      const buffed = getSotfBuffs(event);
      if (buffed.length === 0) {
        useText = '过期了';
        value = QualitativePerformance.Fail;
      } else {
        if (!isFromHardcast(buffed[0]) && !this.lastBuffFromHardcast) {
          // 在灵魂鸣唱期间使用的迅捷治愈，也在灵魂鸣唱期间消耗——不计算
          return;
        }

        // 即使在灵魂鸣唱期间生成的，如果被硬读条消耗，也计算
        const firstGuid = buffed[0].ability.guid;
        if (
          firstGuid === SPELLS.REJUVENATION.id ||
          firstGuid === SPELLS.REJUVENATION_GERMINATION.id
        ) {
          useText = <SpellLink spell={SPELLS.REJUVENATION} />;
          value = QualitativePerformance.Ok;
        } else if (firstGuid === SPELLS.REGROWTH.id) {
          useText = <SpellLink spell={SPELLS.REGROWTH} />;
          value = QualitativePerformance.Ok;
        } else if (firstGuid === SPELLS.WILD_GROWTH.id) {
          useText = <SpellLink spell={SPELLS.WILD_GROWTH} />;
          value = QualitativePerformance.Good;
        } else {
          console.warn('森林之魂被消耗时，发现了未预期的法术ID：' + firstGuid);
        }
      }
      this.lastBuffFromHardcast = false;
    }

    // 如果需要，填充框条目
    if (useText !== undefined) {
      const tooltip = (
        <>
          @ <strong>{this.owner.formatTimestamp(event.timestamp)}</strong> -{' '}
          <strong>{useText}</strong>
        </>
      );
      this.useEntries.push({ value, tooltip });
    }
  }

  get rejuvHardcastUses() {
    return this.sotfRejuvInfo.hardcastUses;
  }

  get regrowthHardcastUses() {
    return this.sotfRegrowthInfo.hardcastUses;
  }

  get wgHardcastUses() {
    return this.sotfWgInfo.hardcastUses;
  }

  get rejuvConvokeUses() {
    return this.sotfRejuvInfo.convokeUses;
  }

  get regrowthConvokeUses() {
    return this.sotfRegrowthInfo.convokeUses;
  }

  get wgConvokeUses() {
    return this.sotfWgInfo.convokeUses;
  }

  get rejuvTotalUses() {
    return this.rejuvHardcastUses + this.rejuvConvokeUses;
  }

  get regrowthTotalUses() {
    return this.regrowthHardcastUses + this.regrowthConvokeUses;
  }

  get wgTotalUses() {
    return this.wgHardcastUses + this.wgConvokeUses;
  }

  get totalUses() {
    return this.rejuvTotalUses + this.regrowthTotalUses + this.wgTotalUses;
  }

  get totalHealing() {
    return (
      this.sotfWgInfo.attribution.healing +
      this.sotfRegrowthInfo.attribution.healing +
      this.sotfRejuvInfo.attribution.healing
    );
  }

  /** 指导森林之魂正确使用的子部分 */
  get guideSubsection(): JSX.Element {
    const explanation = (
      <p>
        <strong>
          <SpellLink spell={TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT} />
        </strong>{' '}
        触发时，使用
        <SpellLink spell={SPELLS.WILD_GROWTH} />
        的收益最高，但 <SpellLink spell={SPELLS.REJUVENATION} />或
        <SpellLink spell={SPELLS.REGROWTH} />
        在某个目标需要大量治疗时也可以接受。{' '}
        {this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) && (
          <>
            <SpellLink spell={SPELLS.CONVOKE_SPIRITS} />
            会覆盖触发效果——在施放灵魂鸣唱之前，请务必使用触发效果。不要让触发效果过期。
          </>
        )}
      </p>
    );

    const data = (
      <div>
        <CastSummaryAndBreakdown
          spell={TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT}
          castEntries={this.useEntries}
          usesInsteadOfCasts
          goodExtraExplanation={<>用于野性成长</>}
          okExtraExplanation={<>用于回春术或愈合</>}
          badExtraExplanation={<>触发效果过期或被覆盖</>}
        />
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  _spellReportLine(totalUses: number, hardcastUses: number, healing: number): React.ReactNode {
    return this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) ? (
      <>
        {' '}
        消耗了 <strong>{hardcastUses}</strong> 次硬读条 /{' '}
        <strong>{totalUses - hardcastUses}</strong> 次灵魂鸣唱：{' '}
        <strong>{formatPercentage(this.owner.getPercentageOfTotalHealingDone(healing), 1)}%</strong>{' '}
        的治疗量
      </>
    ) : (
      <>
        {' '}
        消耗了 <strong>{totalUses}</strong> 次触发效果：{' '}
        <strong>{formatPercentage(this.owner.getPercentageOfTotalHealingDone(healing), 1)}%</strong>{' '}
        的治疗量
      </>
    );
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(6)} // 基于天赋层数的数字
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            你使用了<strong>{this.totalUses}</strong>次森林之魂触发效果。
            <ul>
              <li>
                <SpellLink spell={SPELLS.REJUVENATION} />
                {this._spellReportLine(
                  this.rejuvTotalUses,
                  this.rejuvHardcastUses,
                  this.sotfRejuvInfo.attribution.healing,
                )}
              </li>
              <li>
                <SpellLink spell={SPELLS.REGROWTH} />
                {this._spellReportLine(
                  this.regrowthTotalUses,
                  this.regrowthHardcastUses,
                  this.sotfRegrowthInfo.attribution.healing,
                )}
              </li>
              <li>
                <SpellLink spell={SPELLS.WILD_GROWTH} />
                {this._spellReportLine(
                  this.wgTotalUses,
                  this.wgHardcastUses,
                  this.sotfWgInfo.attribution.healing,
                )}
              </li>
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT}>
          <ItemPercentHealingDone amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default SoulOfTheForest;
