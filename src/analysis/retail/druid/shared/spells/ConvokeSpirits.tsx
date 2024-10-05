import { formatNumber } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  AbilityEvent,
  ApplyBuffEvent,
  CastEvent,
  DamageEvent,
  RefreshBuffEvent,
  TargettedEvent,
} from 'parser/core/Events';
import Abilities from 'parser/core/modules/Abilities';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_DRUID, TALENTS_DRUID as TALENTS } from 'common/TALENTS/druid';

import ActiveDruidForm, { DruidForm } from '../core/ActiveDruidForm';
import Combatant from 'parser/core/Combatant';

const DEBUG = false;

/*
 * 对于某些法术，我们包含多个ID，尽管通常只使用其中一个。
 * 但目前没有深入研究究竟是哪一个。
 */

/** 会通过buff应用来“命中”的所有灵魂鸣唱法术 */
const CONVOKE_BUFF_SPELLS = [
  SPELLS.REJUVENATION,
  SPELLS.REJUVENATION_GERMINATION,
  SPELLS.REGROWTH,
  SPELLS.IRONFUR,
  SPELLS.TIGERS_FURY,
  TALENTS.FERAL_FRENZY_TALENT,
  SPELLS.WILD_GROWTH,
  TALENTS.FLOURISH_TALENT,
  SPELLS.STARFALL_CAST, // 该ID也是buff的ID
];
/** 会通过debuff应用来“命中”的所有灵魂鸣唱法术 */
const CONVOKE_DEBUFF_SPELLS = [
  SPELLS.MOONFIRE_DEBUFF,
  SPELLS.MOONFIRE_FERAL,
  SPELLS.RAKE_BLEED,
  SPELLS.THRASH_BEAR_DOT,
];
/** 通过直接治疗“命中”的所有灵魂鸣唱法术 */
const CONVOKE_HEAL_SPELLS = [SPELLS.SWIFTMEND];
/** 通过直接伤害“命中”的所有灵魂鸣唱法术 */
const CONVOKE_DAMAGE_SPELLS = [
  SPELLS.WRATH,
  SPELLS.WRATH_MOONKIN,
  SPELLS.STARSURGE_AFFINITY,
  SPELLS.STARSURGE_MOONKIN,
  SPELLS.FULL_MOON,
  SPELLS.FEROCIOUS_BITE,
  SPELLS.RAVAGE_DOTC_CAT,
  SPELLS.SHRED,
  SPELLS.MANGLE_BEAR,
  TALENTS.PULVERIZE_TALENT,
];
/** 造成直接伤害的灵魂鸣唱法术（可能还有DoT部分） - 用于伤害统计 */
const CONVOKE_DIRECT_DAMAGE_SPELLS = [
  ...CONVOKE_DAMAGE_SPELLS,
  SPELLS.RAKE,
  SPELLS.THRASH_BEAR,
  SPELLS.MOONFIRE_DEBUFF,
  SPELLS.MOONFIRE_FERAL,
  // 不应显示为命中，因为它不是单独的法术，但仍应被计入伤害
  SPELLS.RAMPANT_FEROCITY,
];
/** 有旅行时间的灵魂鸣唱法术 */
const SPELLS_WITH_TRAVEL_TIME = [
  SPELLS.STARSURGE_AFFINITY,
  SPELLS.STARSURGE_MOONKIN,
  SPELLS.FULL_MOON,
  SPELLS.WRATH,
  SPELLS.WRATH_MOONKIN,
];
const SPELL_IDS_WITH_TRAVEL_TIME = SPELLS_WITH_TRAVEL_TIME.map((s) => s.id);
/** 可以击中多个目标的灵魂鸣唱法术 */
const SPELL_IDS_WITH_AOE = [
  SPELLS.MOONFIRE_DEBUFF.id,
  SPELLS.MOONFIRE_FERAL.id,
  SPELLS.FULL_MOON.id,
  SPELLS.RAVAGE_DOTC_CAT,
  SPELLS.THRASH_BEAR_DOT.id,
  SPELLS.WILD_GROWTH.id,
  // 回春术和愈合通常不是AOE，但Rampant Growth和PotA触发可能会使其击中额外目标
  SPELLS.REJUVENATION.id,
  SPELLS.REJUVENATION_GERMINATION.id,
  SPELLS.REGROWTH.id,
];

const SPELLS_CAST = 16;

const AOE_BUFFER_MS = 100;
const AFTER_CHANNEL_BUFFER_MS = 50;
const TRAVEL_BUFFER_MS = 2000;

/**
 * **灵魂鸣唱**
 * 专精天赋
 *
 * 召唤暗夜妖精，爆发能量，快速引导16个（恢复德鲁伊为12个）德鲁伊法术和技能，持续4秒。
 */
class ConvokeSpirits extends Analyzer {
  static dependencies = {
    abilities: Abilities,
    activeDruidForm: ActiveDruidForm,
  };

  protected abilities!: Abilities;
  protected activeDruidForm!: ActiveDruidForm;

  /** 灵魂鸣唱的施放次数 */
  cast: number = 0;
  /** 每次完整灵魂鸣唱施放的法术数量 */
  spellsPerCast: number;
  /** 最近一次在灵魂鸣唱期间注册的AOE法术命中的时间戳 - 用于避免重复计数 */
  mostRecentAoeTimestamp = 0;
  /** 从灵魂鸣唱施放次数到该施放的跟踪器的映射 - 注意索引零将始终为空 */
  convokeTracker: ConvokeCast[] = [];
  /**
   * 从有旅行时间的法术ID到该ID上次施放的映射。
   * 如果我们在灵魂鸣唱期间注册到命中，但施放是在合理的旅行时间内并且是同一目标，我们假设这是硬读条造成的命中（而不是灵魂鸣唱）。
   * 找到匹配的命中时，将清除施放条目。
   */
  lastTravelingSpellCast: Array<CastEvent | undefined> = [];

  /** 当前野性狂怒伤害是否来自灵魂鸣唱 */
  feralFrenzyIsConvoke: boolean = false;
  /** 当前星辰坠落伤害是否来自灵魂鸣唱 */
  starfallIsConvoke: boolean = false;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT);

    // 过去不同专精有不同的施法数量，这里保留变量以防将来再次改变
    this.spellsPerCast = SPELLS_CAST;

    // 监视灵魂鸣唱
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.CONVOKE_SPIRITS),
      this.onConvoke,
    );

    // 监视法术“命中”
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(CONVOKE_BUFF_SPELLS),
      this.onHit,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(CONVOKE_BUFF_SPELLS),
      this.onHit,
    );
    this.addEventListener(
      Events.applybuffstack.by(SELECTED_PLAYER).spell(CONVOKE_BUFF_SPELLS),
      this.onHit,
    );

    this.addEventListener(
      Events.applydebuff.by(SELECTED_PLAYER).spell(CONVOKE_DEBUFF_SPELLS),
      this.onHit,
    );
    this.addEventListener(
      Events.refreshdebuff.by(SELECTED_PLAYER).spell(CONVOKE_DEBUFF_SPELLS),
      this.onHit,
    );
    this.addEventListener(
      Events.applydebuffstack.by(SELECTED_PLAYER).spell(CONVOKE_DEBUFF_SPELLS),
      this.onHit,
    );

    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(CONVOKE_HEAL_SPELLS), this.onHit);

    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(CONVOKE_DAMAGE_SPELLS),
      this.onHit,
    );

    // 统计直接伤害
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(CONVOKE_DIRECT_DAMAGE_SPELLS),
      this.onDirectDamage,
    );

    // 特殊情况的伤害统计 - 星辰坠落和野性狂怒，它们是“不可刷新”的DoT
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.FERAL_FRENZY_DEBUFF),
      this.onFeralFrenzyDamage,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(TALENTS.FERAL_FRENZY_TALENT),
      this.onGainFeralFrenzy,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(TALENTS.FERAL_FRENZY_TALENT),
      this.onGainFeralFrenzy,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.STARFALL),
      this.onStarfallDamage,
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.STARFALL_CAST),
      this.onGainStarfall,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.STARFALL_CAST),
      this.onGainStarfall,
    );

    // 监视有旅行时间的施放
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS_WITH_TRAVEL_TIME),
      this.onTravelTimeCast,
    );
  }

  onConvoke(event: ApplyBuffEvent) {
    this.cast += 1;
    this.convokeTracker[this.cast] = {
      timestamp: event.timestamp,
      spellIdToCasts: [],
      form: this.activeDruidForm.form,
      damage: 0,
    };
  }

  onHit(event: AbilityEvent<any> & TargettedEvent<any>) {
    const spellId = event.ability.guid;

    const isNewHit = this.isNewHit(spellId);
    const isTravelTime = SPELL_IDS_WITH_TRAVEL_TIME.includes(spellId);
    const wasProbablyHardcast = isTravelTime && this.wasProbablyHardcast(event);

    if (isNewHit && isConvoking(this.selectedCombatant) && !wasProbablyHardcast) {
      // 法术在灵魂鸣唱期间命中且是由于灵魂鸣唱
      this.registerConvokedSpell(spellId);
    } else if (isTravelTime && !wasProbablyHardcast && this.isWithinTravelFromConvoke()) {
      // 法术在灵魂鸣唱后不久命中但仍是由灵魂鸣唱引发的
      this.registerConvokedSpell(spellId);
    }

    if (isTravelTime) {
      this.onTravelTimeHit(spellId);
    }
  }

  onDirectDamage(event: DamageEvent) {
    if (event.tick) {
      return;
    }

    const spellId = event.ability.guid;

    const isTravelTime = SPELL_IDS_WITH_TRAVEL_TIME.includes(spellId);
    const wasProbablyHardcast = isTravelTime && this.wasProbablyHardcast(event);

    if (isConvoking(this.selectedCombatant) && !wasProbablyHardcast) {
      // 法术在灵魂鸣唱期间命中且是由于灵魂鸣唱
      this._addDamage(event);
    } else if (isTravelTime && !wasProbablyHardcast && this.isWithinTravelFromConvoke()) {
      // 法术在灵魂鸣唱后不久命中但仍是由灵魂鸣唱引发的
      this._addDamage(event);
    }
  }

  onGainFeralFrenzy(_: ApplyBuffEvent | RefreshBuffEvent) {
    this.feralFrenzyIsConvoke = isConvoking(this.selectedCombatant);
  }

  onGainStarfall(_: ApplyBuffEvent | RefreshBuffEvent) {
    this.starfallIsConvoke = isConvoking(this.selectedCombatant);
  }

  onFeralFrenzyDamage(event: DamageEvent) {
    if (this.feralFrenzyIsConvoke) {
      this._addDamage(event);
    }
  }

  onStarfallDamage(event: DamageEvent) {
    if (this.starfallIsConvoke) {
      this._addDamage(event);
    }
  }

  /** 统计此伤害事件来自灵魂鸣唱 */
  _addDamage(event: DamageEvent) {
    const currentConvoke = this.convokeTracker[this.cast];
    currentConvoke.damage += event.amount + (event.absorbed || 0);
    DEBUG &&
      console.log(
        `灵魂鸣唱 #${this.cast} - ${event.ability.name} 造成了 ${
          event.amount + (event.absorbed || 0)
        } @ ${this.owner.formatTimestamp(event.timestamp)}`,
      );
  }

  /**
   * 总的灵魂鸣唱造成的伤害
   */
  get totalDamage() {
    return this.convokeTracker.reduce((att, cast) => att + cast.damage, 0);
  }

  /**
   * 将给定的法术ID记录为当前灵魂鸣唱期间的施放。
   */
  registerConvokedSpell(spellId: number): void {
    const currentConvoke = this.convokeTracker[this.cast];
    if (!currentConvoke.spellIdToCasts[spellId]) {
      currentConvoke.spellIdToCasts[spellId] = 0;
    }
    currentConvoke.spellIdToCasts[spellId] += 1;
  }

  /**
   * 判断是否距离灵魂鸣唱结束足够近，以至于带有旅行时间的灵魂鸣唱法术仍然在空中。
   */
  isWithinTravelFromConvoke(): boolean {
    return this.selectedCombatant.hasBuff(SPELLS.CONVOKE_SPIRITS.id, null, TRAVEL_BUFFER_MS);
  }

  /**
   * 判断带有旅行时间的法术ID的命中是否可能来自硬读条
   */
  wasProbablyHardcast(event: AbilityEvent<any> & TargettedEvent<any>): boolean {
    const lastCast: CastEvent | undefined = this.lastTravelingSpellCast[event.ability.guid];
    return (
      lastCast !== undefined &&
      lastCast.timestamp + TRAVEL_BUFFER_MS > this.owner.currentTimestamp &&
      lastCast.targetID === event.targetID
    );
  }

  /**
   * 检查给定法术ID的命中是否“新”，并相应更新跟踪器。
   * 单目标法术的命中始终是新的。
   * AOE法术的命中只有在最近没有其他命中的情况下才是新的。
   */
  isNewHit(spellId: number): boolean {
    const isAoe: boolean = SPELL_IDS_WITH_AOE.includes(spellId);
    if (!isAoe) {
      return true;
    }
    if (this.owner.currentTimestamp <= this.mostRecentAoeTimestamp + AOE_BUFFER_MS) {
      return false; // 仍在同一个AOE中
    } else {
      // 新的AOE
      this.mostRecentAoeTimestamp = this.owner.currentTimestamp;
      return true;
    }
  }

  onTravelTimeCast(event: CastEvent) {
    this.lastTravelingSpellCast[event.ability.guid] = event;
  }

  onTravelTimeHit(spellId: number) {
    this.lastTravelingSpellCast[spellId] = undefined;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE()}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={this.baseTooltip}
        dropdown={this.baseTable}
      >
        <BoringSpellValueText spell={SPELLS.CONVOKE_SPIRITS}>-</BoringSpellValueText>
      </Statistic>
    );
  }

  /** 统计的基础形式下的下拉表 - 显示造成的伤害 */
  get baseTable(): React.ReactNode {
    return (
      <>
        <table className="table table-condensed">
          <thead>
            <tr>
              <th>施放次数</th>
              <th>时间</th>
              <th>形态</th>
              <th>伤害</th>
              <th>施放的法术</th>
            </tr>
          </thead>
          <tbody>
            {this.convokeTracker.map((convokeCast, index) => (
              <tr key={index}>
                <th scope="row">{index}</th>
                <td>{this.owner.formatTimestamp(convokeCast.timestamp)}</td>
                <td>{convokeCast.form}</td>
                <td>{formatNumber(convokeCast.damage)}</td>
                <td>
                  {convokeCast.spellIdToCasts.map((casts, spellId) => (
                    <div key={spellId}>
                      <SpellLink spell={spellId} /> {casts}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  /** 统计的基础形式下的工具提示 */
  get baseTooltip(): React.ReactNode {
    return (
      <>
        灵魂鸣唱施放的技能不会创建施放事件；此列表是通过在引导期间跟踪相关事件创建的。
        偶尔灵魂鸣唱会施放命中不了任何东西的技能（如周围只有免疫目标时的痛击）。
        在这些情况下，我们无法跟踪它，因此列出的法术数量可能不会加起来达到{this.spellsPerCast}。
      </>
    );
  }
}

/**
 * 判断玩家当前是否在施放灵魂鸣唱。
 * 包括灵魂鸣唱结束后的短暂缓冲时间，因为最后一个灵魂鸣唱的法术有时会在结束后略微延迟施放。
 * 作为一个单独的函数，避免依赖问题。
 */
export function isConvoking(c: Combatant): boolean {
  return c.hasBuff(SPELLS.CONVOKE_SPIRITS.id, null, AFTER_CHANNEL_BUFFER_MS);
}

export default ConvokeSpirits;

/** 用于跟踪单次灵魂鸣唱施放的内容 */
interface ConvokeCast {
  timestamp: number;
  /** 从法术ID到该法术在灵魂鸣唱期间施放次数的映射 */
  spellIdToCasts: number[];
  /** 德鲁伊在施放期间的形态 */
  form: DruidForm;
  /** 此次灵魂鸣唱施放的伤害 */
  damage: number;
}
