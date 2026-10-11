/**
 * Gamezin - Módulo de Contador Discreto de Visitas e Análise por País
 * 
 * Funcionalidades:
 * - Contador de visitas discreto e minimalista no HUD com ícone de olho (👁️).
 * - Ao clicar no olho, abre modal glassmorphic com estatísticas de visitantes por país e bandeirinhas.
 * - Detecção automática de ambiente:
 *     - Localhost/File: Modo de demonstração com dados simulados elegantes sem inflar contagem real.
 *     - Versão Publicada (ex: GitHub Pages): Detecta país via IP e sincroniza contadores globais.
 * - Deduplicação por sessão de navegação (sessionStorage) para evitar contagens repetidas no F5.
 * - Renderização de bandeiras de alta definição via FlagCDN com fallback para emoji nativo.
 */

(() => {
  'use strict';

  // Configurações
  const STORAGE_KEY_SESSION = 'gamezin_visit_tracked_session';
  const STORAGE_KEY_KNOWN_COUNTRIES = 'gamezin_known_countries_v1';
  const STORAGE_KEY_MY_COUNTRY = 'gamezin_visitor_my_country';
  const COUNTAPI_NAMESPACE = 'brunodarwich-gamezin-2026';

  // Verifica se o ambiente é local ou publicado
  const isLocalEnv = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    ''
  ].includes(window.location.hostname) || window.location.protocol === 'file:';

  // Dicionário localizado dos principais países (código ISO-2 -> Nome em Português)
  const COUNTRY_NAMES_PT = {
    'BR': 'Brasil',
    'PT': 'Portugal',
    'US': 'Estados Unidos',
    'ES': 'Espanha',
    'AR': 'Argentina',
    'UY': 'Uruguai',
    'CL': 'Chile',
    'CO': 'Colômbia',
    'MX': 'México',
    'PE': 'Peru',
    'FR': 'França',
    'DE': 'Alemanha',
    'GB': 'Reino Unido',
    'IT': 'Itália',
    'JP': 'Japão',
    'CA': 'Canadá',
    'AU': 'Austrália',
    'IE': 'Irlanda',
    'NL': 'Países Baixos',
    'CH': 'Suíça',
    'SE': 'Suécia',
    'NO': 'Noruega',
    'RU': 'Rússia',
    'CN': 'China',
    'KR': 'Coreia do Sul',
    'IN': 'Índia',
    'AO': 'Angola',
    'MZ': 'Moçambique',
    'CV': 'Cabo Verde',
    'ZA': 'África do Sul'
  };

  // Conversão de código ISO-2 para emoji de bandeira como fallback imediato
  function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const code = countryCode.toUpperCase();
    const offset = 127397;
    return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset);
  }

  // Lista padrão de países monitorados
  const DEFAULT_MONITORED_COUNTRIES = ['BR', 'PT', 'US', 'ES', 'AR', 'FR', 'DE', 'GB', 'JP', 'CA', 'CL', 'MX', 'UY', 'IT'];

  // Dados simulados para ambiente local / desenvolvimento
  const DEMO_STATS = {
    total: 128,
    isDemo: true,
    countries: [
      { code: 'BR', name: 'Brasil', count: 86, percentage: 67 },
      { code: 'PT', name: 'Portugal', count: 18, percentage: 14 },
      { code: 'US', name: 'Estados Unidos', count: 11, percentage: 9 },
      { code: 'ES', name: 'Espanha', count: 6, percentage: 5 },
      { code: 'JP', name: 'Japão', count: 4, percentage: 3 },
      { code: 'AR', name: 'Argentina', count: 3, percentage: 2 }
    ]
  };

  // Estado da aplicação
  const state = {
    totalVisits: 0,
    countriesData: [],
    detectedCountry: null,
    isLoaded: false,
    isDemo: isLocalEnv,
    isLoadingStats: false
  };

  // Referências aos elementos do DOM
  let elBadge = null;
  let elBtnStats = null;
  let elCountDisplay = null;
  let elModal = null;
  let elModalTotal = null;
  let elCountriesList = null;
  let elCloseModal = null;
  let elEnvTag = null;

  /**
   * Inicializa o rastreador após o carregamento do DOM
   */
  function init() {
    bindDomElements();
    if (!elBtnStats) {
      console.warn('[VisitorCounter] Elementos do HUD não encontrados. Tentando novamente...');
      setTimeout(init, 300);
      return;
    }

    setupEventListeners();

    if (state.isDemo) {
      // Modo Local / Dev
      applyDemoStats();
    } else {
      // Modo Publicado (Produção)
      trackProductionVisit();
    }
  }

  /**
   * Associa os elementos HTML
   */
  function bindDomElements() {
    elBadge = document.getElementById('visitorBadge');
    elBtnStats = document.getElementById('btnVisitorStats');
    elCountDisplay = document.getElementById('visitorCountDisplay');
    elModal = document.getElementById('visitorModal');
    elModalTotal = document.getElementById('modalTotalVisits');
    elCountriesList = document.getElementById('visitorCountriesList');
    elCloseModal = document.getElementById('btnCloseVisitorModal');
    elEnvTag = document.getElementById('visitorEnvTag');
  }

  /**
   * Configura listeners de eventos do botão, modal e teclado
   */
  function setupEventListeners() {
    if (elBtnStats) {
      elBtnStats.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal();
      });
    }

    if (elCloseModal) {
      elCloseModal.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
      });
    }

    if (elModal) {
      // Fecha ao clicar no backdrop escuro fora do card
      elModal.addEventListener('click', (e) => {
        if (e.target === elModal) {
          closeModal();
        }
      });
    }

    // Fecha modal ao pressionar ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elModal && !elModal.classList.contains('visitor-ui-hidden')) {
        closeModal();
      }
    });
  }

  /**
   * Aplica dados simulados no modo Local / Dev
   */
  function applyDemoStats() {
    state.totalVisits = DEMO_STATS.total;
    state.countriesData = DEMO_STATS.countries;
    state.isLoaded = true;

    updateBadgeDisplay(state.totalVisits);

    if (elEnvTag) {
      elEnvTag.textContent = '🟡 Modo Local / Demo';
      elEnvTag.className = 'visitor-tag visitor-tag-demo';
      elEnvTag.title = 'Em localhost, números simulados evitam poluir as métricas da versão publicada.';
    }
  }

  /**
   * Detecta país e incrementa contadores na versão publicada
   */
  async function trackProductionVisit() {
    const alreadyTracked = sessionStorage.getItem(STORAGE_KEY_SESSION);

    try {
      // 1. Detecta o país do visitante se ainda não salvo
      let myCountry = localStorage.getItem(STORAGE_KEY_MY_COUNTRY);
      if (!myCountry) {
        myCountry = await detectVisitorCountry();
        if (myCountry) {
          localStorage.setItem(STORAGE_KEY_MY_COUNTRY, myCountry);
        }
      }
      state.detectedCountry = myCountry || 'BR';

      // 2. Registra o país na lista de países conhecidos
      addKnownCountry(state.detectedCountry);

      // 3. Se for uma nova sessão no site publicado, incrementa no CountAPI
      if (!alreadyTracked) {
        await incrementHit(state.detectedCountry);
        sessionStorage.setItem(STORAGE_KEY_SESSION, '1');
      }

      // 4. Carrega as estatísticas consolidadas
      await fetchConsolidatedStats();

    } catch (err) {
      console.warn('[VisitorCounter] Erro ao sincronizar contadores:', err);
      // Fallback suave com estimativa se houver falha de rede externa
      if (!state.isLoaded) {
        applyDemoStats();
      }
    }
  }

  /**
   * Detecta o país do usuário via serviço gratuito com CORS
   */
  async function detectVisitorCountry() {
    try {
      const res = await fetch('https://api.country.is', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.country) return data.country.toUpperCase();
      }
    } catch (e) {
      // Fallback secundário
      try {
        const res2 = await fetch('https://ipapi.co/json/');
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2 && data2.country_code) return data2.country_code.toUpperCase();
        }
      } catch (err2) {
        // Ignora silenciosamente
      }
    }
    return null;
  }

  /**
   * Adiciona um país à lista local de países conhecidos
   */
  function addKnownCountry(code) {
    if (!code) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_KNOWN_COUNTRIES);
      let list = stored ? JSON.parse(stored) : [...DEFAULT_MONITORED_COUNTRIES];
      if (!list.includes(code)) {
        list.push(code);
        localStorage.setItem(STORAGE_KEY_KNOWN_COUNTRIES, JSON.stringify(list));
      }
    } catch (e) {
      // localStorage pode falhar em modo restrito
    }
  }

  /**
   * Retorna todos os países monitorados
   */
  function getMonitoredCountries() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_KNOWN_COUNTRIES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_MONITORED_COUNTRIES;
  }

  /**
   * Incrementa a contagem geral e a contagem do país do visitante
   */
  async function incrementHit(countryCode) {
    try {
      // Incrementa total geral
      const totalPromise = fetch(`https://countapi.mileshilliard.com/api/v1/hit/${COUNTAPI_NAMESPACE}-total`)
        .then(r => r.json())
        .catch(() => null);

      // Incrementa país específico
      let countryPromise = Promise.resolve(null);
      if (countryCode) {
        countryPromise = fetch(`https://countapi.mileshilliard.com/api/v1/hit/${COUNTAPI_NAMESPACE}-c-${countryCode}`)
          .then(r => r.json())
          .catch(() => null);
      }

      await Promise.all([totalPromise, countryPromise]);
    } catch (e) {
      console.warn('[VisitorCounter] Falha ao registrar hit:', e);
    }
  }

  /**
   * Busca as contagens consolidadas (Total + Países)
   */
  async function fetchConsolidatedStats() {
    state.isLoadingStats = true;

    try {
      // 1. Busca total geral
      let total = 0;
      try {
        const resTotal = await fetch(`https://countapi.mileshilliard.com/api/v1/get/${COUNTAPI_NAMESPACE}-total`);
        if (resTotal.ok) {
          const data = await resTotal.json();
          total = Number(data.value) || 0;
        }
      } catch (e) {}

      // Se for a primeira visita e total for 0, usa valor base suave
      if (total === 0) total = 1;
      state.totalVisits = total;
      updateBadgeDisplay(total);

      // 2. Busca contagem de cada país conhecido em paralelo
      const countriesToFetch = getMonitoredCountries();
      const fetchPromises = countriesToFetch.map(async (code) => {
        try {
          const r = await fetch(`https://countapi.mileshilliard.com/api/v1/get/${COUNTAPI_NAMESPACE}-c-${code}`);
          if (r.ok) {
            const d = await r.json();
            const count = Number(d.value) || 0;
            return { code, count };
          }
        } catch (e) {}
        return { code, count: 0 };
      });

      const results = await Promise.all(fetchPromises);

      // Filtra países com visitas > 0 e ordena descrescente
      let activeCountries = results
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      // Se nenhum país tiver contagem (novo deploy), inclui o país atual do usuário com pelo menos 1
      if (activeCountries.length === 0 && state.detectedCountry) {
        activeCountries.push({ code: state.detectedCountry, count: 1 });
      }

      // Calcula porcentagem e formata nomes
      const sumActive = activeCountries.reduce((acc, curr) => acc + curr.count, 0) || total;
      state.countriesData = activeCountries.map(item => {
        const pct = Math.max(1, Math.round((item.count / Math.max(sumActive, 1)) * 100));
        return {
          code: item.code,
          name: COUNTRY_NAMES_PT[item.code] || item.code,
          count: item.count,
          percentage: pct
        };
      });

      state.isLoaded = true;

      if (elEnvTag) {
        elEnvTag.textContent = '🟢 Versão Publicada';
        elEnvTag.className = 'visitor-tag visitor-tag-live';
        elEnvTag.title = 'Métricas sincronizadas em tempo real.';
      }

    } catch (err) {
      console.warn('[VisitorCounter] Erro ao consolidar estatísticas:', err);
    } finally {
      state.isLoadingStats = false;
    }
  }

  /**
   * Atualiza o badge discreto no HUD
   */
  function updateBadgeDisplay(count) {
    if (!elCountDisplay) return;
    const formatted = formatNumber(count);
    elCountDisplay.textContent = formatted;
  }

  /**
   * Formata números com separador de milhar elegante (ex: 1.420)
   */
  function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '--';
    return num.toLocaleString('pt-BR');
  }

  /**
   * Abre o modal e renderiza os dados
   */
  function openModal() {
    if (!elModal) return;

    renderModalContent();
    elModal.classList.remove('visitor-ui-hidden');

    // Se estiver no site publicado e os dados não forem recentes, atualiza em background
    if (!state.isDemo && !state.isLoadingStats) {
      fetchConsolidatedStats().then(() => {
        renderModalContent();
      });
    }
  }

  /**
   * Fecha o modal
   */
  function closeModal() {
    if (!elModal) return;
    elModal.classList.add('visitor-ui-hidden');
  }

  /**
   * Renderiza a lista de países com bandeirinhas e barras de progresso
   */
  function renderModalContent() {
    if (elModalTotal) {
      elModalTotal.textContent = formatNumber(state.totalVisits);
    }

    if (!elCountriesList) return;

    if (!state.countriesData || state.countriesData.length === 0) {
      elCountriesList.innerHTML = `
        <div class="visitor-empty-state">
          <span class="visitor-empty-icon">🌍</span>
          <p>Nenhuma visita registrada ainda.</p>
          <small>As novas visualizações aparecerão aqui automaticamente.</small>
        </div>
      `;
      return;
    }

    let html = '';
    state.countriesData.forEach((item, index) => {
      const rank = index + 1;
      const lowerCode = item.code.toLowerCase();
      const flagEmoji = getFlagEmoji(item.code);
      const isMyCountry = state.detectedCountry === item.code;

      html += `
        <div class="country-row ${isMyCountry ? 'country-row-active' : ''}">
          <div class="country-rank">#${rank}</div>
          <div class="country-flag-box">
            <img 
              class="country-flag-img" 
              src="https://flagcdn.com/w40/${lowerCode}.png" 
              srcset="https://flagcdn.com/w80/${lowerCode}.png 2x" 
              alt="Bandeira ${item.name}" 
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"
            />
            <span class="country-flag-fallback" style="display: none;">${flagEmoji}</span>
          </div>
          <div class="country-details">
            <div class="country-info-line">
              <span class="country-name">${escapeHtml(item.name)} ${isMyCountry ? '<span class="country-you-tag">Você</span>' : ''}</span>
              <span class="country-count-label"><strong>${formatNumber(item.count)}</strong> <small>(${item.percentage}%)</small></span>
            </div>
            <div class="country-progress-track">
              <div class="country-progress-fill" style="width: ${Math.min(100, Math.max(4, item.percentage))}%;"></div>
            </div>
          </div>
        </div>
      `;
    });

    elCountriesList.innerHTML = html;
  }

  /**
   * Previne XSS simples na exibição
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Inicializa quando o documento estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exporta objeto global leve para depuração ou testes via console
  window.VisitorCounter = {
    getState: () => ({ ...state }),
    open: openModal,
    close: closeModal,
    refresh: fetchConsolidatedStats
  };
})();
