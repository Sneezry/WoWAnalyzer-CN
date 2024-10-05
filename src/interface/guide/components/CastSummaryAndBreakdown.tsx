import { Fragment, useState } from 'react';
import { ControlledExpandable } from 'interface';
import { BoxRowEntry, PerformanceBoxRow } from 'interface/guide/components/PerformanceBoxRow';
import GradiatedPerformanceBar from 'interface/guide/components/GradiatedPerformanceBar';
import Spell from 'common/SPELLS/Spell';
import SpellLink from 'interface/SpellLink';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import CastPerformanceSummary from 'analysis/retail/demonhunter/shared/guide/CastPerformanceSummary';
import styled from '@emotion/styled';

const CastSummaryAndBreakdownContainer = styled.div`
  margin-bottom: 10px;
`;

interface Props {
  /** 被表示的法术ID或法术对象，用于解释性文本 */
  spell: number | Spell;
  /** 要显示的每次施法评估数据 */
  castEntries: BoxRowEntry[];
  /** 鼠标悬停在“完美”部分的性能条时包含的标签 */
  perfectLabel?: React.ReactNode;
  /** 对于什么是“完美”施法的简要解释，包括在解释性文本中 */
  perfectExtraExplanation?: React.ReactNode;
  /** 如果设置，显示完美施法百分比的文本会在性能条之前 */
  includePerfectCastPercentage?: boolean;
  /** 鼠标悬停在“良好”部分的性能条时包含的标签 */
  goodLabel?: React.ReactNode;
  /** 对于什么是“良好”施法的简要解释，包括在解释性文本中 */
  goodExtraExplanation?: React.ReactNode;
  /** 如果设置，显示良好施法百分比的文本会在性能条之前 */
  includeGoodCastPercentage?: boolean;
  /** 鼠标悬停在“还可以”部分的性能条时包含的标签 */
  okLabel?: React.ReactNode;
  /** 对于什么是“还可以”施法的简要解释，包括在解释性文本中 */
  okExtraExplanation?: React.ReactNode;
  /** 如果设置，显示还可以施法百分比的文本会在性能条之前 */
  includeOkCastPercentage?: boolean;
  /** 鼠标悬停在“糟糕”部分的性能条时包含的标签 */
  badLabel?: React.ReactNode;
  /** 对于什么是“糟糕”施法的简要解释，包括在解释性文本中 */
  badExtraExplanation?: React.ReactNode;
  /** 如果设置，显示糟糕施法百分比的文本会在性能条之前 */
  includeBadCastPercentage?: boolean;
  /** 如果设置，解释性文本使用“使用”而不是“施法”。如果数据评估触发效果而不是施法，这很有用 */
  usesInsteadOfCasts?: boolean;
  /** 点击具有给定索引的性能框时使用的回调 */
  onClickBox?: (index: number) => void;
}

/**
 * 一个可点击的{@link GradiatedPerformanceBar}，可以扩展为{@link PerformanceBoxRow}。
 */
const CastSummaryAndBreakdown = ({
  spell,
  castEntries,
  perfectLabel,
  perfectExtraExplanation,
  includePerfectCastPercentage,
  goodLabel,
  goodExtraExplanation,
  includeGoodCastPercentage,
  okLabel,
  okExtraExplanation,
  includeOkCastPercentage,
  badLabel,
  badExtraExplanation,
  includeBadCastPercentage,
  usesInsteadOfCasts,
  onClickBox,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const perfect = castEntries.filter((it) => it.value === QualitativePerformance.Perfect).length;
  const good = castEntries.filter((it) => it.value === QualitativePerformance.Good).length;
  const ok = castEntries.filter((it) => it.value === QualitativePerformance.Ok).length;
  const bad = castEntries.filter((it) => it.value === QualitativePerformance.Fail).length;

  const hasPerfectCasts = perfect !== 0;
  const hasGoodCasts = good !== 0;
  const hasOkCasts = ok !== 0;
  const hasBadCasts = bad !== 0;

  const instanceWord = usesInsteadOfCasts ? '使用' : '施法';

  const perfectExplanation = !perfectExtraExplanation ? (
    <>蓝色是完美的{instanceWord}</>
  ) : (
    <>
      蓝色是完美的{instanceWord}（{perfectExtraExplanation}）
    </>
  );
  const goodExplanation = !goodExtraExplanation ? (
    <>绿色是良好的{instanceWord}</>
  ) : (
    <>
      绿色是良好的{instanceWord}（{goodExtraExplanation}）
    </>
  );
  const okExplanation = !okExtraExplanation ? (
    <>黄色是还可以的{instanceWord}</>
  ) : (
    <>
      黄色是还可以的{instanceWord}（{okExtraExplanation}）
    </>
  );
  const badExplanation = !badExtraExplanation ? (
    <>红色是糟糕的{instanceWord}</>
  ) : (
    <>
      红色是糟糕的{instanceWord}（{badExtraExplanation}）
    </>
  );

  const performanceExplanation = [
    hasPerfectCasts ? perfectExplanation : null,
    hasGoodCasts ? goodExplanation : null,
    hasOkCasts ? okExplanation : null,
    hasBadCasts ? badExplanation : null,
  ]
    .filter((explanation): explanation is JSX.Element => explanation !== null)
    .map((explanation, idx) => (
      <Fragment key={idx}>
        {idx > 0 && ', '}
        {explanation}
      </Fragment>
    ));

  const perfectBarLabel = perfectLabel || `完美的${instanceWord}`;
  const goodBarLabel = goodLabel || `良好的${instanceWord}`;
  const okBarLabel = okLabel || `还可以的${instanceWord}`;
  const badBarLabel = badLabel || `糟糕的${instanceWord}`;

  return (
    <CastSummaryAndBreakdownContainer>
      {includePerfectCastPercentage && (
        <CastPerformanceSummary
          casts={perfect}
          performance={QualitativePerformance.Perfect}
          spell={spell}
          totalCasts={castEntries.length}
        />
      )}
      {includeGoodCastPercentage && (
        <CastPerformanceSummary
          casts={good}
          performance={QualitativePerformance.Good}
          spell={spell}
          totalCasts={castEntries.length}
        />
      )}
      {includeOkCastPercentage && (
        <CastPerformanceSummary
          casts={ok}
          performance={QualitativePerformance.Ok}
          spell={spell}
          totalCasts={castEntries.length}
        />
      )}
      {includeBadCastPercentage && (
        <CastPerformanceSummary
          casts={bad}
          performance={QualitativePerformance.Fail}
          spell={spell}
          totalCasts={castEntries.length}
        />
      )}
      <strong>
        <SpellLink spell={spell} /> 的施法
      </strong>{' '}
      <small>
        - {performanceExplanation}。鼠标悬停以获取更多细节。点击查看每次{instanceWord}的细节。
      </small>
      <ControlledExpandable
        header={
          <GradiatedPerformanceBar
            perfect={{ count: perfect, label: perfectBarLabel }}
            good={{ count: good, label: goodBarLabel }}
            ok={{ count: ok, label: okBarLabel }}
            bad={{ count: bad, label: badBarLabel }}
          />
        }
        element="section"
        expanded={isExpanded}
        inverseExpanded={() => setIsExpanded(!isExpanded)}
      >
        <small>鼠标悬停以获取更多细节。</small>
        <PerformanceBoxRow onClickBox={onClickBox} values={castEntries} />
      </ControlledExpandable>
    </CastSummaryAndBreakdownContainer>
  );
};

export default CastSummaryAndBreakdown;
