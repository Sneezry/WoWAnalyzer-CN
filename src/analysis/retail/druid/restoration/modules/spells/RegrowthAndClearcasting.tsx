import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellIcon, SpellLink } from 'interface';
import CheckmarkIcon from 'interface/icons/Checkmark';
import CrossIcon from 'interface/icons/Cross';
import HealthIcon from 'interface/icons/Health';
import UptimeIcon from 'interface/icons/Uptime';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent } from 'parser/core/Events';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_DRUID } from 'common/TALENTS';
import { getDirectHeal } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { buffedByClearcast } from 'analysis/retail/druid/restoration/normalizers/ClearcastingNormalizer';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../Guide';
import { calculateHealTargetHealthPercent } from 'parser/core/EventCalculateLib';
import { ABUNDANCE_MANA_REDUCTION } from 'analysis/retail/druid/restoration/modules/spells/Abundance';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';

/** 低于此血量百分比时我们认为需要‘紧急治疗’ */
const TRIAGE_THRESHOLD = 0.5;
/** 施法事件与治疗事件之间的最大时间（毫秒）来认为它们是关联的 */
const MS_BUFFER = 100;
/** 考虑愈合术高效所需的最低充裕效果层数 */
const ABUNDANCE_EXCEPTION_STACKS = 4;

/**
 * 追踪与愈合术及节能施法相关的统计数据
 */
class RegrowthAndClearcasting extends Analyzer {
  /** 总节能施法次数 */
  totalClearcasts = 0;
  /** 被覆盖的节能施法次数 */
  overwrittenClearcasts = 0;
  /** 如果战斗结束时有活跃的节能施法，设为1 */
  endingClearcasts = 0;

  /** 总愈合术硬读条次数 */
  totalRegrowths = 0;
  /** 因激活免费施放的愈合术次数 */
  innervateRegrowths = 0;
  /** 因自然迅捷免费施放的愈合术次数 */
  nsRegrowths = 0;
  /** 因节能施法免费施放的愈合术次数 */
  ccRegrowths = 0;
  /** 因充裕效果降低消耗使得愈合术足够高效的次数 */
  abundanceRegrowths = 0;
  /** 在低血量目标上以全消耗施放的愈合术次数 */
  triageRegrowths = 0;
  /** 在高血量目标上以全消耗施放的愈合术次数 */
  badRegrowths = 0;

  /** 每次愈合术施放的条目 */
  castEntries: BoxRowEntry[] = [];

  hasAbundance: boolean;
  hasTranquilMind: boolean;

  constructor(options: Options) {
    super(options);

    this.hasAbundance = this.selectedCombatant.hasTalent(TALENTS_DRUID.ABUNDANCE_TALENT);
    this.hasTranquilMind = this.selectedCombatant.hasTalent(TALENTS_DRUID.TRANQUIL_MIND_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.CLEARCASTING_BUFF),
      this.onApplyClearcast,
    );
    this.addEventListener(
      Events.applybuffstack.by(SELECTED_PLAYER).spell(SPELLS.CLEARCASTING_BUFF),
      this.onApplyClearcast,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.CLEARCASTING_BUFF),
      this.onRefreshClearcast,
    );

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.REGROWTH),
      this.onCastRegrowth,
    );
    this.addEventListener(Events.fightend, this.onFightEnd);
  }

  onApplyClearcast() {
    this.totalClearcasts += 1;
  }

  onRefreshClearcast() {
    if (
      this.hasTranquilMind &&
      this.selectedCombatant.getBuffStacks(SPELLS.CLEARCASTING_BUFF.id) === 1
    ) {
      // 若玩家有心境宁静天赋，刷新buff时是因为玩家在2层时使用了节能施法——
      // 我们不想将此算作被覆盖或获得的节能施法。
      // 刷新发生在第二层消失后，因此我们可以通过层数来判断。
      return;
    }

    this.totalClearcasts += 1;
    this.overwrittenClearcasts += 1;
  }

  onCastRegrowth(event: CastEvent) {
    this.totalRegrowths += 1;

    let targetHealthPercent = undefined;
    const regrowthHeal = getDirectHeal(event);
    if (regrowthHeal) {
      targetHealthPercent = calculateHealTargetHealthPercent(regrowthHeal, true);
    }

    let castNote = '';
    let wasGood = true;
    if (this.selectedCombatant.hasBuff(SPELLS.INNERVATE.id)) {
      this.innervateRegrowths += 1;
      castNote = '因激活免费施放';
    } else if (
      this.selectedCombatant.hasBuff(SPELLS.NATURES_SWIFTNESS.id, event.timestamp, MS_BUFFER)
    ) {
      this.nsRegrowths += 1;
      castNote = '因自然迅捷免费施放';
    } else if (buffedByClearcast(event)) {
      this.ccRegrowths += 1;
      castNote = '因节能施法免费施放';
    } else if (
      this.selectedCombatant.getBuffStacks(SPELLS.ABUNDANCE_BUFF.id) >= ABUNDANCE_EXCEPTION_STACKS
    ) {
      this.abundanceRegrowths += 1;
      const abundanceStacks = this.selectedCombatant.getBuffStacks(SPELLS.ABUNDANCE_BUFF.id);
      castNote =
        ABUNDANCE_MANA_REDUCTION * abundanceStacks >= 1
          ? `因${abundanceStacks}层充裕效果免费施放`
          : `因${abundanceStacks}层充裕效果降低消耗`;
    } else {
      // 使用治疗效果判断愈合术是否是紧急治疗（挽救低血量玩家）
      if (targetHealthPercent !== undefined && targetHealthPercent < TRIAGE_THRESHOLD) {
        this.triageRegrowths += 1;
        castNote = '对低血量目标以全消耗施放';
      } else {
        this.badRegrowths += 1;
        wasGood = false;
        castNote = '对高血量目标以全消耗施放';
      }
    }

    const targetHealthString =
      targetHealthPercent !== undefined ? `${formatPercentage(targetHealthPercent, 0)}` : '未知';
    this.castEntries.push({
      value: wasGood ? QualitativePerformance.Good : QualitativePerformance.Fail,
      tooltip: (
        <>
          @ <strong>{this.owner.formatTimestamp(event.timestamp)}</strong> - {castNote}
          <br />
          目标 <strong>{this.owner.getTargetName(event)}</strong> 血量为{' '}
          <strong>{targetHealthString}%</strong>
        </>
      ),
    });
  }

  onFightEnd() {
    if (this.selectedCombatant.hasBuff(SPELLS.CLEARCASTING_BUFF.id)) {
      this.endingClearcasts = 1;
    }
  }

  get usedClearcasts() {
    return this.ccRegrowths;
  }

  get expiredClearcasts() {
    return (
      this.totalClearcasts -
      this.overwrittenClearcasts -
      this.usedClearcasts -
      this.endingClearcasts
    );
  }

  get wastedClearcasts() {
    return this.totalClearcasts - this.usedClearcasts;
  }

  /** 使用的节能施法占获得节能施法的百分比 */
  get clearcastUtilPercent() {
    // 当没有节能施法时返回100%以避免建议
    // 战斗结束时仍然活跃的节能施法不应计入使用率，因此从总数中减去
    return this.totalClearcasts === 0
      ? 1
      : this.usedClearcasts / (this.totalClearcasts - this.endingClearcasts);
  }

  get freeRegrowths() {
    return this.innervateRegrowths + this.ccRegrowths + this.nsRegrowths;
  }

  /** 指导小节描述愈合术的正确使用 */
  get guideSubsection(): JSX.Element {
    const hasAbundance = this.selectedCombatant.hasTalent(TALENTS_DRUID.ABUNDANCE_TALENT);
    const explanation = (
      <p>
        <b>
          <SpellLink spell={SPELLS.REGROWTH} />
        </b>{' '}
        用于单点治疗。愈合术的HoT部分非常弱——愈合术只有在其直接治疗部分有效时才是高效的。
        例外情况是当愈合术因为 <SpellLink spell={SPELLS.CLEARCASTING_BUFF} /> /{' '}
        <SpellLink spell={SPELLS.NATURES_SWIFTNESS} />{' '}
        {hasAbundance && (
          <>
            或因 <SpellLink spell={TALENTS_DRUID.ABUNDANCE_TALENT} /> 降低法力消耗时
          </>
        )}
        免费施放。
      </p>
    );

    const data = (
      <div>
        <div>
          <CastSummaryAndBreakdown
            spell={SPELLS.REGROWTH}
            castEntries={this.castEntries}
            badExtraExplanation={<>在满法力消耗的情况下对高血量目标施放</>}
          />
        </div>
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.CORE(20)} // 为了固定的一般统计顺序
        tooltip={
          <>
            <SpellLink spell={SPELLS.REGROWTH} /> 相对于 <SpellLink spell={SPELLS.REJUVENATION} />{' '}
            来说法力效率较低， 只有在由于 <SpellLink spell={SPELLS.INNERVATE} />、
            <SpellLink spell={SPELLS.NATURES_SWIFTNESS} /> 或{' '}
            <SpellLink spell={SPELLS.CLEARCASTING_BUFF} />{' '}
            {this.hasAbundance && <>或因充裕效果堆叠超过{ABUNDANCE_EXCEPTION_STACKS}层时</>}{' '}
            免费施放时，或者为了挽救低血量目标时才应该施放。
            <br />
            <br />
            <strong>
              你硬读条施放了 {this.totalRegrowths} 次 <SpellLink spell={SPELLS.REGROWTH} />
            </strong>
            <ul>
              <li>
                <SpellIcon spell={SPELLS.INNERVATE} />{' '}
                <SpellIcon spell={SPELLS.CLEARCASTING_BUFF} />{' '}
                <SpellIcon spell={SPELLS.NATURES_SWIFTNESS} /> 免费施放次数:{' '}
                <strong>{this.freeRegrowths}</strong>
              </li>
              {this.hasAbundance && (
                <li>
                  <SpellIcon spell={SPELLS.ABUNDANCE_BUFF} /> 降低消耗施放次数:{' '}
                  <strong>{this.abundanceRegrowths}</strong>
                </li>
              )}
              <li>
                <HealthIcon /> 全消耗紧急治疗（血量小于 {formatPercentage(TRIAGE_THRESHOLD, 0)}
                %）次数: <strong>{this.triageRegrowths}</strong>
              </li>
              <li>
                <CrossIcon /> 不佳施放次数: <strong>{this.badRegrowths}</strong>
              </li>
            </ul>
            <br />
            <strong>
              你获得了 {this.totalClearcasts} 次 <SpellLink spell={SPELLS.CLEARCASTING_BUFF} />
            </strong>
            <ul>
              <li>
                <SpellIcon spell={SPELLS.REGROWTH} /> 使用次数:{' '}
                <strong>{this.usedClearcasts}</strong>
              </li>
              <li>
                <CrossIcon /> 被覆盖次数: <strong>{this.overwrittenClearcasts}</strong>
              </li>
              <li>
                <UptimeIcon /> 过期次数: <strong>{this.expiredClearcasts}</strong>
              </li>
              {this.endingClearcasts > 0 && (
                <li>
                  战斗结束时仍然活跃: <strong>{this.endingClearcasts}</strong>
                </li>
              )}
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={SPELLS.REGROWTH}>
          <>
            {this.badRegrowths === 0 ? <CheckmarkIcon /> : <CrossIcon />}
            {'  '}
            {this.badRegrowths} <small>不佳施放</small>
            <br />
            <SpellIcon spell={SPELLS.CLEARCASTING_BUFF} />
            {'  '}
            {formatPercentage(this.clearcastUtilPercent, 1)}% <small>利用率</small>
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default RegrowthAndClearcasting;
