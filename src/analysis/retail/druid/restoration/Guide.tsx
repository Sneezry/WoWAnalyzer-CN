import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { GuideProps, Section, SubSection } from 'interface/guide';
import { GapHighlight } from 'parser/ui/CooldownBar';

import CombatLogParser from './CombatLogParser';
import { TALENTS_DRUID } from 'common/TALENTS';
import CastEfficiencyBar from 'parser/ui/CastEfficiencyBar';
import PreparationSection from 'interface/guide/components/Preparation/PreparationSection';

/** 核心技能部分的说明/数据中的常见规则点 */
export const GUIDE_CORE_EXPLANATION_PERCENT = 40;

export default function Guide({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <>
      <Section title="核心技能">
        {modules.rejuvenation.guideSubsection}
        {modules.wildGrowth.guideSubsection}
        {modules.regrowthAndClearcasting.guideSubsection}
        {modules.lifebloom.guideSubsection}
        {modules.efflorescence.guideSubsection}
        {modules.swiftmend.guideSubsection}
        {info.combatant.hasTalent(TALENTS_DRUID.GROVE_GUARDIANS_TALENT) &&
          modules.groveGuardians.guideSubsection}
        {info.combatant.hasTalent(TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT) &&
          modules.soulOfTheForest.guideSubsection}
        {info.combatant.hasTalent(TALENTS_DRUID.CENARION_WARD_TALENT) &&
          modules.cenarionWard.guideSubsection}
      </Section>
      <Section title="治疗冷却技能">
        <p>
          恢复德鲁伊拥有多种强大的治疗冷却技能。这些技能既节省法力，又具备强大的治疗能力，应该频繁使用。通过提前施放许多{' '}
          <SpellLink spell={SPELLS.REJUVENATION} />和<SpellLink spell={SPELLS.WILD_GROWTH} />{' '}
          来为你的冷却技能做好准备，从而在激活冷却技能时最大化激活时存在的治疗效果。提前规划，在团队受到大量伤害前几秒开始准备。
          你应该始终在使用冷却技能前施放一次野性成长。
        </p>
        <HotGraphSubsection modules={modules} events={events} info={info} />
        <CooldownGraphSubsection modules={modules} events={events} info={info} />
        <CooldownBreakdownSubsection modules={modules} events={events} info={info} />
        <PreparationSection />
      </Section>
    </>
  );
}

function HotGraphSubsection({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <SubSection>
      <strong>HoT 图表</strong> - 该图表显示了在战斗过程中你激活的回春术和野性成长的数量，
      规则线显示了你激活治疗冷却技能的时间点。你是否在每次冷却技能之前都施放了野性成长？
      在重大伤害前你是否充分准备了回春术？
      {modules.hotCountGraph.plot}
    </SubSection>
  );
}

function CooldownGraphSubsection({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <SubSection>
      <strong>冷却图表</strong> - 该图表显示了你何时使用了冷却技能以及你再次使用它们之前的等待时间。
      灰色段表示技能可用，黄色段表示技能在冷却中。红色段突出显示了你本可以多使用一次冷却技能的时间。
      {info.combatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) && (
        <CastEfficiencyBar
          spellId={SPELLS.CONVOKE_SPIRITS.id}
          gapHighlightMode={GapHighlight.FullCooldown}
          useThresholds
        />
      )}
      {info.combatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT) && (
        <CastEfficiencyBar
          spellId={TALENTS_DRUID.FLOURISH_TALENT.id}
          gapHighlightMode={GapHighlight.FullCooldown}
          useThresholds
        />
      )}
      {info.combatant.hasTalent(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT) && (
        <CastEfficiencyBar
          spellId={TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT.id}
          gapHighlightMode={GapHighlight.FullCooldown}
          useThresholds
        />
      )}
      <CastEfficiencyBar
        spellId={SPELLS.TRANQUILITY_CAST.id}
        gapHighlightMode={GapHighlight.FullCooldown}
        useThresholds
      />
      <CastEfficiencyBar
        spellId={SPELLS.INNERVATE.id}
        gapHighlightMode={GapHighlight.FullCooldown}
        useThresholds
      />
    </SubSection>
  );
}

function CooldownBreakdownSubsection({
  modules,
  events,
  info,
}: GuideProps<typeof CombatLogParser>) {
  return (
    <SubSection>
      <strong>技能细节分析</strong>
      <p />
      {info.combatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) &&
        modules.convokeSpirits.guideCastBreakdown}
      {info.combatant.hasTalent(TALENTS_DRUID.FLOURISH_TALENT) &&
        modules.flourish.guideCastBreakdown}
      {info.combatant.hasTalent(TALENTS_DRUID.INCARNATION_TREE_OF_LIFE_TALENT) &&
        modules.treeOfLife.guideCastBreakdown}
      {modules.tranquility.guideCastBreakdown}
      {modules.innervate.guideCastBreakdown}
    </SubSection>
  );
}
