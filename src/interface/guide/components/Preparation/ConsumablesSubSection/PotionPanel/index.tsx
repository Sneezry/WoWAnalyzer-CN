import { useAnalyzer, useInfo } from 'interface/guide/index';
import { PanelHeader, PerformanceRoundedPanel } from 'interface/guide/components/GuideDivs';
import PotionChecker from 'parser/retail/modules/items/PotionChecker';
import ClassicPotionChecker from 'parser/classic/modules/items/PotionChecker';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import ItemLink from 'interface/ItemLink';
import Potion from 'interface/icons/Potion';
import Expansion, { CLASSIC_EXPANSION } from 'game/Expansion';

interface Props {
  expansion?: Expansion;
}

const PotionPanel = ({ expansion }: Props) => {
  const UsePotionChecker = expansion === CLASSIC_EXPANSION ? ClassicPotionChecker : PotionChecker;
  const potionChecker = useAnalyzer(UsePotionChecker);
  const info = useInfo();
  if (!potionChecker || !info) {
    return null;
  }

  const weakPotionsUsed = potionChecker.weakPotionsUsed;
  const potionsUsed = potionChecker.potionsUsed;
  const maxPotions = potionChecker.maxPotions;
  const strongPotionId = potionChecker.strongPotionId;
  const suggestionMessage = potionChecker.suggestionMessage;

  let performance = QualitativePerformance.Good;
  if (weakPotionsUsed > 0) {
    performance = QualitativePerformance.Ok;
  }
  if (potionsUsed < maxPotions) {
    performance = QualitativePerformance.Fail;
  }

  return (
    <PerformanceRoundedPanel performance={performance}>
      <PanelHeader className="flex">
        <div className="flex-main">
          <strong>使用的药水数量</strong>
        </div>
        <div className="flex-sub">
          <Potion />
        </div>
      </PanelHeader>
      {performance !== QualitativePerformance.Fail && (
        <p>
          您在这场战斗中使用了适量的药水（{potionsUsed}/{maxPotions}）！做得好！
        </p>
      )}
      {performance === QualitativePerformance.Fail && (
        <p>
          您在这次遭遇中使用了 {potionsUsed} {potionsUsed === 1 ? '瓶药水' : '瓶药水'}
          ，但您本可以使用 {maxPotions}。{suggestionMessage}
        </p>
      )}
      {weakPotionsUsed > 0 && (
        <>
          <PanelHeader>
            <strong>使用药水的质量</strong>
          </PanelHeader>
          <p>
            您使用了 {weakPotionsUsed} {weakPotionsUsed === 1 ? '瓶弱药水' : '瓶弱药水'}。请使用{' '}
            <ItemLink id={strongPotionId} /> 以获得更好的效果。
          </p>
        </>
      )}
    </PerformanceRoundedPanel>
  );
};

export default PotionPanel;
