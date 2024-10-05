import SPELLS from 'common/SPELLS';
import SpellLink from 'interface/SpellLink';
import Events from 'parser/core/Events';
import { Options } from 'parser/core/Module';
import BuffCountGraph, { GraphedSpellSpec } from 'parser/shared/modules/BuffCountGraph';
import Panel from 'parser/ui/Panel';

import ConvokeSpiritsResto from 'analysis/retail/druid/restoration/modules/spells/ConvokeSpiritsResto';
import { TALENTS_DRUID } from 'common/TALENTS';

const CONVOKE_SPEC_NAME = '万灵之召';
const CONVOKE_WITH_FLOURISH_SPEC_NAME = '万灵之召与繁茂';

/**
 * 图表展示了玩家在战斗过程中释放的持续治疗效果（HoTs），并叠加了冷却技能使用情况。
 * 有助于可视化玩家的HoT积累情况。
 */
class HotCountGraph extends BuffCountGraph {
  static dependencies = {
    ...BuffCountGraph.dependencies,
    convokeSpirits: ConvokeSpiritsResto,
  };
  convokeSpirits!: ConvokeSpiritsResto;

  constructor(options: Options) {
    super(options);
    if (this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT)) {
      this.addEventListener(Events.fightend, this.onFightEndConvokeCount);
    }
  }

  buffSpecs(): GraphedSpellSpec[] {
    const buffSpecs: GraphedSpellSpec[] = [];
    buffSpecs.push({
      spells: [SPELLS.REJUVENATION, SPELLS.REJUVENATION_GERMINATION],
      color: '#a010a0',
    });
    buffSpecs.push({ spells: SPELLS.WILD_GROWTH, color: '#20b020' });
    if (this.selectedCombatant.hasTalent(TALENTS_DRUID.CENARION_WARD_TALENT)) {
      buffSpecs.push({ spells: SPELLS.CENARION_WARD_HEAL, color: '#44ffcc' });
    }
    if (this.selectedCombatant.hasTalent(TALENTS_DRUID.ADAPTIVE_SWARM_TALENT)) {
      buffSpecs.push({
        spells: [SPELLS.ADAPTIVE_SWARM_HEAL, SPELLS.ADAPTIVE_SWARM_DAMAGE],
        color: '#cc7722',
      });
    }
    return buffSpecs;
  }

  castRuleSpecs(): GraphedSpellSpec[] {
    const castSpecs: GraphedSpellSpec[] = [];
    castSpecs.push({ spells: SPELLS.TRANQUILITY_CAST, color: '#bbbbbb' });
    if (this.selectedCombatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT)) {
      castSpecs.push({ spells: TALENTS_DRUID.FLOURISH_TALENT, color: '#ddbb33' });
    }
    if (this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT)) {
      // 这些自定义规格将从万灵之召模块数据中手动填充
      castSpecs.push({ name: '万灵之召', spells: [], color: '#2222bb' });
      // TODO 对于《巨龙时代》，仅带有额外天赋时繁茂和万灵之召才能一起使用——需要对此进行更新
      castSpecs.push({ name: '万灵之召与繁茂', spells: [], color: '#22aacc' });
    }
    return castSpecs;
  }

  onFightEndConvokeCount() {
    this.convokeSpirits.convokeTracker.forEach((cast) => {
      // 根据万灵之召是否触发了繁茂来显示不同的规则线颜色
      if (cast.spellIdToCasts[TALENTS_DRUID.FLOURISH_TALENT.id]) {
        this.addRuleLine(CONVOKE_WITH_FLOURISH_SPEC_NAME, cast.timestamp);
      } else {
        this.addRuleLine(CONVOKE_SPEC_NAME, cast.timestamp);
      }
    });
  }

  statistic() {
    return (
      <Panel
        title="HoT图表"
        position={100}
        explanation={
          <>
            这个图表展示了你在战斗过程中激活的HoT数量。它可以帮助你评估在使用冷却技能之前，你如何有效地“积累”了HoT。
            在施放 <SpellLink spell={SPELLS.WILD_GROWTH} /> 和多个{' '}
            <SpellLink spell={SPELLS.REJUVENATION} /> 之前施放{' '}
            <SpellLink spell={TALENTS_DRUID.FLOURISH_TALENT} /> 或{' '}
            <SpellLink spell={SPELLS.CONVOKE_SPIRITS} /> 可以显著提升它们的效果。 即使在施放{' '}
            <SpellLink spell={SPELLS.TRANQUILITY_CAST} /> 之前积累HoT也是有帮助的，
            因为额外的精通层数将提升直接治疗量。
          </>
        }
      >
        {this.plot}
      </Panel>
    );
  }
}

export default HotCountGraph;
