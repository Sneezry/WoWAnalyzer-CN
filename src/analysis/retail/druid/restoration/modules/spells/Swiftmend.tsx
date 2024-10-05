import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, HealEvent } from 'parser/core/Events';
import Combatants from 'parser/shared/modules/Combatants';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

import {
  getDirectHeal,
  isFromHardcast,
} from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { getRemovedHot } from 'analysis/retail/druid/restoration/normalizers/SwiftmendNormalizer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { TALENTS_DRUID } from 'common/TALENTS';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../Guide';
import { calculateHealTargetHealthPercent } from 'parser/core/EventCalculateLib';
import { formatPercentage } from 'common/format';
import { abilityToSpell } from 'common/abilityToSpell';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import CastEfficiencyPanel from 'interface/guide/components/CastEfficiencyPanel';

const TRIAGE_THRESHOLD = 0.5;
const HIGH_VALUE_HOTS = [
  SPELLS.REJUVENATION.id,
  SPELLS.REJUVENATION_GERMINATION.id,
  SPELLS.WILD_GROWTH.id,
  SPELLS.LIFEBLOOM_HOT_HEAL,
  SPELLS.LIFEBLOOM_UNDERGROWTH_HOT_HEAL,
];
const VERY_HIGH_VALUE_HOT = SPELLS.CENARION_WARD_HEAL.id;

/**
 * 追踪与迅捷治愈相关的施法
 */
class Swiftmend extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
    combatants: Combatants,
  };

  hotTracker!: HotTrackerRestoDruid;
  combatants!: Combatants;

  /** 仅硬施法治疗，用于计算没有激活的高效施法 */
  hardcastSwiftmendHealing: number = 0;
  /** 玩家是否拥有绿野绽放，影响HoT是否延长或移除 */
  hasVi: boolean;
  /** 玩家是否拥有森林之魂，以跟踪施法的理由 */
  hasSotf: boolean;
  /** 玩家是否拥有再生，以跟踪施法的理由 */
  hasReforestation: boolean;
  /** 玩家通过迅捷治愈获得的触发效果数量 (包括VI, SotF 和 Reforestation) */
  numProcs: number;
  /** 记录每次迅捷治愈施法的盒条目 */
  castEntries: BoxRowEntry[] = [];

  constructor(options: Options) {
    super(options);

    this.hasVi = this.selectedCombatant.hasTalent(TALENTS_DRUID.VERDANT_INFUSION_TALENT);
    this.hasSotf = this.selectedCombatant.hasTalent(
      TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT,
    );
    this.hasReforestation = this.selectedCombatant.hasTalent(TALENTS_DRUID.REFORESTATION_TALENT);
    this.numProcs = (this.hasVi ? 1 : 0) + (this.hasSotf ? 1 : 0) + (this.hasReforestation ? 1 : 0);

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SWIFTMEND),
      this.onSwiftmendCast,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.SWIFTMEND),
      this.onSwiftmendHeal,
    );
  }

  onSwiftmendHeal(event: HealEvent) {
    if (isFromHardcast(event)) {
      this.hardcastSwiftmendHealing += event.amount + (event.absorbed || 0);
    }
  }

  onSwiftmendCast(event: CastEvent) {
    const directHeal = getDirectHeal(event);
    const targetHealthPercent = directHeal
      ? calculateHealTargetHealthPercent(directHeal, true)
      : undefined;
    const target = this.combatants.getEntity(event);
    if (!target) {
      console.warn('找不到迅捷治愈施法的目标', event);
      return; // 没有目标无法继续处理
    }
    const wasTriage = targetHealthPercent && targetHealthPercent <= TRIAGE_THRESHOLD;
    const targetHealthPercentText = targetHealthPercent
      ? formatPercentage(targetHealthPercent, 0)
      : '未知';

    /*
     * 根据玩家是否拥有绿野绽放生成价值和提示文本
     */

    let hotChangeText: React.ReactNode = '';
    let value: QualitativePerformance;
    if (this.hasVi) {
      const extendedHotIds: number[] = [];
      if (this.hotTracker.hots[target.id]) {
        Object.values(this.hotTracker.hots[target.id]).forEach((tracker) =>
          extendedHotIds.push(tracker.spellId),
        );
      }
      const extendedHighValue =
        extendedHotIds.includes(VERY_HIGH_VALUE_HOT) ||
        extendedHotIds.filter((id) => HIGH_VALUE_HOTS.includes(id)).length >= 2;
      if (extendedHighValue) {
        value = QualitativePerformance.Perfect;
      } else if (wasTriage) {
        value = QualitativePerformance.Good;
      } else {
        value = QualitativePerformance.Ok;
      }

      if (extendedHotIds.length === 0) {
        hotChangeText = '延长了无HoT效果！';
      } else {
        hotChangeText = (
          <>
            延长了{' '}
            <strong>
              {extendedHotIds.map((id, index) => (
                <>
                  <SpellLink key={id} spell={id} />{' '}
                </>
              ))}
            </strong>
          </>
        );
      }
    } else {
      const removedHotHeal = getRemovedHot(event);

      const removedHighValue =
        HIGH_VALUE_HOTS.find((id) => id === removedHotHeal?.ability.guid) !== undefined;
      if (wasTriage || !removedHighValue) {
        value = QualitativePerformance.Good;
      } else if (this.numProcs > 0) {
        value = QualitativePerformance.Ok;
      } else {
        value = QualitativePerformance.Fail;
      }

      hotChangeText = (
        <>
          移除了{' '}
          <strong>
            {removedHotHeal ? (
              <SpellLink spell={abilityToSpell(removedHotHeal.ability)} />
            ) : (
              '未知的HoT'
            )}
          </strong>
        </>
      );
    }

    const tooltip = (
      <>
        时间 <strong>{this.owner.formatTimestamp(event.timestamp)}</strong>
        <br />
        目标 <strong>{target.name}</strong> 血量 <strong>{targetHealthPercentText}%</strong> <br />
        {hotChangeText}
      </>
    );

    this.castEntries.push({ value, tooltip });
  }

  /** 介绍迅捷治愈的正确使用方式 */
  get guideSubsection(): JSX.Element {
    const explanation = (
      <>
        <p>
          <b>
            <SpellLink spell={SPELLS.SWIFTMEND} />
          </b>{' '}
          是我们的紧急治疗技能，但会移除目标身上的一个HoT效果，影响整体治疗量。
          {this.numProcs === 0 && `仅对需要紧急治疗的目标使用。`}
        </p>
        <p>
          {this.numProcs === 1 && `不过，你的迅捷治愈还会触发一个效果：`}
          {this.numProcs > 1 && `不过，你的迅捷治愈还会触发多个效果：`}
          {this.hasSotf && (
            <>
              <SpellLink spell={TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT} />
              &nbsp;
            </>
          )}
          {this.hasVi && (
            <>
              <SpellLink spell={TALENTS_DRUID.VERDANT_INFUSION_TALENT} />
              &nbsp;
            </>
          )}
          {this.hasReforestation && (
            <>
              <SpellLink spell={TALENTS_DRUID.REFORESTATION_TALENT} />
              &nbsp;
            </>
          )}
          {this.numProcs > 0 && (
            <>
              {this.numProcs === 1 ? ` - 这个效果非常强大。` : ` - 这些效果都非常强大。`}{' '}
              请频繁使用迅捷治愈以触发效果 - 即使目标并不需要治疗。
            </>
          )}
        </p>
      </>
    );

    // 构建说明不同颜色分类的描述，基于不同的天赋
    let perfectExtraExplanation = undefined;
    let okExtraExplanation = undefined;
    let badExtraExplanation = undefined;
    if (this.hasVi) {
      // 拥有VI
      perfectExtraExplanation = `延长了高价值的HoT`;
    }
    if (this.numProcs > 0) {
      // 拥有触发效果
      okExtraExplanation = `非紧急情况（血量>50%），但仍然可以接受用来触发效果`;
    } else {
      // 没有触发效果
      badExtraExplanation = `非紧急情况（血量>50%），并且移除了野性成长或回春术的HoT`;
    }

    const data = (
      <div>
        <CastSummaryAndBreakdown
          spell={SPELLS.SWIFTMEND}
          castEntries={this.castEntries}
          perfectExtraExplanation={perfectExtraExplanation}
          okExtraExplanation={okExtraExplanation}
          badExtraExplanation={badExtraExplanation}
        />
        {this.numProcs > 0 && <CastEfficiencyPanel spell={SPELLS.SWIFTMEND} useThresholds />}
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }
}

export default Swiftmend;
