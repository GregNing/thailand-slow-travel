const state = { selectedDay: 0, completed: JSON.parse(localStorage.getItem('thailand-slow-travel-completed') || '{}') };
const $ = (id) => document.getElementById(id);
const money = (value) => `฿${value.toLocaleString('en-US')}`;
const flightMoney = (currency, value) => `${currency} ${value.toLocaleString('en-US')}`;
const flightAnchor = (flight) => `flight-${String(flight.reference || flight.flightNumber).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const googleMapsUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const isGoogleMapsUrl = (url) => /google\.com\/maps|maps\.app\.goo\.gl/.test(url || '');
const mapLinkAttrs = () => (window.matchMedia && window.matchMedia('(max-width: 720px)').matches ? '' : 'target="_blank" rel="noopener"');
const mapsUrlFor = (stop) => {
  const savedMap = stop.mapUrl || (stop.links || []).find((link) => isGoogleMapsUrl(link.url))?.url;
  const query = stop.mapQuery || [stop.title, stop.place].filter(Boolean).join(' ');
  return savedMap || googleMapsUrl(query);
};
const iconFor = { arrival: '✈', stay: '⌂', food: '⌁', train: '↝', nature: '✦', culture: '◌', cafe: '☕', fun: '★', shopping: '✳' };
const routeMeta = {
  main: { className: 'main', eyebrow: 'MAIN ROUTE', title: '主要行程' }
};
const timeToMinutes = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };

function getRouteMeta(route) {
  const key = route || 'main';
  if (routeMeta[key]) return { key, ...routeMeta[key] };
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return { key, className: 'other', eyebrow: `${label} ROUTE`, title: `${label} 行程` };
}

function init() {
  $('trip-title').textContent = TRIP_DATA.title;
  $('trip-subtitle').textContent = TRIP_DATA.subtitle;
  $('trip-date-range').textContent = TRIP_DATA.dateRange;
  $('trip-location').textContent = TRIP_DATA.location;
  $('trip-description').textContent = TRIP_DATA.description;
  $('trip-note').textContent = TRIP_DATA.note;
  $('trip-days').textContent = String(TRIP_DATA.days.length).padStart(2, '0');
  $('total-stops').textContent = TRIP_DATA.days.reduce((sum, day) => sum + day.stops.length, 0);
  $('total-budget').textContent = money(TRIP_DATA.budget.reduce((sum, item) => sum + item.amount, 0));
  renderTabs(); renderRouteCards(); renderBudget(); renderUtilitySections(); renderDay(); updateProgress();
  $('today-button').addEventListener('click', jumpToToday);
  document.querySelectorAll('.nav-link').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.tab-panel').forEach((panel) => { panel.hidden = panel.dataset.panel !== button.dataset.panel; });
    document.getElementById(button.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector('.nav-links').classList.remove('open');
    $('menu-button').setAttribute('aria-expanded', 'false');
  }));
  $('menu-button').addEventListener('click', () => {
    const open = document.querySelector('.nav-links').classList.toggle('open');
    $('menu-button').setAttribute('aria-expanded', String(open));
  });
}

function renderRouteCards() {
  const tones = ['route-card-vermillion', 'route-card-moss', 'route-card-indigo', 'route-card-sand'];
  $('route-cards').innerHTML = TRIP_DATA.days.slice(0, 4).map((day, index) => {
    const lead = day.stops[0];
    return `<article class="route-card ${tones[index % tones.length]}">
      <button class="route-card-day" type="button" data-route-day="${index}" aria-label="查看 ${day.label} 行程">
        <span class="route-card-number">${String(index + 1).padStart(2, '0')}</span>
        <span class="route-card-mark">${iconFor[lead.type] || '•'}</span>
        <span class="route-card-copy"><small>${day.short} / ${day.weekday} · ${lead.place.split('／')[0]}</small><strong>${day.label}</strong><em>${day.summary}</em></span>
        <span class="route-card-arrow">↗</span>
      </button>
      <a class="route-card-map" href="${mapsUrlFor(lead)}" ${mapLinkAttrs()} aria-label="在 Google Maps 開啟 ${lead.title}">⌖ Google Maps 位置 ↗</a>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-route-day]').forEach((button) => button.addEventListener('click', () => {
    state.selectedDay = Number(button.dataset.routeDay); renderTabs(); renderDay(); $('itinerary-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function renderTabs() {
  $('day-tabs').innerHTML = TRIP_DATA.days.map((day, index) => `<button class="day-tab ${index === state.selectedDay ? 'active' : ''}" data-day="${index}" type="button"><span>DAY ${index + 1}</span><strong>${day.short}</strong><small>${day.weekday}</small></button>`).join('');
  document.querySelectorAll('.day-tab').forEach((button) => button.addEventListener('click', () => { state.selectedDay = Number(button.dataset.day); renderTabs(); renderDay(); }));
}

function renderDay() {
  const day = TRIP_DATA.days[state.selectedDay];
  $('selected-day-title').innerHTML = `${day.label} <span>DAY ${state.selectedDay + 1}</span>`;
  $('selected-day-summary').textContent = day.summary;
  const routes = day.stops.reduce((groups, stop, originalIndex) => {
    const route = 'main';
    let group = groups.find((item) => item.route === route);
    if (!group) { group = { route, firstIndex: originalIndex, stops: [] }; groups.push(group); }
    group.stops.push({ stop, originalIndex });
    return groups;
  }, []).sort((a, b) => (a.route === 'main' ? -1 : b.route === 'main' ? 1 : a.firstIndex - b.firstIndex));
  routes.forEach((group) => group.stops.sort((a, b) => timeToMinutes(a.stop.time) - timeToMinutes(b.stop.time)));
  const routeNotes = (day.routeNotes || []).map(renderRouteNote).join('');
  const routeBoard = `<div class="timeline-board">${routes.map((group) => renderRouteLane(day, group)).join('')}</div>`;
  const flights = (day.flights || []).map(renderFlightDetails).join('');
  $('timeline').innerHTML = `${flights}${routeBoard}${routeNotes ? `<div class="route-notes">${routeNotes}</div>` : ''}`;
  document.querySelectorAll('.check-wrap input').forEach((input) => input.addEventListener('change', (event) => { state.completed[event.target.dataset.key] = event.target.checked; localStorage.setItem('thailand-slow-travel-completed', JSON.stringify(state.completed)); event.target.closest('.stop').classList.toggle('completed', event.target.checked); updateProgress(); }));
}

function renderFlightDetails(flight) {
  const passengerRows = flight.passengers.map((passenger) => `<tr><th scope="row">${passenger.name}</th><td>${passenger.detail}</td><td>${passenger.amount === null ? '—' : flightMoney(flight.currency, passenger.amount)}</td></tr>`).join('');
  const breakdownRows = (flight.breakdown || []).map((item) => `<div><span>${item.label}</span><strong>${item.detail || ''}</strong><b>${flightMoney(flight.currency, item.amount)}</b></div>`).join('');
  const totalDisplay = flight.totalDisplay || (flight.total ? flightMoney(flight.currency, flight.total) : '待補');
  const summaryItems = [['日期', flight.date], ['航班時間', flight.schedule || `${flight.departure.time}–${flight.arrival.time}`], ['旅客人數', `${flight.passengers.length} 位成人`]];
  if (flight.reference) summaryItems.push(['訂位／訂單', flight.reference]);
  if (flight.bookingDate) summaryItems.push(['訂位日期', flight.bookingDate]);
  if (flight.paymentMethod) summaryItems.push(['付款方式', flight.paymentMethod]);
  const summary = summaryItems.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  const flightNumber = flight.flightNumber ? `<b>${flight.flightNumber}</b>` : '';
  return `<section id="${flightAnchor(flight)}" class="flight-card" aria-label="${flight.airline} ${flight.flightNumber || ''} 航班詳細資訊">
    <header class="flight-card-head">
      <div><span class="section-label">FLIGHT / 航班票券</span><h3>${flight.airline} ${flightNumber}</h3><p>${flight.direction}｜${flight.route}</p></div>
      <span class="flight-status">${flight.status}</span>
    </header>
    <div class="flight-route">
      <div class="flight-airport"><span>出發 · DEPART</span><strong>${flight.departure.code}</strong><b>${flight.departure.name}</b><small>${flight.departure.time}</small></div>
      <span class="flight-route-line" aria-hidden="true">→</span>
      <div class="flight-airport flight-airport-arrival"><span>抵達 · ARRIVE</span><strong>${flight.arrival.code}</strong><b>${flight.arrival.name}</b><small>${flight.arrival.time}</small></div>
    </div>
    <div class="flight-summary">
      ${summary}
    </div>
    <div class="flight-table-wrap">
      <table class="flight-table">
        <caption>${flight.passengerTableLabel || '旅客資料'}</caption>
        <thead><tr><th scope="col">旅客</th><th scope="col">${flight.passengerDetailLabel || '票種／服務'}</th><th scope="col">${flight.passengerAmountLabel || '個人費用'}</th></tr></thead>
        <tbody>${passengerRows}</tbody>
      </table>
    </div>
    <div class="flight-totals">${breakdownRows}<div class="flight-total"><span>${flight.totalLabel || '訂單總額'}</span><strong>${totalDisplay}</strong></div></div>
    <p class="flight-note">${flight.note}</p>
  </section>`;
}

function renderRouteLane(day, group, options = {}) {
  const meta = getRouteMeta(group.route);
  const extraClass = options.extraClass ? ` ${options.extraClass}` : '';
  const header = options.hideHeader ? '' : `<header class="route-lane-head"><div><span class="section-label">${meta.eyebrow}</span><h3>${meta.title}</h3></div><span class="route-lane-count">${options.countOverride || group.stops.length} 站</span></header>`;
  return `<section class="route-lane route-lane-${meta.className}${extraClass}" aria-label="${meta.title}">${header}<div class="route-timeline">${group.stops.map(({ stop, originalIndex }) => renderStop(day, stop, originalIndex, meta.key)).join('')}</div></section>`;
}

function renderRouteNote(note) {
  const meta = getRouteMeta(note.route);
  const sections = (note.sections || []).map((section) => `<article class="route-note-block"><h4>${section.title}</h4><p>${section.text}</p></article>`).join('');
  const tips = (note.tips || []).map((tip) => `<li>${tip}</li>`).join('');
  return `<details class="route-notes-card route-notes-${meta.className}" open><summary><span class="route-notes-summary-copy"><span class="section-label">${meta.eyebrow}</span><strong>${note.title}</strong></span><span class="route-notes-toggle">展開／收合</span></summary><div class="route-notes-body"><p class="route-notes-intro">${note.intro}</p><div class="route-notes-grid">${sections}</div>${tips ? `<section class="route-notes-tips"><h4>${note.tipsTitle || '提醒'}</h4><ul>${tips}</ul></section>` : ''}</div></details>`;
}

function renderStop(day, stop, originalIndex, route) {
    const key = `${day.id}-${route}-${originalIndex}`;
    const checked = Boolean(state.completed[key]);
    const maps = mapsUrlFor(stop);
    const links = (stop.links || []).filter((link) => !isGoogleMapsUrl(link.url)).map((link) => `<a href="${link.url}" target="_blank" rel="noopener">${link.label} ↗</a>`).join('');
    const linkedFlights = (stop.flightRefs || []).map((reference) => (day.flights || []).find((flight) => flight.flightNumber === reference || flight.reference === reference)).filter(Boolean);
    const flightInfo = linkedFlights.map((flight) => {
      const baggageCount = flight.passengers.filter((passenger) => passenger.detail.includes('30 公斤')).length;
      const passengerSummary = `${flight.passengers.length} 位成人 · ${baggageCount ? `30 公斤託運 × ${baggageCount}` : '行李額度待確認'}`;
      return `<div class="stop-flight-info"><span class="stop-flight-label">✈ FLIGHT DETAIL / 班機詳細</span><strong>${flight.airline} ${flight.flightNumber}</strong><span>${flight.date} · ${flight.departure.code} ${flight.departure.time} → ${flight.arrival.code} ${flight.arrival.time}</span><span>${passengerSummary} · ${flight.totalLabel || '訂單金額'} ${flightMoney(flight.currency, flight.total)}</span><a href="#${flightAnchor(flight)}">查看完整票務表 ↘</a></div>`;
    }).join('');
    const mapLink = `<a class="place-link" href="${maps}" ${mapLinkAttrs()} aria-label="在 Google Maps 開啟 ${stop.title}"><span class="place-link-label">⌖ Google Maps 位置 ↗</span><span class="place-link-address">${stop.place}</span></a>`;
    const paidCost = stop.paidCost ? `<span class="stop-paid">${stop.paidLabel || '已付款'} <b>${stop.paidCurrency === 'TWD' ? 'NT$' : stop.paidCurrency}${stop.paidCost.toLocaleString('zh-TW')}</b></span>` : '';
    const extraContent = `${flightInfo}${links ? `<div class="stop-links">${links}</div>` : ''}<p class="stop-note">${stop.note}</p>`;
    const more = extraContent.trim() ? `<details class="stop-more"><summary>查看備註與連結 <span>⌄</span></summary><div class="stop-more-body">${extraContent}</div></details>` : '';
    const costDisplay = stop.costLabel || (stop.cost === null ? '待確認' : money(stop.cost));
    return `<article class="stop ${checked ? 'completed' : ''}"><div class="stop-time"><strong>${stop.time}</strong><span>${stop.leave ? `至 ${stop.leave}` : '彈性'}</span></div><div class="timeline-line"><span class="stop-icon">${iconFor[stop.type] || '•'}</span></div><div class="stop-card"><div class="stop-top"><div><span class="stop-kind">${stop.type.toUpperCase()}</span><h3>${stop.title}</h3></div><label class="check-wrap" title="標記完成"><input type="checkbox" ${checked ? 'checked' : ''} data-key="${key}" /><span></span></label></div>${mapLink}<div class="stop-meta"><span>↝ ${stop.transport}</span><span>◷ ${stop.duration}</span></div><div class="stop-cost">預估 <b>${costDisplay}</b>${paidCost}</div>${more}</div></article>`;
}

function renderBudget() {
  $('budget-grid').innerHTML = TRIP_DATA.budget.map((item) => `<div class="budget-card ${item.tone}"><div class="budget-icon">${item.icon}</div><div><span>${item.label}</span><strong>${money(item.amount)}</strong></div></div>`).join('');
}

function renderUtilitySections() {
  $('reminders-list').innerHTML = TRIP_DATA.reminders.map((item, index) => { const links = (item.links || []).map((link) => `<a class="reminder-link" href="${link.url}" target="_blank" rel="noopener">${link.label} ↗</a>`).join(''); return `<div class="utility-row"><span class="utility-index">${String(index + 1).padStart(2, '0')}</span><div><strong>${item.title}</strong><p>${item.text}</p>${links ? `<div class="reminder-links">${links}</div>` : ''}</div></div>`; }).join('');
  const checks = JSON.parse(localStorage.getItem('thailand-slow-travel-checks') || '{}');
  $('checklist').innerHTML = TRIP_DATA.checklist.map((item) => `<label class="checklist-row"><input type="checkbox" data-check="${item.id}" ${checks[item.id] ? 'checked' : ''}><span class="check-box"></span><span>${item.text}</span></label>`).join('');
  document.querySelectorAll('[data-check]').forEach((input) => input.addEventListener('change', (event) => { checks[event.target.dataset.check] = event.target.checked; localStorage.setItem('thailand-slow-travel-checks', JSON.stringify(checks)); }));
  $('emergency-grid').innerHTML = TRIP_DATA.emergency.map((item) => `<a class="emergency-card" href="${item.action}" target="_blank" rel="noopener"><span>${item.label}</span><strong>${item.value}</strong><small>開啟 ↗</small></a>`).join('');
}

function updateProgress() {
  const total = TRIP_DATA.days.reduce((sum, day) => sum + day.stops.length, 0);
  const done = Object.values(state.completed).filter(Boolean).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $('progress-text').textContent = `${percent}%`;
  $('progress-bar').style.width = `${percent}%`;
}

function jumpToToday() {
  const start = new Date('2027-02-20T00:00:00');
  const today = new Date();
  const index = Math.floor((today - start) / 86400000);
  state.selectedDay = Math.max(0, Math.min(TRIP_DATA.days.length - 1, index));
  renderTabs(); renderDay();
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
init();
