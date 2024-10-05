import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { Options } from 'parser/core/Module';
import { TALENTS_DRUID } from 'common/TALENTS';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import Events, {
  CastEvent,
  UpdateSpellUsableEvent,
  UpdateSpellUsableType,
} from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import Spell from 'common/SPELLS/Spell';
import SPECS from 'game/SPECS';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import TalentSpellText from 'parser/ui/TalentSpellText';
import { SpellIcon, SpellLink } from 'interface';

const ARCANE_SPELLS = [
  SPELLS.MOONFIRE_CAST,
  SPELLS.STARFIRE,
  SPELLS.STARSURGE_MOONKIN,
  TALENTS_DRUID.STARFALL_TALENT,
  TALENTS_DRUID.STELLAR_FLARE_TALENT,
  TALENTS_DRUID.NEW_MOON_TALENT,
  SPELLS.HALF_MOON,
  SPELLS.FULL_MOON,
  TALENTS_DRUID.FURY_OF_ELUNE_TALENT,
  TALENTS_DRUID.LUNAR_BEAM_TALENT,
  // 月之召唤的“奥术横扫”在构造函数中单独处理
];

const MOON_REDUCE_MS = 1_000;
const FOE_REDUCE_MS = 2_000;
const LUNAR_BEAM_REDUCE_MS = 3_000;

/**
 * **月之能量**
 * 英雄天赋
 *
 *  平衡
 * 你的奥术技能减少艾露恩之怒的冷却时间2秒，并减少新月、半月和满月的冷却时间1秒。
 *
 *  守护
 * 你的奥术技能减少月光束的冷却时间3秒。
 */
export default class Lunation extends Analyzer.withDependencies({ spellUsable: SpellUsable }) {
  /** 被减少冷却的法术 */
  spell: Spell | undefined = undefined;
  /** 每次施放奥术技能时减少法术冷却的时间 */
  cdrMsPerCast: number = 0;
  /** 当前冷却的充能应用的冷却缩减 */
  pendingCdrMs: number = 0;
  /** 已经完成冷却的充能应用的总冷却缩减 */
  totalCdrMs: number = 0;
  /** 总的“原始”冷却缩减，包括因法术未在冷却时无法应用的缩减 */
  totalRawCdr: number = 0;
  /** 被追踪法术恢复的总充能次数 */
  finishedCdCount: number = 0;

  testArcaneCastCount: number = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.LUNATION_TALENT);

    if (this.selectedCombatant.hasTalent(TALENTS_DRUID.NEW_MOON_TALENT)) {
      this.spell = TALENTS_DRUID.NEW_MOON_TALENT;
      this.cdrMsPerCast = MOON_REDUCE_MS;
    } else if (this.selectedCombatant.hasTalent(TALENTS_DRUID.FURY_OF_ELUNE_TALENT)) {
      this.spell = TALENTS_DRUID.FURY_OF_ELUNE_TALENT;
      this.cdrMsPerCast = FOE_REDUCE_MS;
    } else if (this.selectedCombatant.hasTalent(TALENTS_DRUID.LUNAR_BEAM_TALENT)) {
      this.spell = TALENTS_DRUID.LUNAR_BEAM_TALENT;
      this.cdrMsPerCast = LUNAR_BEAM_REDUCE_MS;
    }

    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(ARCANE_SPELLS), this.onArcaneCast);
    if (
      this.selectedCombatant.spec === SPECS.GUARDIAN_DRUID &&
      this.selectedCombatant.hasTalent(TALENTS_DRUID.LUNAR_CALLING_TALENT)
    ) {
      // 在拥有此天赋的情况下，横扫会变成奥术法术，但施法ID不变
      this.addEventListener(
        Events.cast.by(SELECTED_PLAYER).spell(SPELLS.THRASH_BEAR),
        this.onArcaneCast,
      );
    }
    if (this.spell) {
      this.addEventListener(
        Events.UpdateSpellUsable.by(SELECTED_PLAYER).spell(this.spell),
        this.onReducedCdUpdate,
      );
    }
  }

  onArcaneCast(event: CastEvent) {
    if (this.spell) {
      this.testArcaneCastCount += 1;
      this.pendingCdrMs += this.deps.spellUsable.reduceCooldown(this.spell.id, this.cdrMsPerCast);
      this.totalRawCdr += this.cdrMsPerCast;
    }
  }

  onReducedCdUpdate(event: UpdateSpellUsableEvent) {
    if (
      event.updateType === UpdateSpellUsableType.EndCooldown ||
      event.updateType === UpdateSpellUsableType.RestoreCharge
    ) {
      this.totalCdrMs += this.pendingCdrMs;
      this.pendingCdrMs = 0;
      this.finishedCdCount += 1;
    }
  }

  get cdrPerCast(): string {
    if (this.finishedCdCount === 0) {
      return 'N/A';
    } else {
      return (this.totalCdrMs / this.finishedCdCount / 1000).toFixed(1) + '秒';
    }
  }

  statistic() {
    if (!this.spell) {
      return;
    }
    return (
      <Statistic
        category={STATISTIC_CATEGORY.HERO_TALENTS}
        size="flexible"
        tooltip={
          <>
            <p>
              这是<strong>{this.spell ? <SpellLink spell={this.spell} /> : null}</strong>
              的每次施放的平均冷却缩减，计算了整个战斗中的表现。 在整个战斗中总共获得了{' '}
              <strong>{(this.totalCdrMs / 1000).toFixed(0)}秒</strong>的有效冷却缩减。
            </p>
            <p>
              整个战斗中的总“原始”冷却缩减（包括在
              <strong>{this.spell ? <SpellLink spell={this.spell} /> : null}</strong>
              不在冷却时施放奥术法术时的缩减）为{' '}
              <strong>{(this.totalRawCdr / 1000).toFixed(0)}秒</strong>。
            </p>
          </>
        }
      >
        <TalentSpellText talent={TALENTS_DRUID.LUNATION_TALENT}>
          <>
            <SpellIcon spell={this.spell} /> {this.cdrPerCast} <small>平均每次施放的冷却缩减</small>
          </>
        </TalentSpellText>
      </Statistic>
    );
  }
}
