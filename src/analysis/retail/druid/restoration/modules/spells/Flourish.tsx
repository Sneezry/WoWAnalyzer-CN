import { formatNumber } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink, Tooltip } from 'interface';
import { PassFailCheckmark } from 'interface/guide';
import InformationIcon from 'interface/icons/Information';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveHealing } from 'parser/core/EventCalculateLib';
import Events, { ApplyBuffEvent, EventType, HealEvent, RefreshBuffEvent } from 'parser/core/Events';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import HotTracker, { Attribution } from 'parser/shared/modules/HotTracker';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import CooldownExpandable, {
  CooldownExpandableItem,
} from 'interface/guide/components/CooldownExpandable';
import { FLOURISH_INCREASED_RATE } from 'analysis/retail/druid/restoration/constants';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';
import { isFromHardcast } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import ConvokeSpiritsResto from 'analysis/retail/druid/restoration/modules/spells/ConvokeSpiritsResto';
import { TALENTS_DRUID } from 'common/TALENTS';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { isConvoking } from 'analysis/retail/druid/shared/spells/ConvokeSpirits';

const HARDCAST_FLOURISH_EXTENSION = 8000;
const CONVOKE_FLOURISH_EXTENSION = 4000;
const FLOURISH_HEALING_INCREASE = 0.25;

/**
 * **繁茂**
 * 专精天赋 第八层
 *
 * 延长所有友方目标上的持续治疗效果（HoT）6秒，并在6秒内提升HoT的治疗速率25%。
 *
 * （由万灵之召触发的繁茂持续时间减半）
 */
class Flourish extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
    abilityTracker: AbilityTracker,
    convokeSpirits: ConvokeSpiritsResto,
  };

  hotTracker!: HotTrackerRestoDruid;
  abilityTracker!: AbilityTracker;
  convokeSpirits!: ConvokeSpiritsResto;

  extensionAttributions: Attribution[] = [];
  rateAttributions: MutableAmount[] = [];
  rampTrackers: FlourishTracker[] = [];
  lastCastTimestamp?: number;
  hardcastCount: number = 0;
  wgsExtended = 0; // 记录繁茂延长了多少次野性成长

  currentRateAttribution: MutableAmount = { amount: 0 };

  constructor(options: Options) {
    super(options);
    this.active =
      this.selectedCombatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT) ||
      this.selectedCombatant.hasTalent(TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT);

    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(FLOURISH_INCREASED_RATE),
      this.onIncreasedRateHeal,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(TALENTS_DRUID.FLOURISH_TALENT),
      this.onFlourishApplyBuff,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(TALENTS_DRUID.FLOURISH_TALENT),
      this.onFlourishApplyBuff,
    );
  }

  get totalExtensionHealing() {
    return this.extensionAttributions.reduce((acc, flourish) => acc + flourish.healing, 0);
  }

  get totalRateHealing() {
    return this.rateAttributions.reduce((acc, flourish) => acc + flourish.amount, 0);
  }

  get totalHealing() {
    return this.totalExtensionHealing + this.totalRateHealing;
  }

  get casts() {
    return this.hardcastCount;
  }

  get healingPerCast() {
    return this.casts === 0 ? 0 : this.totalHealing / this.casts;
  }

  onIncreasedRateHeal(event: HealEvent) {
    if (this.selectedCombatant.hasBuff(TALENTS_DRUID.FLOURISH_TALENT.id) && event.tick) {
      this.currentRateAttribution.amount += calculateEffectiveHealing(
        event,
        FLOURISH_HEALING_INCREASE,
      );
    }
  }

  onFlourishApplyBuff(event: ApplyBuffEvent | RefreshBuffEvent) {
    let extensionAttribution: Attribution;
    let extensionAmount = HARDCAST_FLOURISH_EXTENSION;
    if (!isFromHardcast(event) && isConvoking(this.selectedCombatant)) {
      extensionAttribution = this.convokeSpirits.currentConvokeAttribution;
      extensionAmount = CONVOKE_FLOURISH_EXTENSION;
      this.currentRateAttribution = this.convokeSpirits.currentConvokeRateAttribution;
    } else {
      this.hardcastCount += 1;
      extensionAttribution = HotTracker.getNewAttribution(`Flourish #${this.hardcastCount}`);
      this.currentRateAttribution = { amount: 0 };
      this.rateAttributions.push(this.currentRateAttribution);
      this.extensionAttributions.push(extensionAttribution);

      const rejuvsOnCast =
        this.hotTracker.getHotCount(SPELLS.REJUVENATION.id) +
        this.hotTracker.getHotCount(SPELLS.REJUVENATION_GERMINATION.id);
      const wgsOnCast = this.hotTracker.getHotCount(SPELLS.WILD_GROWTH.id);
      const clipped = event.type === EventType.RefreshBuff;
      this.rampTrackers.push({
        timestamp: event.timestamp,
        extensionAttribution,
        rateAttribution: this.currentRateAttribution,
        wgsOnCast,
        rejuvsOnCast,
        clipped,
      });
    }

    let foundWg = false;
    Object.keys(this.hotTracker.hots).forEach((playerIdString) => {
      const playerId = Number(playerIdString);
      Object.keys(this.hotTracker.hots[playerId]).forEach((spellIdString) => {
        const spellId = Number(spellIdString);
        this.hotTracker.addExtension(extensionAttribution, extensionAmount, playerId, spellId);
        if (spellId === SPELLS.WILD_GROWTH.id) {
          foundWg = true;
        }
      });
    });
    if (foundWg) {
      this.wgsExtended += 1;
    }
  }

  /** 指南部分，显示每次繁茂施放的详细信息 */
  get guideCastBreakdown() {
    const explanation = (
      <>
        <p>
          <strong>
            <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} />
          </strong>{' '}
          比你其他的冷却技能更需要事先铺垫，其效果几乎完全依赖施放时的HoTs数量。施放多次回春术，然后在准备施放繁茂前几秒施放野性成长。
        </p>
        {this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) && (
          <p>
            当与 <SpellLink spell={SPELLS.CONVOKE_SPIRITS} />{' '}
            配合使用时，万灵之召应始终优先施放。这是因为万灵之召会生成许多可延长的HoTs，而且它还可能触发繁茂，从而节省硬施法。
          </p>
        )}
      </>
    );

    const data = (
      <div>
        <strong>每次施放的详细信息</strong>
        <small> - 点击展开</small>
        {this.rampTrackers.map((cast, ix) => {
          const castTotalHealing = cast.extensionAttribution.healing + cast.rateAttribution.amount;

          const header = (
            <>
              @ {this.owner.formatTimestamp(cast.timestamp)} &mdash;{' '}
              <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} /> ({formatNumber(castTotalHealing)}{' '}
              治疗量)
            </>
          );

          const wgRamp = cast.wgsOnCast > 0;
          const rejuvRamp = cast.rejuvsOnCast > 0;
          const noFlourishClip = !cast.clipped;
          const overallPerf =
            wgRamp && rejuvRamp && noFlourishClip
              ? QualitativePerformance.Good
              : QualitativePerformance.Fail;

          const checklistItems: CooldownExpandableItem[] = [];
          checklistItems.push({
            label: (
              <>
                <SpellLink spell={SPELLS.WILD_GROWTH} /> 积累
              </>
            ),
            result: <PassFailCheckmark pass={wgRamp} />,
            details: <>({cast.wgsOnCast} 个HoTs激活)</>,
          });
          checklistItems.push({
            label: (
              <>
                <SpellLink spell={SPELLS.REJUVENATION} /> 积累
              </>
            ),
            result: <PassFailCheckmark pass={rejuvRamp} />,
            details: <>({cast.rejuvsOnCast} 个HoTs激活)</>,
          });
          this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) &&
            checklistItems.push({
              label: (
                <>
                  不要剪切已有的 <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} />{' '}
                  <Tooltip
                    hoverable
                    content={
                      <>
                        <SpellLink spell={SPELLS.CONVOKE_SPIRITS} /> 可以触发{' '}
                        <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} />
                        。万灵之召后，始终检查是否触发了繁茂。如果触发了，你需要等待一段时间再施放繁茂，避免覆盖增益并丢失大量持续时间。如果这里显示
                        <i className="glyphicon glyphicon-remove fail-mark" />
                        ，说明你覆盖了已有的繁茂。
                      </>
                    }
                  >
                    <span>
                      <InformationIcon />
                    </span>
                  </Tooltip>
                </>
              ),
              result: <PassFailCheckmark pass={noFlourishClip} />,
            });

          return (
            <CooldownExpandable
              header={header}
              checklistItems={checklistItems}
              perf={overallPerf}
              key={ix}
            />
          );
        })}
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    if (!this.selectedCombatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT)) {
      return; // 模块需要对万灵之召保持激活，但不应显示统计信息
    }
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(8)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            这是HoT延长和HoT速率提升所产生的治疗总和。由于治疗归属的计算限制，延长和提升速率的治疗值可能存在重复计算，因此实际的治疗量会比列出的稍低。
            <ul>
              <li>
                延长：{' '}
                <strong>{this.owner.formatItemHealingDone(this.totalExtensionHealing)}</strong>
              </li>
              <li>
                提升速率：{' '}
                <strong>{this.owner.formatItemHealingDone(this.totalRateHealing)}</strong>
              </li>
              <li>
                野性成长被延长次数：{' '}
                <strong>
                  {this.wgsExtended} / {this.hardcastCount}
                </strong>
              </li>
              <li>
                平均每次施放的治疗量： <strong>{formatNumber(this.healingPerCast)}</strong>
              </li>
            </ul>
            <br />
            对于表格中的数据，注意如果在战斗结束前施放繁茂，延长治疗的数值可能会比预期的低，因为延长治疗在HoT超过原始持续时间后才会计算。
          </>
        }
        dropdown={
          <>
            <table className="table table-condensed">
              <thead>
                <tr>
                  <th>施放</th>
                  <th>延长的HoTs</th>
                  <th>延长治疗</th>
                  <th>速率治疗</th>
                </tr>
              </thead>
              <tbody>
                {this.extensionAttributions.map((flourish, index) => (
                  <tr key={index}>
                    <th scope="row">{index + 1}</th>
                    <td>{flourish.procs}</td>
                    <td>{formatNumber(flourish.healing)}</td>
                    <td>{formatNumber(this.rateAttributions[index].amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.FLOURISH_TALENT}>
          <ItemPercentHealingDone approximate amount={this.totalHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

/** 追踪繁茂施放的信息 */
interface FlourishTracker {
  /** 施放时间戳 */
  timestamp: number;
  /** HoT延长造成的治疗归属对象 */
  extensionAttribution: Attribution;
  /** HoT速率提升造成的治疗归属对象 */
  rateAttribution: MutableAmount;
  /** 施放繁茂时的野性成长数量 */
  wgsOnCast: number;
  /** 施放繁茂时的回春术数量 */
  rejuvsOnCast: number;
  /** 如果剪切了已有的繁茂增益则为 true */
  clipped: boolean;
}

export type MutableAmount = {
  amount: number;
};

export default Flourish;
