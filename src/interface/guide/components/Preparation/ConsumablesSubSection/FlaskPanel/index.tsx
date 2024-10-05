import { useAnalyzer, useInfo } from 'interface/guide/index';
import { PanelHeader, PerformanceRoundedPanel } from 'interface/guide/components/GuideDivs';
import FlaskChecker from 'parser/shared/modules/items/FlaskChecker';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { maybeGetSpell } from 'common/SPELLS';
import { SpellLink } from 'interface/index';
import Spell from 'common/SPELLS/Spell';
import Recommendations from 'interface/guide/components/Preparation/ConsumablesSubSection/Recommendations';
import Flask from 'interface/icons/Flask';
import Expansion from 'game/Expansion';

interface Props {
  recommendedFlasks?: Spell[];
  expansion?: Expansion;
}

const FlaskPanel = ({ recommendedFlasks, expansion }: Props) => {
  const flaskChecker = useAnalyzer(FlaskChecker);
  const info = useInfo();
  if (!flaskChecker || !info) {
    return null;
  }

  const recommendedFlaskIds = recommendedFlasks?.map((flask) => flask.id);
  const hadFlaskUp = flaskChecker.startFightWithFlaskUp;
  const hadStrongFlask = flaskChecker.strongFlaskUsed;
  const flaskBuffId = flaskChecker.flaskBuffId;
  const flaskBuff = maybeGetSpell(flaskBuffId, expansion);
  const showCurrentFlaskBuff = flaskBuff ? (
    <>
      : <SpellLink spell={flaskBuff} />
    </>
  ) : (
    <>.</>
  );

  let performance = QualitativePerformance.Good;
  if (flaskBuffId && recommendedFlaskIds && recommendedFlaskIds.includes(flaskBuffId)) {
    performance = QualitativePerformance.Perfect;
  } else if (!hadFlaskUp) {
    performance = QualitativePerformance.Fail;
  } else if (!hadStrongFlask) {
    performance = QualitativePerformance.Ok;
  }

  return (
    <PerformanceRoundedPanel performance={performance}>
      <PanelHeader className="flex">
        <div className="flex-main">
          <strong>Flask Buff</strong>
        </div>
        <div className="flex-sub">
          <Flask />
        </div>
      </PanelHeader>
      {performance === QualitativePerformance.Perfect && (
        <p>您在战斗开始时激活了最佳药水增益{showCurrentFlaskBuff}</p>
      )}
      {performance === QualitativePerformance.Good && (
        <>
          <p>您在战斗开始时激活了高质量的药水增益{showCurrentFlaskBuff}</p>
          {recommendedFlasks && (
            <Recommendations
              header={<strong>推荐的药水增益</strong>}
              recommendations={recommendedFlasks}
            />
          )}
        </>
      )}
      {performance === QualitativePerformance.Ok && (
        <>
          <p>您在战斗开始时没有激活最佳药水增益{showCurrentFlaskBuff}</p>
          {recommendedFlasks && (
            <Recommendations
              header={<strong>推荐的药水增益</strong>}
              recommendations={recommendedFlasks}
            />
          )}
        </>
      )}
      {performance === QualitativePerformance.Fail && (
        <>
          <p>您在战斗开始时没有激活任何药水增益。</p>
          {recommendedFlasks && (
            <Recommendations
              header={<strong>推荐的药水增益</strong>}
              recommendations={recommendedFlasks}
            />
          )}
        </>
      )}
    </PerformanceRoundedPanel>
  );
};

export default FlaskPanel;
