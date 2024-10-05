import { formatNumber } from 'common/format';
import SPELLS from 'common/SPELLS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent } from 'parser/core/Events';
import Combatants from 'parser/shared/modules/Combatants';
import HotTracker, { Attribution, TrackersBySpell } from 'parser/shared/modules/HotTracker';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemPercentHealingDone from 'parser/ui/ItemPercentHealingDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import HotTrackerRestoDruid from 'analysis/retail/druid/restoration/modules/core/hottracking/HotTrackerRestoDruid';
import { TALENTS_DRUID } from 'common/TALENTS';
import { SpellLink } from 'interface';

const HOT_EXTENSION = 8_000;

const HOT_ID_CONSUME_ORDER = [
  SPELLS.REGROWTH.id,
  SPELLS.WILD_GROWTH.id,
  SPELLS.REJUVENATION.id,
  SPELLS.REJUVENATION_GERMINATION.id,
];

/**
 * **生机灌注**
 * 专精天赋第8层
 *
 * 迅捷治愈不再消耗一个持续治疗效果，
 * 并将目标身上的持续治疗效果持续时间延长8秒。
 */
class VerdantInfusion extends Analyzer {
  static dependencies = {
    hotTracker: HotTrackerRestoDruid,
    combatants: Combatants,
  };

  hotTracker!: HotTrackerRestoDruid;
  combatants!: Combatants;

  attribution: Attribution = HotTracker.getNewAttribution('Verdant Infusion');
  perHotExtensions: Map<number, number> = new Map<number, number>();
  casts: number = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.VERDANT_INFUSION_TALENT);

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.SWIFTMEND),
      this.onSwiftmend,
    );
  }

  onSwiftmend(event: CastEvent) {
    this.casts += 1;
    const target = this.combatants.getEntity(event);
    if (!target) {
      return;
    }
    const hotsOn: TrackersBySpell = this.hotTracker.hots[target.id];
    if (!hotsOn) {
      return;
    }
    const hotIdsOn: number[] = Object.keys(hotsOn).map((hotId) => Number(hotId));

    const hotIdThatWouldHaveBeenRemoved: number | undefined = HOT_ID_CONSUME_ORDER.find((hotId) =>
      hotIdsOn.includes(hotId),
    );

    hotIdsOn.forEach((hotId) => {
      this.perHotExtensions.set(hotId, (this.perHotExtensions.get(hotId) ?? 0) + 1);
      if (hotId === hotIdThatWouldHaveBeenRemoved) {
        // 注册扩展，但将整个HoT归因于生机灌注
        this.hotTracker.addExtension(null, HOT_EXTENSION, target.id, hotId);
        this.hotTracker.addAttribution(this.attribution, target.id, hotId);
      } else {
        // 注册并归因于扩展
        this.hotTracker.addExtension(this.attribution, HOT_EXTENSION, target.id, hotId);
      }
    });
  }

  get healingPerCast() {
    return this.casts === 0 ? 0 : this.attribution.healing / this.casts;
  }

  get extensionsPerCast() {
    return this.casts === 0 ? 0 : this.attribution.procs / this.casts;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(8)} // 基于天赋行的编号
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            <p>
              这是由于在拥有生机灌注天赋的情况下施放迅捷治愈所引起的HoT持续时间延长所带来的治疗总和。
              此数字还考虑到了不消耗HoT的收益。
            </p>
            <p>
              在<strong>{this.casts} 次迅捷治愈</strong>中，你平均
              <strong>{this.extensionsPerCast.toFixed(1)} 个HoT被延长</strong>， 并导致每次施放
              <strong>{formatNumber(this.healingPerCast)} 额外治疗量</strong>。
            </p>
            <p>
              按每个HoT的延长情况：
              <ul>
                {[...this.perHotExtensions.entries()].map((keyAndVal) => {
                  const spellId = keyAndVal[0];
                  const procs = keyAndVal[1];
                  return (
                    <li key={spellId}>
                      <SpellLink spell={spellId} />: <strong>{procs}</strong> 次延长
                    </li>
                  );
                })}
              </ul>
            </p>
          </>
        }
      >
        <BoringSpellValueText spell={TALENTS_DRUID.VERDANT_INFUSION_TALENT}>
          <ItemPercentHealingDone amount={this.attribution.healing} />
          <br />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default VerdantInfusion;
