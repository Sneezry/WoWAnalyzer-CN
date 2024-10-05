import SPELLS from 'common/SPELLS/thewarwithin/others';
import Analyzer, { SELECTED_PLAYER, Options } from 'parser/core/Analyzer';
import Events, { ApplyBuffEvent } from 'parser/core/Events';
import SUGGESTION_IMPORTANCE from 'parser/core/ISSUE_IMPORTANCE';
import { When, ThresholdStyle } from 'parser/core/ParseResults';

const AUGMENT_RUNE_ID = SPELLS.CRYSTALLIZED_AUGMENT_RUNE.id;
// “内战”还没有永久增强符文
// const ETERNAL_AUGMENT_RUNE_ID = SPELLS.ETERNAL_AUGMENT_RUNE.id;

class AugmentRuneChecker extends Analyzer {
  startFightWithAugmentRuneUp = false;

  constructor(options: Options) {
    super(options);
    this.addEventListener(Events.applybuff.to(SELECTED_PLAYER), this.onApplybuff.bind(this));
  }

  onApplybuff(event: ApplyBuffEvent) {
    const spellId = event.ability.guid;
    if (AUGMENT_RUNE_ID === spellId /*|| ETERNAL_AUGMENT_RUNE_ID === spellId*/ && event.prepull) {
      this.startFightWithAugmentRuneUp = true;
    }
  }
  get augmentRuneSuggestionThresholds() {
    return {
      actual: this.startFightWithAugmentRuneUp,
      isEqual: false,
      style: ThresholdStyle.BOOLEAN,
    };
  }
  suggestions(when: When) {
    when(this.augmentRuneSuggestionThresholds).addSuggestion((suggest) =>
      suggest('你在战斗前没有使用增强符文。使用增强符文可以提高你的主要属性。')
        .icon(SPELLS.CRYSTALLIZED_AUGMENT_RUNE.icon)
        .staticImportance(SUGGESTION_IMPORTANCE.MINOR),
    );
  }
}

export default AugmentRuneChecker;
