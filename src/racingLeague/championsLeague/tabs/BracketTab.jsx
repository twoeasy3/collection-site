import { BRACKET } from '../data';
import { carImageUrl } from '../../shared/carImages';

const ROUND_NAMES = ['Quarterfinals', 'Semifinals', 'Final'];

function Entrant({ entrant, isWinner }) {
  return (
    <div className={`rl-bracket-entrant${isWinner ? ' rl-winner' : ''}`}>
      <img className="rl-thumb" src={carImageUrl(entrant.carImageId)} alt="" />
      <span className="rl-bracket-seed">#{entrant.seed}</span>
      <span className={`fi fi-${entrant.nationality}`} />
      <span>{entrant.name}</span>
      <span className="rl-bracket-source">{entrant.sourceShort}</span>
    </div>
  );
}

function BracketTab() {
  return (
    <div>
      <p className="rl-lede">
        Read left to right: quarterfinals decide the semifinalists, semifinals decide the
        finalists. The highlighted driver in each card won that duel.
      </p>

      <div className="rl-bracket">
        {BRACKET.rounds.map((round, ri) => (
          <div className="rl-bracket-round" key={ri}>
            <div className="rl-bracket-round-title">{ROUND_NAMES[ri]}</div>
            {round.map((match, mi) => (
              <div className="rl-bracket-match" key={mi}>
                <Entrant entrant={match.a} isWinner={match.winner.id === match.a.id} />
                <Entrant entrant={match.b} isWinner={match.winner.id === match.b.id} />
                <div className="rl-bracket-margin">{match.marginLabel}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BracketTab;
