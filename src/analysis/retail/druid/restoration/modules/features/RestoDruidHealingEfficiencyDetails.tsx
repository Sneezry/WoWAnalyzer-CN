import { Trans } from '@lingui/macro';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import HealingEfficiencyBreakdown from 'parser/core/healingEfficiency/HealingEfficiencyBreakdown';
import HealingEfficiencyDetails from 'parser/core/healingEfficiency/HealingEfficiencyDetails';
import Panel from 'parser/ui/Panel';
import { TALENTS_DRUID } from 'common/TALENTS';

/** 用于显示治疗效率数据的模块 */
class RestoDruidHealingEfficiencyDetails extends HealingEfficiencyDetails {
  statistic() {
    return (
      <Panel
        title={<Trans id="shared.healingEfficiency.title">法力效率</Trans>}
        explanation={
          <>
            这些统计数据仅包括你的硬读条施法 - 由于 <SpellLink spell={SPELLS.CONVOKE_SPIRITS} />{' '}
            触发的施法不包含在此图表中。
            <br />
            由HoT的精通叠层所增加的治疗量**会**计入此处，但施法的进一步影响（例如由{' '}
            <SpellLink spell={TALENTS_DRUID.SOUL_OF_THE_FOREST_RESTORATION_TALENT} /> 触发的
            愈合迅捷）不会被计算在内。
          </>
        }
        position={120}
      >
        <HealingEfficiencyBreakdown tracker={this.healingEfficiencyTracker} />
      </Panel>
    );
  }
}

export default RestoDruidHealingEfficiencyDetails;
