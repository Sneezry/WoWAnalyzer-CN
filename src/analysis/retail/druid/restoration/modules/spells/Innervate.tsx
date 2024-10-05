import { formatNumber } from 'common/format';
import SPELLS from 'common/SPELLS';
import { SpellIcon, SpellLink } from 'interface';
import { PassFailCheckmark } from 'interface/guide';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import CASTS_THAT_ARENT_CASTS from 'parser/core/CASTS_THAT_ARENT_CASTS';
import Events, { CastEvent } from 'parser/core/Events';
import BoringValueText from 'parser/ui/BoringValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

import CooldownExpandable, {
  CooldownExpandableItem,
} from 'interface/guide/components/CooldownExpandable';
import { GUIDE_CORE_EXPLANATION_PERCENT } from 'analysis/retail/druid/restoration/Guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { abilityToSpell } from 'common/abilityToSpell';

// TODO 重新检查这个数值是否合理
const INNERVATE_MANA_REQUIRED = 7000;

class Innervate extends Analyzer {
  casts = 0;
  castsOnYourself = 0;
  manaSaved = 0;

  castTrackers: InnervateCast[] = [];

  constructor(options: Options) {
    super(options);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER), this.onCast);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.INNERVATE),
      this.onInnervate,
    );
  }

  onCast(event: CastEvent) {
    // 只关心消耗法力值的施法
    const manaEvent = event.rawResourceCost;
    if (manaEvent === undefined) {
      return;
    }

    // 已经在 `onInnervate` 中处理了激活的施放
    if (event.ability.guid === SPELLS.INNERVATE.id) {
      return;
    }

    // 如果是在激活期间施放的技能，记录施放的技能
    if (this.selectedCombatant.hasBuff(SPELLS.INNERVATE.id)) {
      if (!CASTS_THAT_ARENT_CASTS.includes(event.ability.guid) && this.castTrackers.length > 0) {
        // 我们至少需要跟踪所有在激活期间施放的技能，而不仅仅是消耗法力值的技能
        this.castTrackers[this.castTrackers.length - 1].casts.push(event);
      }

      // 检查技能是否消耗了法力值
      if (Object.keys(manaEvent).length !== 0) {
        const manaSavedFromThisCast = manaEvent[0];
        this.manaSaved += manaSavedFromThisCast;
        if (this.castTrackers.length > 0) {
          this.castTrackers[this.castTrackers.length - 1].manaSaved += manaSavedFromThisCast;
        }
      }
    }
  }

  onInnervate(event: CastEvent) {
    this.casts += 1;

    const castTracker: InnervateCast = {
      timestamp: event.timestamp,
      casts: [],
      manaSaved: 0,
    };
    this.castTrackers.push(castTracker);

    if (event.targetID === event.sourceID) {
      this.castsOnYourself += 1;
    } else {
      castTracker.targetId = event.targetID;
    }
  }

  get manaSavedPerInnervate() {
    if (this.casts === 0) {
      return 0;
    }
    return this.manaSaved / this.casts;
  }

  get guideCastBreakdown() {
    const explanation = (
      <p>
        <strong>
          <SpellLink spell={SPELLS.INNERVATE} />
        </strong>{' '}
        最好在你需要大量施法的时候使用，或者在准备使用多个高耗法术时使用。通常应在冷却好后立即使用。记得在激活期间施放一个野性成长，因为这是你最昂贵的法术之一。
      </p>
    );

    const data = (
      <div>
        <strong>每次施放的详细信息</strong>
        <small> - 点击展开</small>
        {this.castTrackers.map((cast, ix) => {
          const targetName = cast.targetId === undefined ? '自身' : '盟友';
          const metThresholdMana = cast.manaSaved >= INNERVATE_MANA_REQUIRED;
          const castWildGrowth =
            cast.casts.filter((c) => c.ability.guid === SPELLS.WILD_GROWTH.id).length > 0;
          const overallPerf =
            metThresholdMana && castWildGrowth
              ? QualitativePerformance.Good
              : QualitativePerformance.Fail;

          const header = (
            <>
              在 {this.owner.formatTimestamp(cast.timestamp)} &mdash;{' '}
              <SpellLink spell={SPELLS.INNERVATE} /> （节省了 {formatNumber(cast.manaSaved)}{' '}
              法力值）
            </>
          );

          const checklistItems: CooldownExpandableItem[] = [];
          checklistItems.push({
            label: '连续施放高耗法术',
            result: <PassFailCheckmark pass={metThresholdMana} />,
            details: <>(至少节省 {INNERVATE_MANA_REQUIRED} 法力值)</>,
          });
          checklistItems.push({
            label: (
              <>
                施放 <SpellLink spell={SPELLS.WILD_GROWTH} />
              </>
            ),
            result: <PassFailCheckmark pass={castWildGrowth} />,
          });

          const detailItems: CooldownExpandableItem[] = [];
          detailItems.push({
            label: '使用目标',
            result: '',
            details: <>{targetName}</>,
          });
          detailItems.push({
            label: '激活期间施放的法术',
            result: '',
            details: cast.casts.map((c, iix) => (
              <span key={iix}>
                <SpellIcon spell={abilityToSpell(c.ability)} />{' '}
              </span>
            )),
          });

          return (
            <CooldownExpandable
              header={header}
              checklistItems={checklistItems}
              detailItems={detailItems}
              perf={overallPerf}
              key={ix}
            />
          );
        })}
      </div>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT);
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(25)} // 固定顺序的统计信息编号
        size="flexible"
        category={STATISTIC_CATEGORY.GENERAL}
      >
        <BoringValueText
          label={
            <>
              <SpellIcon spell={SPELLS.INNERVATE} /> 平均节省法力值
            </>
          }
        >
          <>{formatNumber(this.manaSavedPerInnervate)}</>
        </BoringValueText>
      </Statistic>
    );
  }
}

interface InnervateCast {
  /** 激活施放的时间戳 */
  timestamp: number;
  /** 玩家在激活期间施放的法术 */
  casts: CastEvent[];
  /** 玩家节省的法力值 */
  manaSaved: number;
  /** 该激活施放在的目标玩家ID，为 undefined 表示对自身施放 */
  targetId?: number;
}

export default Innervate;
