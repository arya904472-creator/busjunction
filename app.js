// Himalayan Routes Main Application Logic
import { DISTRICTS, BUS_STANDS, OPERATORS, ROUTES, BUS_TYPES, INITIAL_SUBMISSIONS, INITIAL_REPORTS } from './data.js';

// Application State
const state = {
  routes: [...ROUTES],
  operators: [...OPERATORS],
  busStands: [...BUS_STANDS],
  districts: [...DISTRICTS],
  submissions: [...INITIAL_SUBMISSIONS],
  reports: [...INITIAL_REPORTS],
  currentView: 'home', // home | search | hrtc | volvo | private | local | districts | busStands | map | admin | about
  filters: {
    from: '',
    to: '',
    category: 'all', // all | hrtc | private | local | volvo | electric
    busType: 'all',
    district: 'all',
    depot: 'all',
    frequency: 'all',
    operatorId: 'all'
  },
  selectedRouteForDetails: null,
  selectedRouteForReport: null,
  leafletMap: null
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  initSearchAutocomplete();
  setupNavigationHandlers();
  setupFilterHandlers();
  setupModalHandlers();
  renderCurrentView();
});

// View Navigation Handler
function setupNavigationHandlers() {
  document.querySelectorAll('[data-view]').forEach(elem => {
    elem.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = elem.getAttribute('data-view');
      const param = elem.getAttribute('data-param');
      
      if (param) {
        if (targetView === 'district') state.filters.district = param;
        if (targetView === 'depot') state.filters.depot = param;
        if (targetView === 'operator') state.filters.operatorId = param;
      }
      
      switchView(targetView);
    });
  });

  // Mobile Bottom Navigation
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Swap From/To button
  const swapBtn = document.getElementById('swap-locations-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const fromInput = document.getElementById('search-from');
      const toInput = document.getElementById('search-to');
      if (fromInput && toInput) {
        const temp = fromInput.value;
        fromInput.value = toInput.value;
        toInput.value = temp;
        state.filters.from = fromInput.value;
        state.filters.to = toInput.value;
        if (state.currentView === 'search') renderSearchResults();
      }
    });
  }

  // Hero Search Button
  const heroSearchBtn = document.getElementById('hero-search-submit');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      const fromVal = document.getElementById('search-from')?.value || '';
      const toVal = document.getElementById('search-to')?.value || '';
      state.filters.from = fromVal;
      state.filters.to = toVal;
      switchView('search');
    });
  }
}

export function switchView(viewName) {
  state.currentView = viewName;
  
  // Update nav active states
  document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(el => {
    if (el.getAttribute('data-view') === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render View Coordinator
function renderCurrentView() {
  const container = document.getElementById('main-content');
  if (!container) return;

  switch (state.currentView) {
    case 'home':
      container.innerHTML = renderHomeView();
      setupHomeInteractions();
      break;
    case 'search':
      container.innerHTML = renderSearchView();
      renderSearchResults();
      break;
    case 'hrtc':
      container.innerHTML = renderHRTCView();
      setupHRTCInteractions();
      break;
    case 'volvo':
      container.innerHTML = renderVolvoView();
      break;
    case 'private':
      container.innerHTML = renderPrivateView();
      break;
    case 'local':
      container.innerHTML = renderLocalView();
      setupLocalInteractions();
      break;
    case 'districts':
      container.innerHTML = renderDistrictsView();
      break;
    case 'busStands':
      container.innerHTML = renderBusStandsView();
      break;
    case 'map':
      container.innerHTML = renderMapView();
      initLeafletMap();
      break;
    case 'admin':
      container.innerHTML = renderAdminView();
      setupAdminInteractions();
      break;
    default:
      container.innerHTML = renderHomeView();
      setupHomeInteractions();
  }
}

// ---------------------------------------------------------------------
// 1. SEARCH & AUTOCOMPLETE SYSTEM
// ---------------------------------------------------------------------
function initSearchAutocomplete() {
  const locationList = Array.from(new Set([
    ...state.routes.map(r => r.origin),
    ...state.routes.map(r => r.destination),
    ...state.routes.flatMap(r => r.stops.map(s => s.name)),
    ...state.busStands.map(b => b.name),
    'Palampur', 'Dharamshala', 'Shimla', 'Manali', 'Pathankot', 'Chandigarh', 'Delhi', 'Mandi', 'Kullu', 'Baijnath', 'Kangra', 'Una', 'Chamba', 'Solan', 'Hamirpur'
  ]));

  ['search-from', 'search-to'].forEach(inputId => {
    const input = document.getElementById(inputId);
    const suggBox = document.getElementById(`${inputId}-suggestions`);
    if (!input || !suggBox) return;

    input.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      if (!val) {
        suggBox.classList.remove('active');
        suggBox.innerHTML = '';
        return;
      }

      const matches = locationList.filter(loc => loc.toLowerCase().includes(val)).slice(0, 6);
      if (matches.length > 0) {
        suggBox.innerHTML = matches.map(loc => `
          <div class="suggestion-item" data-val="${loc}">
            <span>📍 ${loc}</span>
            <span class="suggestion-type">Bus Stop / City</span>
          </div>
        `).join('');
        suggBox.classList.add('active');

        suggBox.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            input.value = item.getAttribute('data-val');
            suggBox.classList.remove('active');
            if (inputId === 'search-from') state.filters.from = input.value;
            if (inputId === 'search-to') state.filters.to = input.value;
          });
        });
      } else {
        suggBox.classList.remove('active');
      }
    });

    document.addEventListener('click', (ev) => {
      if (!input.contains(ev.target) && !suggBox.contains(ev.target)) {
        suggBox.classList.remove('active');
      }
    });
  });
}

function setupFilterHandlers() {
  // Quick category chips
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (chip) {
      const cat = chip.getAttribute('data-category');
      if (cat) {
        state.filters.category = cat;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (state.currentView === 'search') renderSearchResults();
        else switchView('search');
      }
    }
  });
}

// ---------------------------------------------------------------------
// 2. HOMEPAGE VIEW RENDERER
// ---------------------------------------------------------------------
function renderHomeView() {
  return `
    <!-- Popular Quick Searches -->
    <section class="app-container" style="margin-top: 2rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">✨ Popular Himachal Bus Routes</h2>
          <p class="section-subtitle">Frequently queried daily inter-city & inter-state routes</p>
        </div>
        <a class="view-all-link" data-view="search">View All Routes →</a>
      </div>
      <div class="filter-bar" style="margin-bottom: 1.5rem;">
        <button class="filter-chip chip-volvo active" data-category="all">🚌 All Routes</button>
        <button class="filter-chip chip-hrtc" data-category="hrtc">🏔️ HRTC Only</button>
        <button class="filter-chip chip-volvo" data-category="volvo">⭐ Volvo / Himsuta</button>
        <button class="filter-chip chip-electric" data-category="electric">⚡ Electric Buses</button>
        <button class="filter-chip chip-local" data-category="local">🌾 Rural / Local</button>
      </div>
      <div id="home-featured-routes" class="routes-grid"></div>
    </section>

    <!-- Categories Grid -->
    <section class="app-container">
      <div class="section-header">
        <div>
          <h2 class="section-title">🚌 Explore Transport Network</h2>
          <p class="section-subtitle">Single portal for government, luxury, and village services</p>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
        <div class="hrtc-cat-card" data-view="hrtc">
          <div class="hrtc-cat-icon">🏔️</div>
          <div class="hrtc-cat-name">HRTC BUS SERVICES</div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">18 Depots across Himachal. Ordinary, Deluxe & Inter-State services.</p>
        </div>
        <div class="hrtc-cat-card" data-view="volvo">
          <div class="hrtc-cat-icon">⭐</div>
          <div class="hrtc-cat-name">HRTC VOLVO / HIMSUTA</div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Premium luxury AC buses connecting Dharamshala, Palampur, Manali & Shimla to Delhi.</p>
        </div>
        <div class="hrtc-cat-card" data-view="private">
          <div class="hrtc-cat-icon">🚍</div>
          <div class="hrtc-cat-name">PRIVATE BUS OPERATORS</div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Rana Coach, New Walia, Lucky Bus & verified private operators directory.</p>
        </div>
        <div class="hrtc-cat-card" data-view="local">
          <div class="hrtc-cat-icon">🌾</div>
          <div class="hrtc-cat-name">LOCAL / RURAL VILLAGE ROUTES</div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Vital 1–3 buses/day village-to-town routes for rural commuters.</p>
        </div>
      </div>
    </section>

    <!-- District Wise Showcase -->
    <section class="app-container" style="margin-top: 2.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🗺️ Explore Bus Routes by District</h2>
          <p class="section-subtitle">Find local & inter-district services across all 12 districts of Himachal Pradesh</p>
        </div>
        <a class="view-all-link" data-view="districts">All 12 Districts →</a>
      </div>
      <div class="district-grid">
        ${state.districts.slice(0, 6).map(d => `
          <div class="district-card" data-view="search" data-district="${d.name}">
            <div class="district-header">
              <span class="district-name">${d.name}</span>
              <span class="district-hq">HQ: ${d.hq}</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted);">${d.desc}</p>
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--ice-cyan); margin-top: 0.75rem;">Major Hubs: ${d.majorStands.join(', ')}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function setupHomeInteractions() {
  const container = document.getElementById('home-featured-routes');
  if (container) {
    container.innerHTML = state.routes.slice(0, 4).map(r => renderRouteCardHtml(r)).join('');
    setupRouteCardButtons();
  }
}

// ---------------------------------------------------------------------
// 3. SEARCH RESULTS VIEW RENDERER
// ---------------------------------------------------------------------
function renderSearchView() {
  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🔍 Search Bus Routes & Timetables</h2>
          <p class="section-subtitle">Showing live verified results across Himachal Pradesh operators</p>
        </div>
      </div>

      <!-- Filters Row -->
      <div style="background: white; border-radius: var(--radius-md); padding: 1rem; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Operator Type</label>
            <select id="filter-category" class="form-control">
              <option value="all" ${state.filters.category === 'all' ? 'selected' : ''}>All Operators</option>
              <option value="hrtc" ${state.filters.category === 'hrtc' ? 'selected' : ''}>HRTC (Government)</option>
              <option value="private" ${state.filters.category === 'private' ? 'selected' : ''}>Private Operators</option>
              <option value="volvo" ${state.filters.category === 'volvo' ? 'selected' : ''}>Volvo / Himsuta</option>
              <option value="electric" ${state.filters.category === 'electric' ? 'selected' : ''}>Electric Buses</option>
              <option value="local" ${state.filters.category === 'local' ? 'selected' : ''}>Rural Local (1-3/day)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">District Filter</label>
            <select id="filter-district" class="form-control">
              <option value="all">All Districts</option>
              ${state.districts.map(d => `<option value="${d.name}" ${state.filters.district === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Bus Type</label>
            <select id="filter-bustype" class="form-control">
              <option value="all">All Bus Types</option>
              ${BUS_TYPES.map(bt => `<option value="${bt}">${bt}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div id="search-results-count" style="margin-bottom: 1rem; font-weight: 600; color: var(--text-muted);"></div>
      <div id="search-results-grid" class="routes-grid"></div>
    </div>
  `;
}

function renderSearchResults() {
  const resultsGrid = document.getElementById('search-results-grid');
  const countLabel = document.getElementById('search-results-count');
  if (!resultsGrid) return;

  const fromVal = (state.filters.from || document.getElementById('search-from')?.value || '').toLowerCase().trim();
  const toVal = (state.filters.to || document.getElementById('search-to')?.value || '').toLowerCase().trim();
  const catVal = state.filters.category;
  const distVal = state.filters.district;

  const filtered = state.routes.filter(r => {
    // Route match check (Origin/Destination or Stop match)
    const matchesFrom = !fromVal || r.origin.toLowerCase().includes(fromVal) || r.stops.some(s => s.name.toLowerCase().includes(fromVal));
    const matchesTo = !toVal || r.destination.toLowerCase().includes(toVal) || r.stops.some(s => s.name.toLowerCase().includes(toVal));

    // Category match
    let matchesCat = true;
    if (catVal === 'hrtc') matchesCat = r.is_hrtc;
    else if (catVal === 'private') matchesCat = !r.is_hrtc;
    else if (catVal === 'volvo') matchesCat = r.is_volvo;
    else if (catVal === 'electric') matchesCat = r.bus_type.includes('Electric');
    else if (catVal === 'local') matchesCat = r.is_local;

    // District match
    const matchesDist = distVal === 'all' || r.district === distVal;

    return matchesFrom && matchesTo && matchesCat && matchesDist;
  });

  if (countLabel) {
    countLabel.textContent = `Found ${filtered.length} route${filtered.length === 1 ? '' : 's'} matching your search criteria`;
  }

  if (filtered.length === 0) {
    resultsGrid.innerHTML = `
      <div style="background: white; border-radius: var(--radius-md); padding: 3rem; text-align: center; border: 1px solid var(--border-color);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🚌</div>
        <h3 style="font-family: var(--font-heading); color: var(--primary-navy);">No routes found for specified criteria</h3>
        <p style="color: var(--text-muted); max-width: 500px; margin: 0.5rem auto 1.5rem;">Timing not currently verified or no direct bus matches this exact search. Try selecting "All Districts" or broader origin/destination filters.</p>
        <button class="btn-secondary-sm" id="reset-search-btn">Reset All Filters</button>
      </div>
    `;
    document.getElementById('reset-search-btn')?.addEventListener('click', () => {
      state.filters = { from: '', to: '', category: 'all', busType: 'all', district: 'all', depot: 'all', frequency: 'all', operatorId: 'all' };
      const f1 = document.getElementById('search-from');
      const f2 = document.getElementById('search-to');
      if (f1) f1.value = '';
      if (f2) f2.value = '';
      renderSearchResults();
    });
  } else {
    resultsGrid.innerHTML = filtered.map(r => renderRouteCardHtml(r)).join('');
    setupRouteCardButtons();
  }
}

// ---------------------------------------------------------------------
// 4. ROUTE CARD HTML RENDERER & TIMELINE
// ---------------------------------------------------------------------
function renderRouteCardHtml(route) {
  const statusClass = 
    route.verification_status.includes('Verified') ? 'status-verified' :
    route.verification_status.includes('Updated') ? 'status-updated' :
    route.verification_status.includes('Submitted') ? 'status-submitted' : 'status-unverified';

  return `
    <div class="route-card" data-route-id="${route.id}">
      <div class="card-top-bar">
        <div class="operator-badge">
          <span class="op-logo">🚌</span>
          <span>${route.operator_name}</span>
          ${route.service_number ? `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(${route.service_number})</span>` : ''}
        </div>
        <div class="verification-status-badge ${statusClass}">
          ${route.verification_status}
        </div>
      </div>

      ${route.rural_notice ? `
        <div class="rural-banner">
          ⚠️ <span>${route.rural_notice}</span>
          <span style="margin-left:auto; background:#fef3c7; padding:0.1rem 0.4rem; border-radius:4px; font-size:0.72rem;">Frequency: ${route.frequency}</span>
        </div>
      ` : ''}

      <div class="route-main-info">
        <div class="time-point">
          <span class="time-label">${route.departure_time}</span>
          <span class="place-label">${route.origin}</span>
          <span class="sub-label">Operating: ${route.operating_days}</span>
        </div>

        <div class="route-arrow-connector">
          <span class="duration-tag">${route.frequency}</span>
          <div class="arrow-line"></div>
          <span class="sub-label">${route.stops.length} Stops</span>
        </div>

        <div class="time-point">
          <span class="time-label">${route.arrival_time}</span>
          <span class="place-label">${route.destination}</span>
          <span class="sub-label">Depot: ${route.depot}</span>
        </div>

        <div class="fare-box">
          <div class="fare-amount">${route.fare}</div>
          <div class="fare-note">Approx Fare</div>
        </div>
      </div>

      <div class="bus-type-pills">
        <span class="type-pill ${route.is_volvo ? 'pill-volvo' : route.is_hrtc ? 'pill-hrtc' : 'pill-local'}">
          ${route.bus_type}
        </span>
        ${route.is_ac ? '<span class="type-pill pill-volvo">AC Air-Conditioned</span>' : '<span class="type-pill">Non-AC</span>'}
        <span class="type-pill">District: ${route.district}</span>
      </div>

      <!-- Expandable Stops Box -->
      <div id="stops-box-${route.id}" class="stops-sequence-box">
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--primary-navy);">📍 Route Stops & Sequence:</h4>
        <div class="stops-list-horizontal">
          ${route.stops.map((s, idx) => `
            <div class="stop-node">
              <div class="stop-dot"></div>
              <span class="stop-name">${s.name}</span>
              <span class="stop-time">${s.dep ? 'Dep: ' + s.dep : 'Arr: ' + s.arr}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card-footer">
        <div class="meta-source-info">
          <span>Source: <strong>${route.source}</strong></span>
          <span>• Last Verified: ${route.last_verified}</span>
        </div>

        <div class="action-btns-group">
          <button class="btn-secondary-sm toggle-stops-btn" data-target="stops-box-${route.id}">
            🚩 View Stops (${route.stops.length})
          </button>
          <button class="btn-secondary-sm btn-report-issue-trigger" data-route-id="${route.id}">
            ⚠️ Report Issue
          </button>
        </div>
      </div>
    </div>
  `;
}

function setupRouteCardButtons() {
  // Stops toggle
  document.querySelectorAll('.toggle-stops-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.getAttribute('data-target');
      const box = document.getElementById(targetId);
      if (box) {
        box.classList.toggle('active');
        btn.textContent = box.classList.contains('active') ? '▲ Hide Stops' : `🚩 View Stops`;
      }
    });
  });

  // Report Issue
  document.querySelectorAll('.btn-report-issue-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const routeId = btn.getAttribute('data-route-id');
      const route = state.routes.find(r => r.id === routeId);
      if (route) {
        openReportModal(route);
      }
    });
  });
}

// ---------------------------------------------------------------------
// 5. HRTC PORTAL VIEW
// ---------------------------------------------------------------------
function renderHRTCView() {
  const hrtcDepots = [
    'Shimla', 'Dharamshala', 'Palampur', 'Baijnath', 'Kangra', 'Mandi',
    'Kullu', 'Manali', 'Hamirpur', 'Una', 'Bilaspur', 'Solan', 'Nahan',
    'Reckong Peo', 'Rampur', 'Rohru', 'Chamba', 'Dalhousie', 'Pathankot'
  ];

  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="hrtc-hero-box">
        <div>
          <h1 class="hrtc-title">🏔️ HRTC BUS SERVICES</h1>
          <p style="color: #93c5fd; font-size: 1.05rem;">Official Information Portal for Himachal Road Transport Corporation Depots & Services</p>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); text-align: right;">
          <div style="font-size: 1.6rem; font-weight: 800; font-family: var(--font-heading);">3,100+ Buses</div>
          <div style="font-size: 0.8rem; color: #cbd5e1;">State-Wide Connectivity</div>
        </div>
      </div>

      <div class="section-header">
        <div>
          <h2 class="section-title">🏢 Major HRTC Depots</h2>
          <p class="section-subtitle">Select a depot to inspect all registered timetables and departing buses</p>
        </div>
      </div>

      <div class="depot-grid">
        ${hrtcDepots.map(dep => `
          <div class="depot-card" data-depot="${dep}">
            <div class="depot-icon">${dep.substring(0, 2).toUpperCase()}</div>
            <div>
              <div style="font-weight: 700; color: var(--primary-navy);">${dep} Depot</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">View Timetable & Routes</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section-header" style="margin-top: 2rem;">
        <div>
          <h2 class="section-title">🚍 HRTC Active Routes</h2>
          <p class="section-subtitle">Government Ordinary, Express & Inter-State Services</p>
        </div>
      </div>

      <div id="hrtc-routes-container" class="routes-grid"></div>
    </div>
  `;
}

function setupHRTCInteractions() {
  const container = document.getElementById('hrtc-routes-container');
  if (container) {
    const hrtcRoutes = state.routes.filter(r => r.is_hrtc);
    container.innerHTML = hrtcRoutes.map(r => renderRouteCardHtml(r)).join('');
    setupRouteCardButtons();
  }

  document.querySelectorAll('.depot-card').forEach(card => {
    card.addEventListener('click', () => {
      const depot = card.getAttribute('data-depot');
      state.filters.category = 'hrtc';
      state.filters.depot = depot;
      switchView('search');
    });
  });
}

// ---------------------------------------------------------------------
// 6. HRTC VOLVO / HIMSUTA SHOWCASE VIEW
// ---------------------------------------------------------------------
function renderVolvoView() {
  const volvoRoutes = state.routes.filter(r => r.is_volvo);

  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div style="background: linear-gradient(135deg, #581c87 0%, #1e1b4b 100%); color: white; border-radius: var(--radius-lg); padding: 2.5rem 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-lg);">
        <h1 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem;">⭐ HRTC VOLVO / HIMSUTA</h1>
        <p style="color: #e9d5ff; font-size: 1.1rem; max-width: 700px;">Luxury AC Air-Suspension Inter-State Services connecting Himachal's major cities and hill stations to Delhi and Chandigarh.</p>
      </div>

      <div class="section-header">
        <div>
          <h2 class="section-title">🚌 Premium Volvo Schedule</h2>
          <p class="section-subtitle">Overnight luxury Volvo schedules with verified boarding points</p>
        </div>
      </div>

      <div class="routes-grid">
        ${volvoRoutes.map(r => renderRouteCardHtml(r)).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 7. PRIVATE OPERATORS DIRECTORY VIEW
// ---------------------------------------------------------------------
function renderPrivateView() {
  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🚍 PRIVATE BUS OPERATORS DIRECTORY</h2>
          <p class="section-subtitle">Verified private bus operators providing regional & local services</p>
        </div>
        <button class="nav-btn add-operator-btn" id="open-add-operator-modal">+ ADD NEW PRIVATE OPERATOR</button>
      </div>

      <div>
        ${state.operators.filter(op => op.id !== 'hrtc').map(op => {
          const opRoutes = state.routes.filter(r => r.operator_id === op.id);
          return `
            <div class="operator-profile-card">
              <div class="op-profile-header">
                <div class="op-profile-logo">${op.logo || '🚌'}</div>
                <div>
                  <h3 style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--primary-navy);">${op.name}</h3>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">HQ: ${op.headquarters} • Contact: ${op.contact}</div>
                  <div style="margin-top: 0.3rem;">
                    <span class="verification-status-badge status-verified">${op.verification_status}</span>
                    <span style="font-size: 0.8rem; margin-left: 0.5rem; color: var(--text-muted);">${opRoutes.length} Verified Routes</span>
                  </div>
                </div>
              </div>
              <p style="font-size: 0.9rem; color: #475569; margin-bottom: 1rem;">${op.description}</p>
              
              <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--primary-navy);">Operating Routes:</h4>
              <div class="routes-grid">
                ${opRoutes.map(r => renderRouteCardHtml(r)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 8. RURAL & LOCAL VILLAGE ROUTES VIEW (1-3 BUSES/DAY)
// ---------------------------------------------------------------------
function renderLocalView() {
  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div style="background: linear-gradient(135deg, #78350f 0%, #451a03 100%); color: white; border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem;">
        <h1 style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">🌾 RURAL & LOCAL VILLAGE ROUTES</h1>
        <p style="color: #fef3c7; font-size: 1rem; max-width: 750px;">Dedicated section for remote Himachal village-to-town routes operating <strong>1–3 times per day</strong>. Essential for rural healthcare, market, and college travel.</p>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="filter-chip chip-local active" data-freq="all">All Frequencies</button>
          <button class="filter-chip chip-local" data-freq="1">1 bus/day</button>
          <button class="filter-chip chip-local" data-freq="2">2 buses/day</button>
          <button class="filter-chip chip-local" data-freq="3">3 buses/day</button>
        </div>
      </div>

      <div class="section-header">
        <div>
          <h2 class="section-title">🏡 Verified Rural Bus Schedules</h2>
          <p class="section-subtitle">“From the biggest Volvo service to the smallest village bus — every Himalayan route matters.”</p>
        </div>
      </div>

      <div id="local-routes-grid" class="routes-grid"></div>
    </div>
  `;
}

function setupLocalInteractions() {
  const grid = document.getElementById('local-routes-grid');
  if (!grid) return;

  const renderGrid = (freqFilter = 'all') => {
    const localRoutes = state.routes.filter(r => {
      if (!r.is_local) return false;
      if (freqFilter === 'all') return true;
      return r.daily_frequency_count === parseInt(freqFilter);
    });
    grid.innerHTML = localRoutes.map(r => renderRouteCardHtml(r)).join('');
    setupRouteCardButtons();
  };

  renderGrid();

  document.querySelectorAll('[data-freq]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-freq]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(btn.getAttribute('data-freq'));
    });
  });
}

// ---------------------------------------------------------------------
// 9. DISTRICTS VIEW RENDERER
// ---------------------------------------------------------------------
function renderDistrictsView() {
  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🗺️ All 12 Districts of Himachal Pradesh</h2>
          <p class="section-subtitle">Select a district to view registered HRTC & private routes</p>
        </div>
      </div>

      <div class="district-grid">
        ${state.districts.map(d => `
          <div class="district-card" data-district="${d.name}">
            <div class="district-header">
              <span class="district-name">${d.name}</span>
              <span class="district-hq">HQ: ${d.hq}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">${d.desc}</p>
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--ice-cyan);">Major Bus Stands: ${d.majorStands.join(', ')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 10. BUS STANDS DIRECTORY VIEW
// ---------------------------------------------------------------------
function renderBusStandsView() {
  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🏣 BUS STANDS & ISBT DIRECTORY</h2>
          <p class="section-subtitle">Major bus stands across Himachal Pradesh with enquiry contacts</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
        ${state.busStands.map(bs => `
          <div class="operator-profile-card">
            <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 800; color: var(--primary-navy); margin-bottom: 0.3rem;">${bs.name}</h3>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">📍 Location: ${bs.location} (${bs.district})</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--alpine-green-dark); margin-bottom: 0.5rem;">📞 Enquiry: ${bs.contact}</div>
            <div style="font-size: 0.8rem; color: var(--text-dark);">
              <strong>Major Destinations:</strong> ${bs.majorDestinations.join(', ')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// 11. INTERACTIVE ROUTE MAP VIEW
// ---------------------------------------------------------------------
function renderMapView() {
  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🗺️ Interactive Route Map</h2>
          <p class="section-subtitle">Visual journey of Himachal bus routes, stops, and HRTC depots</p>
        </div>
      </div>

      <div class="map-layout">
        <div class="map-sidebar">
          <h3 style="font-family: var(--font-heading); font-weight: 700; margin-bottom: 1rem;">Select Route to Highlight:</h3>
          ${state.routes.map(r => `
            <div class="suggestion-item route-map-select" data-route-id="${r.id}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.5rem; padding: 0.6rem;">
              <div>
                <div style="font-weight: 700; font-size: 0.85rem;">${r.origin} → ${r.destination}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${r.operator_name} (${r.bus_type})</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div id="map-container"></div>
      </div>
    </div>
  `;
}

function initLeafletMap() {
  const container = document.getElementById('map-container');
  if (!container || typeof L === 'undefined') return;

  // Initialize map centered around Himachal Pradesh (Palampur/Mandi area: 31.95, 76.98)
  const map = L.map('map-container').setView([31.95, 76.98], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Key coordinates map
  const coordsMap = {
    'Palampur': [32.1109, 76.5363],
    'Dharamshala': [32.2190, 76.3234],
    'Kangra': [32.0998, 76.2691],
    'Baijnath': [32.0531, 76.6493],
    'Pathankot': [32.2643, 75.6421],
    'Chandigarh': [30.7333, 76.7794],
    'Delhi': [28.6139, 77.2090],
    'Shimla': [31.1048, 77.1734],
    'Manali': [32.2432, 77.1892],
    'Mandi': [31.7087, 76.9320],
    'Una': [31.4685, 76.2708],
    'Chamba': [32.5534, 76.1258],
    'Reckong Peo': [31.5385, 78.2750]
  };

  let activePolyline = null;

  // Render markers for all key towns
  Object.keys(coordsMap).forEach(town => {
    L.marker(coordsMap[town])
      .addTo(map)
      .bindPopup(`<b>${town} Bus Hub</b><br>Himachal Transport Center`);
  });

  // Sidebar route selection click
  document.querySelectorAll('.route-map-select').forEach(elem => {
    elem.addEventListener('click', () => {
      const id = elem.getAttribute('data-route-id');
      const r = state.routes.find(rt => rt.id === id);
      if (!r) return;

      if (activePolyline) map.removeLayer(activePolyline);

      const latlngs = r.stops
        .map(s => coordsMap[s.name.split(' ')[0]] || coordsMap[r.origin] || coordsMap[r.destination])
        .filter(Boolean);

      if (latlngs.length > 1) {
        activePolyline = L.polyline(latlngs, { color: '#0284c7', weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(activePolyline.getBounds());
      }
    });
  });
}

// ---------------------------------------------------------------------
// 12. ADMIN DASHBOARD & MODERATION SYSTEM
// ---------------------------------------------------------------------
function renderAdminView() {
  const verifiedCount = state.routes.filter(r => r.verification_status.includes('Verified')).length;

  return `
    <div class="app-container" style="margin-top: 1.5rem;">
      <div class="section-header">
        <div>
          <h2 class="section-title">🛡️ ADMIN MODERATION & VERIFICATION DASHBOARD</h2>
          <p class="section-subtitle">Approve user submissions, edit route timings, and manage verification badges</p>
        </div>
      </div>

      <!-- Metric Summary Row -->
      <div class="admin-metrics-row">
        <div class="metric-card">
          <div class="metric-value">${state.routes.length}</div>
          <div class="metric-label">Total Registered Routes</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${verifiedCount}</div>
          <div class="metric-label">Verified Routes</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color: var(--gold-accent);">${state.submissions.length}</div>
          <div class="metric-label">Pending Submissions</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color: var(--red-accent);">${state.reports.length}</div>
          <div class="metric-label">Open Error Reports</div>
        </div>
      </div>

      <!-- Pending User Submissions Table -->
      <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 800; margin-bottom: 1rem; color: var(--primary-navy);">
        📥 Pending Operator Submissions (+ ADD NEW PRIVATE OPERATOR Requests)
      </h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Submitted By</th>
            <th>Operator Name</th>
            <th>Route</th>
            <th>Bus Type</th>
            <th>Source Reference</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.submissions.length === 0 ? `
            <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No pending submissions</td></tr>
          ` : state.submissions.map(sub => `
            <tr>
              <td>${sub.submitted_by}</td>
              <td><strong>${sub.operator_name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${sub.headquarters}</span></td>
              <td>${sub.origin} → ${sub.destination}</td>
              <td>${sub.bus_type}</td>
              <td>${sub.source}</td>
              <td>
                <button class="btn-action-success btn-approve-sub" data-sub-id="${sub.id}">✓ Approve & Verify</button>
                <button class="btn-action-danger btn-reject-sub" data-sub-id="${sub.id}">✕ Reject</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Open Reports Table -->
      <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 800; margin-bottom: 1rem; margin-top: 2.5rem; color: var(--primary-navy);">
        ⚠️ User Error Reports Log
      </h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Route Name</th>
            <th>Issue Type</th>
            <th>Description</th>
            <th>Submitted By</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${state.reports.length === 0 ? `
            <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No open error reports</td></tr>
          ` : state.reports.map(rep => `
            <tr>
              <td>${rep.date}</td>
              <td><strong>${rep.route_name}</strong></td>
              <td><span class="verification-status-badge status-unverified">${rep.issue_type}</span></td>
              <td>${rep.description}</td>
              <td>${rep.submitted_by} (${rep.contact})</td>
              <td>
                <button class="btn-action-success btn-resolve-rep" data-rep-id="${rep.id}">Mark Resolved</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setupAdminInteractions() {
  // Approve Submission
  document.querySelectorAll('.btn-approve-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sub-id');
      const subIndex = state.submissions.findIndex(s => s.id === id);
      if (subIndex > -1) {
        const sub = state.submissions[subIndex];
        
        // Add to active verified routes
        state.routes.unshift({
          id: `route-user-${Date.now()}`,
          operator_id: sub.operator_name.toLowerCase().replace(/\s+/g, '-'),
          operator_name: sub.operator_name,
          service_number: 'PVT-NEW-01',
          origin: sub.origin,
          destination: sub.destination,
          route_category: 'Private Operators',
          bus_type: sub.bus_type,
          is_volvo: sub.is_volvo || false,
          is_ac: sub.is_ac || false,
          is_hrtc: false,
          is_local: sub.is_local || false,
          departure_time: sub.departure_time,
          arrival_time: sub.arrival_time,
          operating_days: sub.operating_days,
          frequency: 'Daily',
          daily_frequency_count: 1,
          fare: '₹150',
          depot: sub.district,
          district: sub.district,
          stops: [
            { name: sub.origin, dep: sub.departure_time },
            { name: sub.destination, arr: sub.arrival_time }
          ],
          source: `Verified Submission (${sub.source})`,
          source_url: 'Admin Verified',
          last_verified: new Date().toISOString().split('T')[0],
          verification_status: '✓ Verified'
        });

        state.submissions.splice(subIndex, 1);
        alert(`Operator "${sub.operator_name}" approved and route published with "✓ Verified" badge!`);
        switchView('admin');
      }
    });
  });

  // Reject Submission
  document.querySelectorAll('.btn-reject-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-sub-id');
      state.submissions = state.submissions.filter(s => s.id !== id);
      switchView('admin');
    });
  });

  // Resolve Report
  document.querySelectorAll('.btn-resolve-rep').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-rep-id');
      state.reports = state.reports.filter(r => r.id !== id);
      switchView('admin');
    });
  });
}

// ---------------------------------------------------------------------
// 13. MODALS (ADD OPERATOR & REPORT INCORRECT INFORMATION)
// ---------------------------------------------------------------------
function setupModalHandlers() {
  // Add Operator Modal Event
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'open-add-operator-modal') {
      openAddOperatorModal();
    }
  });

  // Close buttons
  document.getElementById('modal-close-add-op')?.addEventListener('click', closeModals);
  document.getElementById('modal-close-report')?.addEventListener('click', closeModals);
  document.querySelectorAll('.modal-backdrop').forEach(b => {
    b.addEventListener('click', (ev) => {
      if (ev.target === b) closeModals();
    });
  });

  // Add Operator Form Submission
  const addOpForm = document.getElementById('form-add-operator');
  if (addOpForm) {
    addOpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newSub = {
        id: `sub-${Date.now()}`,
        submitted_by: document.getElementById('op-submitter')?.value || 'Anonymous Passenger',
        operator_name: document.getElementById('op-name')?.value || '',
        headquarters: document.getElementById('op-hq')?.value || '',
        district: document.getElementById('op-district')?.value || 'Kangra',
        contact: document.getElementById('op-contact')?.value || '',
        origin: document.getElementById('op-origin')?.value || '',
        destination: document.getElementById('op-destination')?.value || '',
        bus_type: document.getElementById('op-bustype')?.value || 'Private Ordinary',
        departure_time: document.getElementById('op-deptime')?.value || '08:00 AM',
        arrival_time: document.getElementById('op-arrtime')?.value || '11:00 AM',
        operating_days: 'Daily',
        source: document.getElementById('op-source')?.value || 'User Submission',
        status: 'Pending Verification',
        date: new Date().toISOString().split('T')[0]
      };

      state.submissions.unshift(newSub);
      closeModals();
      alert('Thank you! Your new operator and route submission has been received and sent to the Admin Verification queue.');
    });
  }

  // Report Form Submission
  const reportForm = document.getElementById('form-report-issue');
  if (reportForm) {
    reportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.selectedRouteForReport) return;

      state.reports.unshift({
        id: `rep-${Date.now()}`,
        route_id: state.selectedRouteForReport.id,
        route_name: `${state.selectedRouteForReport.operator_name}: ${state.selectedRouteForReport.origin} → ${state.selectedRouteForReport.destination}`,
        issue_type: document.getElementById('rep-type')?.value || 'Timing Discrepancy',
        description: document.getElementById('rep-desc')?.value || '',
        submitted_by: document.getElementById('rep-name')?.value || 'Passenger',
        contact: document.getElementById('rep-contact')?.value || '',
        status: 'Open',
        date: new Date().toISOString().split('T')[0]
      });

      closeModals();
      alert('Thank you! Your report has been submitted to Himalayan Routes admin moderation team.');
    });
  }
}

function openAddOperatorModal() {
  const backdrop = document.getElementById('modal-add-operator-backdrop');
  if (backdrop) backdrop.classList.add('active');
}

function openReportModal(route) {
  state.selectedRouteForReport = route;
  const label = document.getElementById('report-route-label');
  if (label) label.textContent = `${route.operator_name}: ${route.origin} → ${route.destination}`;
  const backdrop = document.getElementById('modal-report-backdrop');
  if (backdrop) backdrop.classList.add('active');
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach(b => b.classList.remove('active'));
}
