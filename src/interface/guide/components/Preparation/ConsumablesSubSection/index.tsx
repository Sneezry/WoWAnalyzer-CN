import { SubSection } from 'interface/guide/index';
import Spell from 'common/SPELLS/Spell';
import { SideBySidePanels } from 'interface/guide/components/GuideDivs';

import FoodPanel from './FoodPanel';
import PotionPanel from './PotionPanel';
import FlaskPanel from './FlaskPanel';
import Expansion, { isClassicExpansion } from 'game/Expansion';
import AlertWarning from 'interface/AlertWarning';

interface Props {
  recommendedFlasks?: Spell[];
  recommendedFoods?: Spell[];
  expansion?: Expansion;
}

const ConsumablesSubSection = ({ recommendedFlasks, recommendedFoods, expansion }: Props) => {
  return (
    <SubSection title="消耗品">
      <p>适当地使用消耗品是提升输出的简单方法。</p>
      <SideBySidePanels>
        <FoodPanel recommendedFoods={recommendedFoods} expansion={expansion} />
        <PotionPanel expansion={expansion} />
        <FlaskPanel recommendedFlasks={recommendedFlasks} expansion={expansion} />
      </SideBySidePanels>

      {expansion && isClassicExpansion(expansion) && (
        <AlertWarning style={{ marginTop: '1em' }}>
          在《大地的裂变经典版》中，即使使用了食物和药水，它们在日志中也不一定会出现！
        </AlertWarning>
      )}
    </SubSection>
  );
};

export default ConsumablesSubSection;
