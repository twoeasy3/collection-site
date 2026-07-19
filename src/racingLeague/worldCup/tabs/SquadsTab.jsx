import { SQUADS, QUALIFICATION_NOTE } from '../data';
import { carImageUrl } from '../../shared/carImages';

function SquadsTab() {
  const countries = Object.keys(SQUADS).sort((a, b) => SQUADS[b].length - SQUADS[a].length || a.localeCompare(b));

  return (
    <div>
      <p className="rl-lede">{QUALIFICATION_NOTE}</p>

      <div className="rl-squad-grid">
        {countries.map(country => (
          <div className="rl-squad-card" key={country}>
            <div className="rl-squad-head">
              <span className={`fi fi-${country}`} style={{ fontSize: '1.3em' }} />
              {country.toUpperCase()}
            </div>
            {SQUADS[country].map(driver => (
              <div className="rl-squad-member" key={driver.id}>
                <img className="rl-thumb" src={carImageUrl(driver.carImageId)} alt="" />
                {driver.name} <span className="rl-squad-source">— {driver.sourceShort}, rating {driver.rating}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SquadsTab;
