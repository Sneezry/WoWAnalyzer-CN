import Analyzer, { Options, SELECTED_PLAYER, SELECTED_PLAYER_PET } from 'parser/core/Analyzer';
import { TALENTS_DRUID } from 'common/TALENTS';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';
import { SpellLink } from 'interface';
import CastEfficiencyPanel from 'interface/guide/components/CastEfficiencyPanel';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import SPELLS from 'common/SPELLS';
import Events, { HealEvent, SummonEvent } from 'parser/core/Events';
import { isFromHardcast } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';

const deps = {
  abilityTracker: AbilityTracker,
};

/**
 * **林地守护者**
 * 专精天赋 第六层
 *
 * 召唤一个树人，立即对当前目标施放迅捷治愈，治疗X点生命值。
 * 树人将周期性地对该目标或附近的盟友施放愈合，治疗X点生命值，持续15秒。
 *
 * **野性合成**
 * 专精天赋 第七层
 *
 * 由林地守护者召唤的树人将立即施放野性成长，治疗40码内的5个盟友，持续7秒。
 */
export default class GroveGuardians extends Analyzer.withDependencies(deps) {
  hasWildSynthesis: boolean;
  hasTolCenariusGuidance: boolean;

  /** 由手动施放的林地守护者（树人）施放的迅捷治愈总治疗量 */
  hardcastSwiftmendHealing: number = 0;
  /** 由手动施放的林地守护者（树人）施放的愈合总治疗量 */
  hardcastNourishHealing: number = 0;
  /** 由手动施放的林地守护者（树人）施放的野性成长总治疗量 */
  hardcastWildGrowthHealing: number = 0;
  /** 由塞纳里奥指引召唤的树人造成的所有治疗量 */
  cgHealing: number = 0;

  /** 记录手动施放的树人实例编号。如果不在集合中，则推测是由塞纳里奥指引召唤的。 */
  hardcastInstances: Set<number> = new Set<number>();

  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.GROVE_GUARDIANS_TALENT);
    this.hasWildSynthesis = this.selectedCombatant.hasTalent(TALENTS_DRUID.WILD_SYNTHESIS_TALENT);
    this.hasTolCenariusGuidance =
      this.selectedCombatant.hasTalent(TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT) &&
      this.selectedCombatant.hasTalent(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT);

    this.addEventListener(
      Events.heal
        .by(SELECTED_PLAYER_PET)
        .spell([
          SPELLS.GROVE_GUARDIANS_SWIFTMEND,
          SPELLS.GROVE_GUARDIANS_NOURISH,
          SPELLS.GROVE_GUARDIANS_WILD_GROWTH,
        ]),
      this.onGGHeal,
    );
    this.addEventListener(
      Events.summon.by(SELECTED_PLAYER).spell(TALENTS_DRUID.GROVE_GUARDIANS_TALENT),
      this.onGGSummon,
    );
  }

  onGGHeal(event: HealEvent) {
    const healAmount = event.amount + (event.absorbed || 0);
    if (event.sourceInstance && !this.hardcastInstances.has(event.sourceInstance)) {
      this.cgHealing += healAmount;
    } else if (event.ability.guid === SPELLS.GROVE_GUARDIANS_SWIFTMEND.id) {
      this.hardcastSwiftmendHealing += healAmount;
    } else if (event.ability.guid === SPELLS.GROVE_GUARDIANS_NOURISH.id) {
      this.hardcastNourishHealing += healAmount;
    } else if (event.ability.guid === SPELLS.GROVE_GUARDIANS_WILD_GROWTH.id) {
      this.hardcastWildGrowthHealing += healAmount;
    }
  }

  onGGSummon(event: SummonEvent) {
    if (isFromHardcast(event) && event.targetInstance !== undefined) {
      this.hardcastInstances.add(event.targetInstance);
    }
  }

  get guideSubsection(): JSX.Element {
    const explanation = (
      <p>
        <b>
          <SpellLink spell={TALENTS_DRUID.GROVE_GUARDIANS_TALENT} />
        </b>{' '}
        是一个不占用GCD的治疗技能，与你的其他技能的互动很少。当你需要额外的治疗输出时使用它。这个技能非常高效——避免积累过多的充能。
      </p>
    );

    const data = <CastEfficiencyPanel spell={TALENTS_DRUID.GROVE_GUARDIANS_TALENT} useThresholds />;

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  get totalHardcastHealing() {
    return (
      this.hardcastSwiftmendHealing + this.hardcastNourishHealing + this.hardcastWildGrowthHealing
    );
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(6)} // 基于天赋层数的编号
        category={STATISTIC_CATEGORY.TALENTS}
        size="flexible"
        tooltip={
          <>
            这是林地守护者（迅捷治愈 + 愈合）的直接治疗总和
            {this.hasWildSynthesis && ' 以及由野性合成添加的额外技能（野性成长）。'}
            {this.hasTolCenariusGuidance && (
              <>
                {' '}
                此数值<strong>不</strong>包括由{' '}
                <SpellLink spell={TALENTS_DRUID.CENARIUS_GUIDANCE_TALENT} />{' '}
                召唤的林地守护者的治疗量 ——这只是手动施放的数值。
              </>
            )}
            <ul>
              <li>
                <SpellLink spell={SPELLS.GROVE_GUARDIANS_SWIFTMEND} />:{' '}
                <strong>{this.owner.formatItemHealingDone(this.hardcastSwiftmendHealing)}</strong>
              </li>
              <li>
                <SpellLink spell={SPELLS.GROVE_GUARDIANS_NOURISH} />:{' '}
                <strong>{this.owner.formatItemHealingDone(this.hardcastNourishHealing)}</strong>
              </li>
              {this.hasWildSynthesis && (
                <li>
                  <SpellLink spell={SPELLS.GROVE_GUARDIANS_WILD_GROWTH} />:{' '}
                  <strong>
                    {this.owner.formatItemHealingDone(this.hardcastWildGrowthHealing)}
                  </strong>
                </li>
              )}
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.GROVE_GUARDIANS_TALENT}>
          <ItemPercentHealingDone amount={this.totalHardcastHealing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}
