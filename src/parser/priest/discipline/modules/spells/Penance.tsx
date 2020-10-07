import React from 'react';

import SPELLS from 'common/SPELLS';
import Analyzer from 'parser/core/Analyzer';
import Statistic from 'interface/statistics/Statistic';
import BoringSpellValue from 'interface/statistics/components/BoringSpellValue';
import EventGrouper from 'parser/core/EventGrouper';
import STATISTIC_ORDER from 'interface/others/STATISTIC_ORDER';
import SpellLink from 'common/SpellLink';
import { DamageEvent, HealEvent } from 'parser/core/Events';

const PENANCE_MINIMUM_RECAST_TIME = 3500; // Minimum duration from one Penance to Another

class Penance extends Analyzer {
  _boltCount = 3;
  hits = 0;
  eventGrouper: EventGrouper = new EventGrouper(PENANCE_MINIMUM_RECAST_TIME);

  constructor(options: Options) {
    super(options);

    // Castigation Penance bolt count to 4 (from 3)
    this._boltCount = this.selectedCombatant.hasTalent(SPELLS.CASTIGATION_TALENT.id) ? 4 : 3;
  }

  static isPenance = (spellId: number) =>
    spellId === SPELLS.PENANCE.id || spellId === SPELLS.PENANCE_HEAL.id || spellId === SPELLS.PENANCE_CAST.id;

  get missedBolts(): number {
    // @ts-ignore
    return [...this.eventGrouper].reduce(
      (missedBolts: any, cast: any) => missedBolts + (this._boltCount - cast.length),
      0,
    );
  }

  get casts() {
    return [...this.eventGrouper].length;
  }

  get currentBoltNumber() {
    // @ts-ignore
    return [...this.eventGrouper].slice(-1)[0].length - 1; // -1 here for legacy code
  }

  on_byPlayer_damage(event: DamageEvent) {
    if (!Penance.isPenance(event.ability.guid)) {
      return;
    }

    this.eventGrouper.processEvent(event);

    (event as PenanceDamageEvent).penanceBoltNumber = this.currentBoltNumber;
  }

  on_byPlayer_heal(event: HealEvent) {
    if (!Penance.isPenance(event.ability.guid)) {
      return;
    }

    this.eventGrouper.processEvent(event);

    (event as PenanceHealEvent).penanceBoltNumber = this.currentBoltNumber;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(13)}
        size="small"
        tooltip={(
          <>
            Each <SpellLink id={SPELLS.PENANCE.id} /> cast has 3 bolts (4 if you're using <SpellLink id={SPELLS.CASTIGATION_TALENT.id} />). You should try to let this channel finish as much as possible. You channeled Penance {this.casts} times.
          </>
        )}
      >
        <BoringSpellValue
          spell={SPELLS.PENANCE}
          value={this.missedBolts}
          label={(
            <>
              Wasted <SpellLink id={SPELLS.PENANCE.id} /> bolts
            </>
          )}
        />
      </Statistic>
    );
  }
}

export function IsPenanceDamageEvent(event: DamageEvent): event is PenanceDamageEvent {
  return (event as PenanceDamageEvent).penanceBoltNumber !== undefined;
}

export interface PenanceDamageEvent extends DamageEvent {
  penanceBoltNumber: number;
}

export function IsPenanceHealEvent(event: HealEvent): event is PenanceHealEvent {
  return (event as PenanceHealEvent).penanceBoltNumber !== undefined;
}

export interface PenanceHealEvent extends HealEvent {
  penanceBoltNumber: number;
}

export default Penance;
