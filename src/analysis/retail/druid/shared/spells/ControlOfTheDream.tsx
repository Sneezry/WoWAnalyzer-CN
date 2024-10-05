import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import { TALENTS_DRUID } from 'common/TALENTS';
import { Options } from 'parser/core/Module';
import Events, { UpdateSpellUsableEvent, UpdateSpellUsableType } from 'parser/core/Events';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import Abilities from 'parser/core/modules/Abilities';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import { SpellIcon } from 'interface';

const MAJOR_SPELLS = [
  TALENTS_DRUID.FORCE_OF_NATURE_TALENT,
  TALENTS_DRUID.CELESTIAL_ALIGNMENT_TALENT,
  TALENTS_DRUID.INCARNATION_CHOSEN_OF_ELUNE_TALENT,
  TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT,
  TALENTS_DRUID.NATURES_SWIFTNESS_TALENT,
  TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT,
];

const MAX_CDR = 15_000;

/**
 * **梦境控制**
 * 生命守护者的英雄天赋
 *
 * 当你的主要技能可用时，已消耗的时间将从该技能的冷却时间中减去，最多可减少15秒。
 * 平衡专精：自然之力，星界对齐，化身：艾露恩的化身，心能激荡
 * 恢复专精：自然迅捷，化身：生命之树，心能激荡
 */
export default class ControlOfTheDream extends Analyzer.withDependencies({
  spellUsable: SpellUsable,
  abilities: Abilities,
}) {
  /** 每个“主要技能”CDR的信息，按法术ID索引 */
  cdrSpellInfos: CdrSpellInfo[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.CONTROL_OF_THE_DREAM_TALENT);

    this.addEventListener(
      Events.UpdateSpellUsable.by(SELECTED_PLAYER).spell(MAJOR_SPELLS),
      this.onMajorSpellCdUpdate,
    );

    // 由于这个技能的特殊冷却行为，CastEfficiency需要一个自定义的最大施法次数
    if (this.active) {
      MAJOR_SPELLS.forEach((spell) => {
        const ability = (options.abilities as Abilities).getAbility(spell.id);
        if (ability) {
          ability.castEfficiency.maxCasts = (cooldown) =>
            (this.owner.fightDuration + MAX_CDR) / (cooldown * 1_000);
        }
      });
    }
  }

  onMajorSpellCdUpdate(event: UpdateSpellUsableEvent) {
    const spellId = event.ability.guid;
    if (!this.cdrSpellInfos[spellId]) {
      this.cdrSpellInfos[spellId] = {
        earlyCasts: 0,
        totalEffectiveCdr: 0,
      };
    }
    const info = this.cdrSpellInfos[spellId];

    if (event.updateType === UpdateSpellUsableType.BeginCooldown) {
      // 主要技能刚刚被使用，更新法术信息
      if (info.naturalEnd && info.naturalEnd > this.owner.currentTimestamp) {
        info.earlyCasts += 1;
        info.totalEffectiveCdr += info.naturalEnd - this.owner.currentTimestamp;
      }
      info.naturalEnd =
        this.owner.currentTimestamp + this.deps.spellUsable.cooldownRemaining(spellId);
      // 第一次施法总是获得最大CDR
      const cdr = !info.lastAvailable
        ? MAX_CDR
        : Math.min(MAX_CDR, this.owner.currentTimestamp - info.lastAvailable);
      this.deps.spellUsable.reduceCooldown(spellId, cdr);
    } else if (event.updateType === UpdateSpellUsableType.EndCooldown) {
      // 主要技能刚刚完成冷却，注册它
      info.lastAvailable = this.owner.currentTimestamp;
    }
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(1)}
        category={STATISTIC_CATEGORY.HERO_TALENTS}
        size="flexible"
      >
        <BoringSpellValueText spell={TALENTS_DRUID.CONTROL_OF_THE_DREAM_TALENT}>
          <>
            {this.cdrSpellInfos.map((cdrInfo, spellId) => (
              <>
                <SpellIcon spell={spellId} /> {(cdrInfo.totalEffectiveCdr / 1_000).toFixed(0)}秒{' '}
                <small>有效CDR</small> / {cdrInfo.earlyCasts} <small>提前施法次数</small>
                <br />
              </>
            ))}
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

interface CdrSpellInfo {
  /** 法术最后一次变为可用的时间戳（冷却结束） */
  lastAvailable?: number;
  /** 没有此天赋时，法术下次冷却结束的时间戳 */
  naturalEnd?: number;
  /** 法术比在没有梦境控制的情况下提前施放的次数 */
  earlyCasts: number;
  /** 提前施放所节省的有效CDR总和（以毫秒为单位） */
  totalEffectiveCdr: number;
}
