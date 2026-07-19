import { useMemo, useState } from 'react';
import { asVisitDates } from './visitDates';
import { tierColor, tierLabel } from './RatingTier';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Build { 'YYYY-MM-DD': [stop, ...] } from every stop's visit_dates. A stop
// visited on several days appears under each of those days.
function buildVisitsByDate(stops) {
  const map = {};
  for (const stop of stops) {
    for (const date of asVisitDates(stop.visit_dates)) {
      (map[date] ||= []).push(stop);
    }
  }
  return map;
}

function CalendarPanel({ stops, selectedId, onSelectStop }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11

  const visitsByDate = useMemo(() => buildVisitsByDate(stops), [stops]);

  const firstWeekday = new Date(year, month, 1).getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthVisitCount = useMemo(() => {
    let n = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      n += (visitsByDate[`${year}-${pad(month + 1)}-${pad(d)}`] || []).length;
    }
    return n;
  }, [visitsByDate, year, month, daysInMonth]);

  const step = (delta) => {
    const m = month + delta;
    if (m < 0) { setMonth(11); setYear(year - 1); }
    else if (m > 11) { setMonth(0); setYear(year + 1); }
    else setMonth(m);
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  return (
    <div className="cr-cal">
      <div className="cr-cal-head">
        <button className="cr-cal-nav" onClick={() => step(-1)} aria-label="Previous month">‹</button>
        <div className="cr-cal-title">
          <span>{MONTHS[month]} {year}</span>
          <span className="cr-cal-sub">{monthVisitCount} visit{monthVisitCount === 1 ? '' : 's'}</span>
        </div>
        <button className="cr-cal-nav" onClick={() => step(1)} aria-label="Next month">›</button>
      </div>

      <button className="cr-cal-today" onClick={goToday}>Today</button>

      <div className="cr-cal-weekdays">
        {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
      </div>

      <div className="cr-cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cr-cal-cell cr-cal-empty" />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
          const visits = visitsByDate[dateStr] || [];
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className={`cr-cal-cell${isToday ? ' cr-cal-today-cell' : ''}`}>
              <div className="cr-cal-daynum">{d}</div>
              <div className="cr-cal-chips">
                {visits.slice(0, 3).map((stop, j) => (
                  <button
                    key={`${stop.id}-${j}`}
                    className={`cr-cal-chip${selectedId === stop.id ? ' active' : ''}`}
                    style={{ background: tierColor(stop.rating) }}
                    title={`${stop.name} — ${tierLabel(stop.rating)}`}
                    onClick={() => onSelectStop(stop)}
                  >
                    {stop.name}
                  </button>
                ))}
                {visits.length > 3 && <div className="cr-cal-more">+{visits.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarPanel;
