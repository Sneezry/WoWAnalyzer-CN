import { Trans } from '@lingui/macro';
import Spell from 'common/SPELLS/Spell';
import { SpellLink } from 'interface';
import { useAnalyzer, useInfo } from 'interface/guide';
import { AnyEvent } from 'parser/core/Events';
import {
  Apl,
  CheckResult,
  InternalRule,
  isRuleEqual,
  spells,
  TargetType,
  Tense,
  Violation,
} from 'parser/shared/metrics/apl';
import { ConditionDescription } from 'parser/shared/metrics/apl/annotate';
import Enemies from 'parser/shared/modules/Enemies';
import useTooltip from 'interface/useTooltip';
import Combatants from 'parser/shared/modules/Combatants';
import { useLingui } from '@lingui/react';

export type AplProblemData<T> = {
  claims: Set<Violation>;
  data: T;
};

export type ViolationExplainer<T> = {
  /**
   * 检查APL检查结果并生成问题列表，每个问题声称检测到了一些错误。
   */
  claim: (apl: Apl, result: CheckResult) => Array<AplProblemData<T>>;
  /**
   * 渲染所有问题的总体说明。
   *
   * 这是在指南中的“最常见问题”部分显示的内容。
   */
  render: (problem: AplProblemData<T>, apl: Apl, result: CheckResult) => JSX.Element;
  /**
   * 渲染单个违规行为的描述。哪里做错了？应该如何更改？
   *
   * 这是在指南的时间轴旁边显示的内容。
   */
  describe: (props: { apl: Apl; violation: Violation; result: CheckResult }) => JSX.Element | null;
};

export type AplViolationExplainers = Record<string, ViolationExplainer<any>>;

export const minClaimCount = (result: CheckResult): number =>
  Math.min(10, Math.floor((result.successes.length + result.violations.length) / 20));

/**
 * 过滤掉无意义或低价值的解释的有用默认值。要求至少认定10个违规行为，且规则相关事件中至少40％为违规。
 */
const defaultClaimFilter = (
  result: CheckResult,
  rule: InternalRule,
  claims: Set<Violation>,
): boolean => {
  const successes = result.successes.filter((suc) => isRuleEqual(suc.rule, rule)).length;

  return claims.size > minClaimCount(result) && claims.size / (successes + claims.size) > 0.4;
};

function TargetName({ event }: { event: AnyEvent }) {
  const combatants = useAnalyzer(Enemies);
  const friendlies = useAnalyzer(Combatants);
  const { npc: npcTooltip } = useTooltip();
  const { i18n } = useLingui();

  if (!combatants) {
    return null;
  }

  const enemy = combatants.getEntity(event);
  const friendly = friendlies?.getEntity(event);
  if (!enemy && friendly) {
    const className = friendly.spec?.className ? i18n._(friendly.spec.className) : undefined;
    return <span className={className}>{friendly.name}</span>;
  } else if (enemy && !friendly) {
    return <a href={npcTooltip(enemy.guid)}>{enemy.name}</a>;
  }
  return <span className="spell-link-text">未知</span>;
}

function EventTimestamp({ event }: { event: AnyEvent }) {
  const info = useInfo();

  if (!info) {
    return null;
  }

  const relTime = (event.timestamp - info.fightStart) / 1000;

  const minutes = Math.floor(relTime / 60);
  const seconds = Math.round(relTime % 60);

  return (
    <strong>
      {minutes > 0 ? `${minutes}分钟 ` : ''}
      {seconds}秒
    </strong>
  );
}

export const ActualCastDescription = ({
  event,
  omitTarget,
}: {
  event: Violation['actualCast'];
  omitTarget?: boolean;
}) => (
  <>
    在战斗开始后 <EventTimestamp event={event} /> 时，你施放了{' '}
    <SpellLink spell={event.ability.guid} />
    {!omitTarget && (event.targetID ?? 0) > 0 && (
      <>
        {' '}
        对 <TargetName event={event} />
      </>
    )}
  </>
);

const overcastFillers: ViolationExplainer<InternalRule> = {
  claim: (apl, result) => {
    // 仅查找目标为单一法术的无条件规则，且在APL的底部1/3部分
    //
    // 此代码具有与填充法术相关的特定文本，因此不希望意外捕获APL顶部的法术
    const unconditionalRules = apl.rules.filter(
      (rule, index) =>
        rule.condition === undefined &&
        rule.spell.type === TargetType.Spell &&
        index >= (2 * apl.rules.length) / 3,
    );
    const claimsByRule: Map<InternalRule, Set<Violation>> = new Map();

    result.violations.forEach((violation) => {
      const actualSpellId = violation.actualCast.ability.guid;
      const fillerRule = unconditionalRules.find((rule) =>
        spells(rule).some((spell) => spell.id === actualSpellId),
      );
      if (fillerRule) {
        const claims = claimsByRule.get(fillerRule) ?? new Set();
        claims.add(violation);
        if (!claimsByRule.has(fillerRule)) {
          claimsByRule.set(fillerRule, claims);
        }
      }
    });

    return Array.from(claimsByRule.entries())
      .filter(([rule, claims]) => defaultClaimFilter(result, rule, claims))
      .map(([rule, claims]) => ({ claims, data: rule }));
  },
  render: (claim) => (
    <Trans id="guide.apl.overcastFillers">
      你经常在有更重要的法术可用时施放了 <SpellLink spell={spells(claim.data)[0].id} />。
    </Trans>
  ),
  describe: ({ violation }) => (
    <>
      <p>
        <ActualCastDescription event={violation.actualCast} />。
      </p>
      <p>
        这是一个低优先级的填充法术。你应该施放更高优先级的法术，如{' '}
        <SpellLink spell={violation.expectedCast[0].id} />。
      </p>
    </>
  ),
};

const droppedRule: ViolationExplainer<{ rule: InternalRule; spell: Spell }> = {
  claim: (_apl, result) => {
    const claimsByRule: Map<InternalRule, Set<Violation>> = new Map();

    result.violations.forEach((violation) => {
      const claims = claimsByRule.get(violation.rule) ?? new Set();
      claims.add(violation);

      if (!claimsByRule.has(violation.rule)) {
        claimsByRule.set(violation.rule, claims);
      }
    });

    return (
      Array.from(claimsByRule.entries())
        // 这个代码块将多法术规则拆分为各自的法术，以使结果更为具体
        // 例如，“施放碎颅酒或劈酒”规则将拆分为：
        //
        // - 你经常跳过施放碎颅酒
        // - 你经常跳过施放劈酒
        //
        // 但是每个法术都会单独处理，因此如果你擅长施放劈酒而不是碎颅酒，你只会看到关于碎颅酒的提示
        .flatMap(([rule, claims]) => {
          if (rule.spell.type === TargetType.Spell) {
            return [{ rule, claims, spell: rule.spell.target }];
          } else {
            const bySpell: Map<number, Set<Violation>> = new Map();
            for (const claim of claims) {
              for (const spell of claim.expectedCast) {
                const targetSet = bySpell.get(spell.id) ?? new Set();
                targetSet.add(claim);
                if (!bySpell.has(spell.id)) {
                  bySpell.set(spell.id, targetSet);
                }
              }
            }

            const spells = rule.spell.target as Spell[];
            const spellIds = spells.map((spell) => spell.id);

            return Array.from(bySpell.entries())
              .sort(([spellA], [spellB]) => spellIds.indexOf(spellB) - spellIds.indexOf(spellA))
              .map(([spellId, claims]) => ({
                rule,
                claims,
                spell: spells.find((spell) => spell.id === spellId)!,
              }));
          }
        })
        .filter(({ rule, claims }) => defaultClaimFilter(result, rule, claims))
        .map(({ rule, spell, claims }) => ({ claims, data: { rule, spell } }))
    );
  },
  render: (claim) => (
    <Trans id="guide.apl.droppedRule">
      你经常跳过施放 <SpellLink spell={claim.data.spell.id} />
      {claim.data.rule.condition && (
        <>
          {' '}
          <ConditionDescription prefix="当" rule={claim.data.rule} tense={Tense.Past} />
        </>
      )}
      。
    </Trans>
  ),
  describe: ({ violation }) => (
    <>
      <p>
        <ActualCastDescription event={violation.actualCast} />。
      </p>
      <p>
        {violation.rule.condition ? (
          <>
            <ConditionDescription prefix="由于" rule={violation.rule} tense={Tense.Past} />
            ，你{' '}
          </>
        ) : (
          '你 '
        )}
        应该施放 <SpellLink spell={violation.expectedCast[0].id} />。
      </p>
    </>
  ),
};

export const defaultExplainers: AplViolationExplainers = {
  overcastFillers,
  droppedRule,
};
