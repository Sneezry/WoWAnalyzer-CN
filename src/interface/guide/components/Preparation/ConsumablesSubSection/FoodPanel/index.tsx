import Spell from 'common/SPELLS/Spell';
import { useAnalyzer, useInfo } from 'interface/guide/index';
import FoodChecker from 'parser/shared/modules/items/FoodChecker';
import { maybeGetSpell } from 'common/SPELLS';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SpellLink } from 'interface/index';
import { PanelHeader, PerformanceRoundedPanel } from 'interface/guide/components/GuideDivs';
import Recommendations from 'interface/guide/components/Preparation/ConsumablesSubSection/Recommendations';
import Soup from 'interface/icons/Soup';
import Expansion from 'game/Expansion';

interface Props {
  recommendedFoods?: Spell[];
  expansion?: Expansion;
}

const FoodPanel = ({ recommendedFoods, expansion }: Props) => {
  const foodChecker = useAnalyzer(FoodChecker);
  const info = useInfo();
  if (!foodChecker || !info) {
    return null;
  }

  const recommendedFoodIds = recommendedFoods?.map((food) => food.id);
  const foodBuffId = foodChecker.foodBuffId;
  const foodBuff = maybeGetSpell(foodBuffId, expansion);
  const showCurrentFoodBuff = foodBuff ? (
    <>
      : <SpellLink spell={foodBuff} />
    </>
  ) : (
    <>.</>
  );

  let performance = QualitativePerformance.Fail;
  if (foodBuffId && recommendedFoodIds && recommendedFoodIds.includes(foodBuffId)) {
    performance = QualitativePerformance.Perfect;
  } else if (foodChecker.higherFoodUp) {
    performance = QualitativePerformance.Good;
  } else if (foodChecker.midTierFoodUp || foodChecker.lowerFoodUp) {
    performance = QualitativePerformance.Ok;
  }

  return (
    <PerformanceRoundedPanel performance={performance}>
      <PanelHeader className="flex">
        <div className="flex-main">
          <strong>当前食物增益</strong>
        </div>
        <div className="flex-sub">
          <Soup />
        </div>
      </PanelHeader>
      {performance === QualitativePerformance.Perfect && (
        <p>您在战斗开始时激活了最佳食物增益{showCurrentFoodBuff}</p>
      )}
      {performance === QualitativePerformance.Good && (
        <>
          <p>您在战斗开始时激活了高质量的食物增益{showCurrentFoodBuff}</p>
          {recommendedFoods && (
            <Recommendations
              header={<strong>推荐的食物增益</strong>}
              recommendations={recommendedFoods}
            />
          )}
        </>
      )}
      {performance === QualitativePerformance.Ok && (
        <>
          <p>您在战斗开始时没有激活最佳食物增益{showCurrentFoodBuff}</p>
          {recommendedFoods && (
            <Recommendations
              header={<strong>推荐的食物增益</strong>}
              recommendations={recommendedFoods}
            />
          )}
        </>
      )}
      {performance === QualitativePerformance.Fail && (
        <>
          <p>您在战斗开始时没有任何食物增益。</p>
          {recommendedFoods && (
            <Recommendations
              header={<strong>推荐的食物增益</strong>}
              recommendations={recommendedFoods}
            />
          )}
        </>
      )}
    </PerformanceRoundedPanel>
  );
};

export default FoodPanel;
