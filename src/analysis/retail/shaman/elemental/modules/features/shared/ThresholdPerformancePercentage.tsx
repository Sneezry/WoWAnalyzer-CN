import { PerformanceMark } from 'interface/guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatNumber, formatPercentage } from 'common/format';
import PerformanceStrongWithTooltip from 'interface/PerformanceStrongWithTooltip';

export interface LTEThreshold {
  type: 'lte';
  perfect: number;
  good: number;
  ok: number;
}

export interface GTEThreshold {
  type: 'gte';
  perfect: number;
  good: number;
  ok: number;
}

interface Props {
  threshold: LTEThreshold | GTEThreshold;
  percentage: number;
  flatAmount: number;
}
/**
 * Element that shows a performance percentage with a tooltip.
 *
 * The performance is computed based on the given threshold.
 */
const ThresoldPerformancePercentage = ({ threshold, percentage, flatAmount }: Props) => {
  let signJsx;
  if (threshold.type === 'lte') {
    signJsx = <>&lt;</>;
  } else {
    signJsx = <>&gt;</>;
  }

  const ops = {
    lte: (a: number, b: number) => a <= b,
    gte: (a: number, b: number) => a >= b,
  };

  let performance;
  if (ops[threshold.type](percentage, threshold.perfect)) {
    performance = QualitativePerformance.Perfect;
  } else if (ops[threshold.type](percentage, threshold.good)) {
    performance = QualitativePerformance.Good;
  } else if (ops[threshold.type](percentage, threshold.ok)) {
    performance = QualitativePerformance.Ok;
  } else {
    performance = QualitativePerformance.Fail;
  }

  const perfectSign = threshold.perfect > 0 ? <>{signJsx}=</> : <>=</>;
  return (
    <PerformanceStrongWithTooltip
      performance={performance}
      tooltip={
        <>
          <PerformanceMark perf={QualitativePerformance.Perfect} /> Perfect usage {perfectSign}{' '}
          {formatPercentage(threshold.perfect, 0)}%
          <br />
          <PerformanceMark perf={QualitativePerformance.Good} /> Good usage {signJsx}={' '}
          {formatPercentage(threshold.good, 0)}%
          <br />
          <PerformanceMark perf={QualitativePerformance.Ok} /> OK usage {signJsx}={' '}
          {formatPercentage(threshold.ok, 0)}%
        </>
      }
    >
      {formatNumber(flatAmount)} ({formatPercentage(percentage)}%)
    </PerformanceStrongWithTooltip>
  );
};

export default ThresoldPerformancePercentage;
