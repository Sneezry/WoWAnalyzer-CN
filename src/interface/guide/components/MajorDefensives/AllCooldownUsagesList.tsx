import styled from '@emotion/styled';
import { formatNumber } from 'common/format';
import { color } from 'game/MAGIC_SCHOOLS';
import { TooltipElement } from 'interface';
import { PerformanceMark, BadColor, OkColor, SubSection, useAnalyzer } from 'interface/guide';
import {
  damageBreakdown,
  DamageSourceLink,
} from 'interface/guide/components/DamageTakenPointChart';
import Explanation from 'interface/guide/components/Explanation';
import ExplanationRow from 'interface/guide/components/ExplanationRow';
import MajorDefensive, {
  MitigatedEvent,
  Mitigation,
} from 'interface/guide/components/MajorDefensives/MajorDefensiveAnalyzer';
import { MitigationTooltipSegment } from 'interface/guide/components/MajorDefensives/MitigationSegments';
import PassFailBar from 'interface/guide/components/PassFailBar';
import { PerformanceBoxRow } from 'interface/guide/components/PerformanceBoxRow';
import { Highlight } from 'interface/Highlight';
import { AbilityEvent, HasAbility, HasSource } from 'parser/core/Events';
import { PerformanceUsageRow } from 'parser/core/SpellUsage/core';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import { encodeTargetString } from 'parser/shared/modules/Enemies';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { useCallback, useState } from 'react';
import { useMaxMitigationValue } from './Timeline';

const MissingCastBoxEntry = {
  value: QualitativePerformance.Fail,
  tooltip: (
    <PerformanceUsageRow>
      <PerformanceMark perf={QualitativePerformance.Fail} /> 潜在的施法未使用
    </PerformanceUsageRow>
  ),
};

const PossibleMissingCastBoxEntry = {
  value: QualitativePerformance.Ok,
  tooltip: (
    <PerformanceUsageRow>
      <PerformanceMark perf={QualitativePerformance.Ok} />{' '}
      潜在的施法未使用，但可能故意保留以应对某些机制。
    </PerformanceUsageRow>
  ),
};

export const NoData = styled.div`
  color: #999;
`;

const CooldownUsageDetailsContainer = styled.div`
  display: grid;
  grid-template-rows: max-content max-content 1fr;
`;

export const TableSegmentContainer = styled.td`
  line-height: 1em;
  height: 1em;
  min-width: 100px;

  ${MitigationTooltipSegment} {
    margin-top: 0.1em;
    height: 1em;
  }
`;

export const SmallPassFailBar = styled(PassFailBar)`
  width: 100px;
  min-width: 100px;
`;

export const NumericColumn = styled.td`
  text-align: right;
`;

export const CooldownDetailsContainer = styled.div`
  display: grid;
  margin-top: 1rem;
  grid-template-areas: 'talent source';
  grid-template-columns: max-content 1fr;

  gap: 1rem;
  height: 100%;
  align-items: start;
  justify-content: space-between;

  ${NoData} {
    justify-self: center;
    align-self: center;
    grid-column: 1 / -1;
  }

  & > table {
    width: 100%;
  }
  & > table td {
    padding-right: 1rem;

    &:first-of-type {
      max-width: 14em;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

export type CooldownDetailsProps = {
  analyzer: MajorDefensive<any, any>;
  mit?: Mitigation;
};

const CooldownDetails = ({ analyzer, mit }: CooldownDetailsProps) => {
  if (!mit) {
    return (
      <CooldownDetailsContainer>
        <NoData>点击施法分解中的一个框以查看详细信息。</NoData>
      </CooldownDetailsContainer>
    );
  }

  return (
    <CooldownDetailsContainer>
      <BreakdownByTalent analyzer={analyzer} mit={mit} />
      <BreakdownByDamageSource mit={mit} />
    </CooldownDetailsContainer>
  );
};

const BreakdownByTalent = ({ analyzer, mit }: Required<CooldownDetailsProps>) => {
  const segments = analyzer.mitigationSegments(mit);

  const maxValue = Math.max(analyzer.firstSeenMaxHp, mit.amount, mit.maxAmount ?? 0);

  return (
    <table>
      <tbody>
        <tr>
          <td>总减免伤害</td>
          <NumericColumn>{formatNumber(mit.amount)}</NumericColumn>
          <td>
            <SmallPassFailBar
              pass={mit.amount}
              total={analyzer.firstSeenMaxHp}
              passTooltip="相对于最大生命值的减免伤害量"
            />
          </td>
        </tr>
        {mit.maxAmount && (
          <tr>
            <td>{analyzer.maxMitigationDescription()}</td>
            <NumericColumn>{formatNumber(mit.maxAmount)}</NumericColumn>
            <TableSegmentContainer>
              <MitigationTooltipSegment
                color="rgba(255, 255, 255, 0.25)"
                maxWidth={100}
                width={mit.maxAmount / maxValue}
              />
            </TableSegmentContainer>
          </tr>
        )}
        <tr>
          <td colSpan={3}>
            <strong>按天赋减免</strong>
          </td>
        </tr>
        {segments.map((seg, ix) => (
          <tr key={ix}>
            <td>{seg.description}</td>
            <NumericColumn>{formatNumber(seg.amount)}</NumericColumn>
            <TableSegmentContainer>
              {ix > 0 && (
                <MitigationTooltipSegment
                  color="rgba(255, 255, 255, 0.05)"
                  maxWidth={100}
                  width={segments.slice(0, ix).reduce((a, b) => a + b.amount, 0) / maxValue}
                />
              )}
              <MitigationTooltipSegment
                color={seg.color}
                width={seg.amount / maxValue}
                maxWidth={100}
              />
              {ix < segments.length - 1 && (
                <MitigationTooltipSegment
                  color="rgba(255, 255, 255, 0.05)"
                  maxWidth={100}
                  width={segments.slice(ix + 1).reduce((a, b) => a + b.amount, 0) / maxValue}
                />
              )}
            </TableSegmentContainer>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const BreakdownByDamageSource = ({ mit }: Pick<Required<CooldownDetailsProps>, 'mit'>) => {
  const damageTakenBreakdown = damageBreakdown(
    mit.mitigated,
    (event) => (HasAbility(event.event) ? event.event.ability.guid : 0),
    (event) => (HasSource(event.event) ? encodeTargetString(event.event.sourceID) : '0'),
  );

  const splitMelees = (damageTakenBreakdown.get(1)?.size ?? 0) > 1;
  const damageTakenRows = Array.from(damageTakenBreakdown.entries())
    .flatMap(([id, bySource]): [number, MitigatedEvent[]][] => {
      if (id === 1 && splitMelees) {
        // 将每个近战源独立作为一行
        return Array.from(bySource.values()).map((events) => [id, events]);
      } else {
        // 将所有事件放入一个列表
        return [[id, Array.from(bySource.values()).flat()]];
      }
    })
    .sort(([, eventsA], [, eventsB]) => {
      const totalA = eventsA.reduce((a, b) => a + b.mitigatedAmount, 0);
      const totalB = eventsB.reduce((a, b) => a + b.mitigatedAmount, 0);

      return totalB - totalA;
    })
    // 限制为前5个伤害来源
    .slice(0, 5);

  const maxDamageTaken = Math.max.apply(
    null,
    damageTakenRows.map(([, events]) => events.reduce((a, b) => a + b.mitigatedAmount, 0)),
  );

  return (
    <table>
      <tbody>
        <tr>
          <td colSpan={3}>
            <strong>按伤害来源减免</strong>
          </td>
        </tr>
        {damageTakenRows.map(([spellId, events], ix) => {
          const keyEvent = events.find(({ event }) => HasAbility(event))?.event as
            | AbilityEvent<any>
            | undefined;

          if (!keyEvent) {
            return null;
          }

          const rowColor = color(keyEvent.ability.type);

          const mitigatedAmount = events.reduce((a, b) => a + b.mitigatedAmount, 0);

          return (
            <tr key={ix}>
              <td style={{ width: '1%' }}>
                <DamageSourceLink showSourceName={spellId === 1 && splitMelees} event={keyEvent} />
              </td>
              <NumericColumn>{formatNumber(mitigatedAmount)}</NumericColumn>
              <TableSegmentContainer>
                <MitigationTooltipSegment
                  color={rowColor}
                  width={mitigatedAmount / maxDamageTaken}
                />
              </TableSegmentContainer>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const CooldownUsage = ({
  analyzer,
  maxValue,
  cooldownDetails: Details,
  showTitles = false,
}: {
  analyzer: MajorDefensive<any, any>;
  maxValue: number;
  cooldownDetails: (props: CooldownDetailsProps) => JSX.Element | null;
  showTitles?: boolean;
}) => {
  const [selectedMit, setSelectedMit] = useState<number | undefined>();
  const castEfficiency = useAnalyzer(CastEfficiency)?.getCastEfficiencyForSpell(analyzer.spell);
  const possibleUses = castEfficiency?.maxCasts ?? 0;
  const performance = analyzer.mitigationPerformance(maxValue);
  const actualCasts = performance.length;

  if (actualCasts === 0 && possibleUses > 1) {
    // 如果没有施放，并且可能多次施放，则将所有可能的使用情况标记为糟糕
    //
    // possibleUses > 1 的检查排除了在非常短的战斗（如早期团灭）中发生这种情况
    for (let i = 0; i < possibleUses; i += 1) {
      performance.push(MissingCastBoxEntry);
    }
  } else {
    // 如果至少施放了一次，有一定的容忍度。最多一半（四舍五入）
    // 可能的施法次数将为黄色，超过的将为红色。
    for (let i = possibleUses; i > actualCasts; i -= 1) {
      if (i > possibleUses / 2) {
        performance.push(PossibleMissingCastBoxEntry);
      } else {
        performance.push(MissingCastBoxEntry);
      }
    }
  }

  const mitigations = analyzer.mitigations;

  const onClickBox = useCallback(
    (index) => {
      if (index >= mitigations.length) {
        setSelectedMit(undefined);
      } else {
        setSelectedMit(index);
      }
    },
    [mitigations.length],
  );

  return (
    <SubSection title={showTitles ? analyzer.spell.name : undefined}>
      <ExplanationRow>
        <Explanation>{analyzer.description()}</Explanation>
        <CooldownUsageDetailsContainer>
          <div>
            <strong>施法分解</strong>{' '}
            <small>
              - 这些框代表每次施法，颜色代表减免的伤害量。未使用的施法也会显示为{' '}
              <TooltipElement content="用于可能跳过以应对重大伤害事件的施法。">
                <Highlight color={OkColor} textColor="black">
                  黄色
                </Highlight>
              </TooltipElement>{' '}
              或{' '}
              <TooltipElement content="用于未使用但不会影响其他使用情况的施法。">
                <Highlight color={BadColor} textColor="white">
                  红色
                </Highlight>
              </TooltipElement>
              。
            </small>
          </div>
          <PerformanceBoxRow
            values={performance.map((p, ix) =>
              ix === selectedMit ? { ...p, className: 'selected' } : p,
            )}
            onClickBox={onClickBox}
          />
          <Details
            mit={selectedMit !== undefined ? mitigations[selectedMit] : undefined}
            analyzer={analyzer}
          />
        </CooldownUsageDetailsContainer>
      </ExplanationRow>
    </SubSection>
  );
};

type Props = {
  analyzers: readonly MajorDefensive<any, any>[];
  showTitles?: boolean;
};

const AllCooldownUsageList = ({ analyzers, showTitles }: Props) => {
  const maxValue = useMaxMitigationValue(analyzers);
  return (
    <div>
      {analyzers
        .filter((analyzer) => analyzer.active)
        .map((analyzer) => (
          <CooldownUsage
            key={analyzer.constructor.name}
            showTitles={showTitles}
            analyzer={analyzer}
            maxValue={maxValue}
            cooldownDetails={analyzer.cooldownDetailsComponent ?? CooldownDetails}
          />
        ))}
    </div>
  );
};

export default AllCooldownUsageList;
