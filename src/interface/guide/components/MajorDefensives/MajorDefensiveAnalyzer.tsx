import styled from '@emotion/styled';
import { formatDuration, formatNumber } from 'common/format';
import Spell from 'common/SPELLS/Spell';
import MAGIC_SCHOOLS, { color } from 'game/MAGIC_SCHOOLS';
import SpellLink from 'interface/SpellLink';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import EventFilter from 'parser/core/EventFilter';
import Events, {
  AbilityEvent,
  HasSource,
  HasTarget,
  AnyEvent,
  DamageEvent,
  FightEndEvent,
  ResourceActor,
  EventType,
} from 'parser/core/Events';
import { PerformanceUsageRow } from 'parser/core/SpellUsage/core';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { ReactNode } from 'react';
import { BoxRowEntry } from '../PerformanceBoxRow';
import { MitigationSegment, MitigationSegments } from './MitigationSegments';
import { PerformanceMark } from 'interface/guide';
import { encodeTargetString } from 'parser/shared/modules/Enemies';
import { CooldownDetailsProps } from './AllCooldownUsagesList';

/**
 * 防御触发器的设置。你可能希望使用 `buff` 或 `debuff` 而不是自己使用这个类，但如果你有一个不使用buff/debuff的特殊防御技能，你可能需要这个。
 */
type DefensiveTrigger<Apply extends EventType, Remove extends EventType> = {
  applyTrigger: EventFilter<Apply>;
  removeTrigger: EventFilter<Remove>;
  trackOn: ResourceActor;
  isMatchingApply: (event: AbilityEvent<any>) => boolean;
};

/**
 * 为 `MajorDefensiveBuff` 构造触发器设置。
 *
 * 传递的法术应该是实际施加在玩家身上的那个，而不是施放的那个。是的，这两个法术有时是不同的。
 */
export const buff = (
  buffSpell: Spell,
): DefensiveTrigger<EventType.ApplyBuff, EventType.RemoveBuff> => ({
  applyTrigger: Events.applybuff.spell(buffSpell).by(SELECTED_PLAYER),
  removeTrigger: Events.removebuff.spell(buffSpell).by(SELECTED_PLAYER),
  trackOn: ResourceActor.Source,
  isMatchingApply: (event) =>
    event.type === EventType.ApplyBuff && event.ability.guid === buffSpell.id,
});

/**
 * 为 `MajorDefensiveDebuff` 构造触发器设置。
 *
 * 传递的法术应该是施加在目标身上的，而不是施放的那个。是的，这两个法术有时是不同的。
 */
export const debuff = (
  buffSpell: Spell,
): DefensiveTrigger<EventType.ApplyDebuff, EventType.RemoveDebuff> => ({
  applyTrigger: Events.applydebuff.spell(buffSpell).by(SELECTED_PLAYER),
  removeTrigger: Events.removedebuff.spell(buffSpell).by(SELECTED_PLAYER),
  trackOn: ResourceActor.Target,
  isMatchingApply: (event) =>
    event.type === EventType.ApplyDebuff && event.ability.guid === buffSpell.id,
});

/**
 * 减免事件。通常 `event` 字段是一个 `DamageEvent`，但有时它可以是其他类型的事件（如 `AbsorbedEvent` 或 `HealEvent`）。
 */
export type MitigatedEvent = {
  event: AnyEvent;
  mitigatedAmount: number;
};

/**
 * 单个减免窗口。可能是 buff/debuff（或其他？）。包含总共减免的伤害量以及减免的事件。
 *
 * 为了方便起见，类型默认设置为 `any`，这样你可以仅使用 `Mitigation`，因为它经常出现并且你几乎不需要了解开始/结束类型（通常只需要时间戳）。
 */
export type Mitigation<Apply extends EventType = any, Remove extends EventType = any> = {
  start: AnyEvent<Apply>;
  end: AnyEvent<Remove> | FightEndEvent;
  mitigated: MitigatedEvent[];
  amount: number;
  /**
   * 对于具有最大减免量的效果（如吸收盾），此字段表示可以减免的最大总量。如果没有最大值（如大多数减伤效果），则应省略此字段。
   */
  maxAmount?: number;
};

type InProgressMitigation<Apply extends EventType, Remove extends EventType> = Pick<
  Mitigation<Apply, Remove>,
  'start' | 'mitigated' | 'maxAmount'
>;

/**
 * 计算百分比减伤效果的绝对减免伤害量。
 * 例如：对于一个50%的减伤冷却技能，你可以调用 `absoluteMitigation(event, 0.5)`。
 */
export function absoluteMitigation(event: DamageEvent, mitPct: number): number {
  const actualAmount = event.amount + (event.absorbed ?? 0) + (event.overkill ?? 0);
  const priorAmount = actualAmount * (1 / (1 - mitPct));
  return priorAmount - actualAmount;
}

/**
 * 设置 `MitigationRow` 的默认大小。
 *
 * 除非你自己渲染 `MitigationRow`，否则你可能不需要这个。
 */
export const MitigationRowContainer = styled.div`
  display: grid;
  grid-template-columns: 2em 2em 100px;
  gap: 1em;
  align-items: center;

  line-height: 1em;
  text-align: right;

  padding-bottom: 0.5em;
`;

/**
 * 显示持续时间和减免量的行，附带 `MitigationSegments`。
 *
 * `MitigationRowContainer` 组件用于在大多数情况下适当调整大小。
 */
export const MitigationRow = ({
  mitigation,
  segments,
  maxValue,
  fightStart,
}: {
  mitigation: Mitigation<any, any>;
  segments: MitigationSegment[];
  maxValue: number;
  fightStart: number;
}) => {
  return (
    <MitigationRowContainer>
      <div>{formatDuration(mitigation.start.timestamp - fightStart)}</div>
      <div>{formatNumber(mitigation.amount)}</div>
      <MitigationSegments segments={segments} maxValue={maxValue} />
    </MitigationRowContainer>
  );
};

/**
 * 一个主要防御冷却技能的分析器，用于跟踪减免的总伤害量。
 *
 * 虽然这适用于短冷却时间，但它主要用于长冷却时间的技能，如2分钟以上的减伤技能。
 *
 * 你可能希望继承 `MajorDefensiveBuff` 或 `MajorDefensiveDebuff` 来自动设置类型参数，而不是直接使用这个类。
 *
 * ## 使用说明
 *
 * 要实现一个基本的“减少X%所受伤害”的冷却技能，可以按以下步骤进行：
 *
 * 1. 继承 `MajorDefensiveBuff` 或 `MajorDefensiveDebuff`（如果你需要自定义，则继承此类）。
 * 2. 使用法术和触发器设置调用构造函数，并传入选项。
 * 3. 添加伤害事件监听器，在处理程序中调用 `this.recordMitigation`，如果 `this.defensiveActive(event)` 为 `true`。你可以使用 `absoluteMitigation` 帮助函数来计算减免的伤害量。
 *
 * 如果你正在处理一个天赋冷却技能，记得自己检查 `hasTalent`！
 *
 * ## 示例
 *
 * 酒仙僧的“禅意冥想”是最简单的防御Buff之一，适合处理不太复杂的技能（例如，开始/结束容易检测，减少所有伤害的固定百分比）。
 *
 * 如果你需要更复杂的示例，酒仙僧的“壮胆酒”模块有多个减伤来源（壮胆酒本身，加上净化酿造的增加贡献）。
 *
 * 如果你正在处理Debuff而不是Buff，请查看复仇恶魔猎手的“炽热烙印”实现。
 */
export default class MajorDefensive<
  Apply extends EventType,
  Remove extends EventType,
> extends Analyzer {
  private currentMitigations: Map<string, InProgressMitigation<Apply, Remove>>;

  private mitigationData: Mitigation<Apply, Remove>[] = [];
  private readonly trackOn: ResourceActor;

  public readonly appliesToEvent: DefensiveTrigger<Apply, Remove>['isMatchingApply'];
  public readonly spell: Spell;

  constructor(
    displaySpell: Spell,
    { trackOn, applyTrigger, removeTrigger, isMatchingApply }: DefensiveTrigger<Apply, Remove>,
    options: Options,
  ) {
    super(options);

    this.appliesToEvent = isMatchingApply;
    this.spell = displaySpell;
    this.currentMitigations = new Map();
    this.trackOn = trackOn;

    this.addEventListener(applyTrigger, this.onApply);
    this.addEventListener(removeTrigger, this.onRemove);
    this.addEventListener(Events.fightend, this.onEnd);
  }

  /**
   * 获取buff/debuff目标的映射键。
   */
  protected getBuffTarget(event: AnyEvent<Apply> | AnyEvent<Remove>): string | undefined {
    if (HasTarget(event)) {
      return encodeTargetString(event.targetID, event.targetInstance);
    } else {
      return undefined;
    }
  }

  /**
   * 获取减免事件的映射键。如果这是一个buff，我们获取目标。如果是debuff，我们获取来源。
   */
  protected getKeyForMitigation(event: AnyEvent): string | undefined {
    if (this.trackOn === ResourceActor.Source && HasTarget(event)) {
      return encodeTargetString(event.targetID, event.targetInstance);
    } else if (this.trackOn === ResourceActor.Target && HasSource(event)) {
      return encodeTargetString(event.sourceID, event.sourceInstance);
    } else {
      return undefined;
    }
  }

  protected recordMitigation(mitigation: MitigatedEvent) {
    const key = this.getKeyForMitigation(mitigation.event);
    key && this.currentMitigations.get(key)?.mitigated.push(mitigation);
  }

  /**
   * 设置施法可以减免的最大量。
   */
  protected setMaxMitigation(event: AnyEvent, amount: number): void {
    const key = this.getKeyForMitigation(event);
    const current = key && this.currentMitigations.get(key);
    if (current) {
      current.maxAmount = amount;
    }
  }

  protected defensiveActive(event: AnyEvent): boolean {
    const key = this.getKeyForMitigation(event);

    if (!key) {
      return false;
    }

    return this.currentMitigations.has(key);
  }

  private onApply(event: AnyEvent<Apply>) {
    const target = this.getBuffTarget(event);
    if (!target) {
      console.warn('无法确定主要防御分析器的目标', this.spell, event);
      return;
    }
    this.currentMitigations.set(target, {
      start: event,
      mitigated: [],
    });
  }

  private onRemove(event: AnyEvent<Remove>) {
    const target = this.getBuffTarget(event);
    const current = target && this.currentMitigations.get(target);
    if (!current) {
      // 没有应用，无法操作。可能正在查看日志的一部分。
      return;
    }

    this.mitigationData.push({
      ...current,
      end: event,
      amount: current.mitigated.map((event) => event.mitigatedAmount).reduce((a, b) => a + b, 0),
    });

    this.currentMitigations.delete(target);
  }

  private onEnd(event: FightEndEvent) {
    for (const current of this.currentMitigations.values()) {
      this.mitigationData.push({
        ...current,
        end: event,
        amount: current.mitigated.map((event) => event.mitigatedAmount).reduce((a, b) => a + b, 0),
      });
    }

    this.currentMitigations.clear();
  }

  get cooldownDetailsComponent():
    | ((props: CooldownDetailsProps) => JSX.Element | null)
    | undefined {
    return undefined;
  }

  get mitigations() {
    return this.mitigationData;
  }

  /**
   * 将 `Mitigation` 分解为一个或多个 `MitigationSegment`。
   *
   * 默认实现会给你一个捕获整个减免量的段。
   *
   * 如果你想做一些更复杂的事情（例如：显示从天赋获得的额外减免量），可以重写此方法。
   */
  mitigationSegments(mit: Mitigation<Apply, Remove>): MitigationSegment[] {
    return [
      {
        amount: mit.amount,
        color: color(MAGIC_SCHOOLS.ids.PHYSICAL),
        description: <SpellLink spell={this.spell} />,
      },
    ];
  }

  /**
   * 获取玩家的首次最大生命值。
   *
   * 这是用于在不同等级之间相对稳健地标准化性能数据的方法。
   */
  get firstSeenMaxHp(): number {
    return (
      this.owner.eventHistory.find(
        (event): event is AnyEvent & { maxHitPoints: number } =>
          'maxHitPoints' in event &&
          event.resourceActor === ResourceActor.Target &&
          event.targetID === this.selectedCombatant.id,
      )?.maxHitPoints ?? 1
    );
  }

  explainPerformance(mit: Mitigation<Apply, Remove>): {
    perf: QualitativePerformance;
    explanation?: ReactNode;
  } {
    if (this.firstSeenMaxHp <= mit.amount) {
      return {
        perf: QualitativePerformance.Perfect,
        explanation: '使用减免了超过100%的生命值',
      };
    }

    if (this.firstSeenMaxHp / 4 > mit.amount) {
      return {
        perf: QualitativePerformance.Ok,
        explanation: '使用减免了少于25%的生命值',
      };
    }

    return { perf: QualitativePerformance.Good };
  }

  // TODO: 需要抽象化？
  /**
   * 在 `AllCooldownUsagesList` 中显示的描述。
   */
  description(): ReactNode {
    return <>待补充</>;
  }

  maxMitigationDescription(): ReactNode {
    return <>最大减免量</>;
  }

  /**
   * 为减免技能的每次使用生成 `BoxRowEntry`。
   *
   * 如果你想过滤或自定义条目，可以重写此方法。
   */
  mitigationPerformance(maxValue: number): BoxRowEntry[] {
    return this.mitigationData.map((mit) => {
      const { perf, explanation } = this.explainPerformance(mit);
      return {
        value: perf,
        tooltip: (
          <>
            <PerformanceUsageRow>
              <PerformanceMark perf={perf} /> {explanation ?? '良好使用'}
            </PerformanceUsageRow>
            <div>
              <MitigationRowContainer>
                <strong>时间</strong>
                <strong>减免量</strong>
              </MitigationRowContainer>
              <MitigationRow
                mitigation={mit}
                segments={this.mitigationSegments(mit)}
                fightStart={this.owner.fight.start_time}
                maxValue={maxValue}
                key={mit.start.timestamp}
              />
            </div>
          </>
        ),
      };
    });
  }
}

// 实际上是子类化，但在实践中这是设置类类型参数的唯一方法

/**
 * 预设类型为处理buff的 `MajorDefensive`。
 *
 * @see MajorDefensive 完整文档
 */
export class MajorDefensiveBuff extends MajorDefensive<EventType.ApplyBuff, EventType.RemoveBuff> {}

/**
 * 预设类型为处理debuff的 `MajorDefensive`。
 *
 * @see MajorDefensive 完整文档
 */
export class MajorDefensiveDebuff extends MajorDefensive<
  EventType.ApplyDebuff,
  EventType.RemoveDebuff
> {}
