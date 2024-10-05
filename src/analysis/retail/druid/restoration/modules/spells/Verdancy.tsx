import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { TALENTS_DRUID } from 'common/TALENTS';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import SPELLS from 'common/SPELLS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Events, { HealEvent } from 'parser/core/Events';
import { isFromExpiringLifebloom } from 'analysis/retail/druid/restoration/normalizers/CastLinkNormalizer';
import { SpellLink } from 'interface';

/**
 * **绿色生机**
 * 专精天赋
 *
 * 生命绽放绽放时，在百花齐放范围内最多3个目标会被治疗X点生命值。
 */
class Verdancy extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
  };

  protected abilityTracker!: AbilityTracker;

  naturalBlooms = 0;
  photoBlooms = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.VERDANCY_TALENT);

    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.LIFEBLOOM_BLOOM_HEAL),
      this.onBloom,
    );
  }

  onBloom(event: HealEvent) {
    if (isFromExpiringLifebloom(event)) {
      this.naturalBlooms += 1;
    } else {
      this.photoBlooms += 1;
    }
  }

  get averageVerdancyHitsPerBloom() {
    const blooms = this.abilityTracker.getAbility(SPELLS.LIFEBLOOM_BLOOM_HEAL.id).healingHits;
    const verdancyHits = this.abilityTracker.getAbility(SPELLS.VERDANCY.id).healingHits;
    return blooms === 0 ? 0 : verdancyHits / blooms;
  }

  statistic() {
    const hasPhotosynthesis = this.selectedCombatant.hasTalent(TALENTS_DRUID.PHOTOSYNTHESIS_TALENT);
    return (
      <Statistic
        size="flexible"
        position={STATISTIC_ORDER.OPTIONAL(7)} // 根据天赋行编号
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            为了最大化绿色生机的治疗效果，你需要频繁触发绽放，并始终保持百花齐放覆盖团队成员。
            <ul>
              <li>
                每次绽放的平均命中数: <strong>{this.averageVerdancyHitsPerBloom.toFixed(1)}</strong>
              </li>
              {hasPhotosynthesis ? (
                <>
                  <li>
                    自然绽放:{' '}
                    <strong>{this.owner.getPerMinute(this.naturalBlooms).toFixed(1)}</strong>{' '}
                    次/分钟
                  </li>
                  <li>
                    <SpellLink spell={TALENTS_DRUID.PHOTOSYNTHESIS_TALENT} /> 绽放:{' '}
                    <strong>{this.owner.getPerMinute(this.photoBlooms).toFixed(1)}</strong> 次/分钟
                  </li>
                </>
              ) : (
                <>
                  <li>
                    每分钟绽放次数:{' '}
                    <strong>
                      {this.owner.getPerMinute(this.naturalBlooms + this.photoBlooms)}
                    </strong>
                  </li>
                </>
              )}
            </ul>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.VERDANCY_TALENT}>
          <ItemPercentHealingDone
            amount={this.abilityTracker.getAbility(SPELLS.VERDANCY.id).healingEffective}
          />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Verdancy;
