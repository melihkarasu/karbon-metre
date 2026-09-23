function safeCopyToClipboard(text, msg) {
  if (window.copyToClipboard) {
    window.copyToClipboard(text, msg);
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
    }).catch(() => fallbackExecCopy(text, msg));
  } else {
    fallbackExecCopy(text, msg);
  }
}
function fallbackExecCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
  } catch(e) {
    if (window.showToast) window.showToast('Kopyalama başarısız');
  }
  document.body.removeChild(ta);
}

const STORAGE_KEY = '***';
        let currentAnalysis = null;

        // 1. Karbon Analizi Çalıştır
        async function runCarbonAnalysis(customUrl = null) {
          const url = customUrl || document.getElementById('input-site-url').value.trim();
          if (!url) return;

          showLoading(true);

          try {
            const res = await fetch(`/api/carbon/analyze?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (!data.success) {
              throw new Error(data.error || 'Analiz başarısız');
            }

            currentAnalysis = data;
            renderResults(data);
            saveToRecentScans(data);
          } catch(err) {
            showToast('Analiz sırasında bir hata oluştu: ' + err.message);
          } finally {
            showLoading(false);
          }
        }

        function quickAnalyze(url) {
          document.getElementById('input-site-url').value = url;
          runCarbonAnalysis(url);
        }

        function showLoading(show) {
          const spin = document.getElementById('loading-spinner');
          const resBox = document.getElementById('analysis-results');
          if (show) {
            spin.classList.remove('hidden');
            resBox.classList.add('hidden');
          } else {
            spin.classList.add('hidden');
          }
        }

        // 2. Analiz Sonuçlarını Ekrana Çiz
        function renderResults(data) {
          document.getElementById('analysis-results').classList.remove('hidden');

          // URL ve Zaman
          document.getElementById('res-site-url').innerText = data.cleanHost;
          document.getElementById('res-timestamp').innerText = new Date(data.timestamp).toLocaleString('tr-TR');

          // Eko Notu (A+, A, B, C...)
          const gradeBadge = document.getElementById('res-grade-badge');
          gradeBadge.innerText = data.grade;
          gradeBadge.className = `w-24 h-24 rounded-full border-4 flex items-center justify-center font-black text-4xl shadow-inner mb-3 eco-grade-${data.grade.replace('+', '-plus')}`;

          document.getElementById('res-cleaner-pct').innerText = `Web sayfalarının %${data.cleanerThan}'inden daha temiz`;
          document.getElementById('res-co2-grams').innerText = data.co2Grams.toFixed(3);

          // Yeşil Hosting Rozeti
          const hostBadge = document.getElementById('res-green-host-badge');
          if (data.isGreen) {
            hostBadge.className = 'px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 flex items-center gap-2 text-xs font-bold shrink-0';
            hostBadge.innerHTML = `<span>🌿</span> <span>Yeşil Hosting (${data.hostingProvider || 'Yenilenebilir'})</span>`;
          } else {
            hostBadge.className = 'px-3 py-1.5 rounded-xl border border-mistral-hairline bg-white text-mistral-slate flex items-center gap-2 text-xs font-bold shrink-0';
            hostBadge.innerHTML = `<span>⚡</span> <span>Standart Şebeke Elektriği</span>`;
          }

          // Teknik Metrikler
          const kb = (data.bytes / 1024).toFixed(0);
          document.getElementById('res-page-size').innerText = kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb + ' KB';
          document.getElementById('res-ttfb').innerText = data.durationMs + ' ms';
          document.getElementById('res-compression').innerText = data.compressed ? `Aktif (${data.encoding})` : 'Kapalı';

          // Simülasyonu güncelle
          updateSimulatedImpact();

          // Rozet Oluştur
          generateBadgePreview(data);

          // Sayfayı yumuşakça kaydır
          document.getElementById('analysis-results').scrollIntoView({ behavior: 'smooth' });
        }

        // 3. Yıllık Etki Simülasyonu
        function updateSimulatedImpact() {
          if (!currentAnalysis) return;

          const visitors = parseInt(document.getElementById('input-visitors-slider').value) || 10000;
          document.getElementById('slider-visitors-label').innerText = visitors.toLocaleString('tr-TR') + ' / ay';

          const annualViews = visitors * 12;
          const annualCo2Kg = (annualViews * currentAnalysis.co2Grams) / 1000;

          document.getElementById('sim-annual-co2').innerText = annualCo2Kg.toFixed(1) + ' kg';

          // 1 ağaç yılda ~21 kg CO2 emer
          const trees = Math.max(1, Math.round(annualCo2Kg / 21));
          document.getElementById('sim-trees').innerText = trees + ' Ağaç';

          // Elektrikli araç km hesabı (~0.18 kg CO2 / kWh -> ~5.5 km / kg CO2)
          const evKm = Math.round(annualCo2Kg * 5.5);
          document.getElementById('sim-ev-km').innerText = evKm.toLocaleString('tr-TR') + ' km';

          // Akıllı telefon şarjı (~8 gram CO2 / tam şarj)
          const phones = Math.round((annualCo2Kg * 1000) / 8.2);
          document.getElementById('sim-phones').innerText = phones.toLocaleString('tr-TR') + ' Kez';
        }

        // 4. Gömülebilir Rozet Oluşturucu
        function generateBadgePreview(data) {
          const badgeUrl = `${window.location.origin}/api/carbon/badge?url=${encodeURIComponent(data.cleanHost)}`;
          const container = document.getElementById('badge-preview-container');

          container.innerHTML = `
            <img src="${badgeUrl}" alt="Eko-Skor Rozeti" class="shadow-lg rounded-md">
          `;

          const htmlCode = `<a href="${window.location.origin}/app/karbon-metre" target="_blank" rel="noopener"><img src="${badgeUrl}" alt="Web Karbon Ayak İzi" /></a>`;
          const mdCode = `[![Web Karbon Ayak İzi](${badgeUrl})](${window.location.origin}/app/karbon-metre)`;

          document.getElementById('badge-snippet-html').value = htmlCode;
          document.getElementById('badge-snippet-md').value = mdCode;
        }

        function copyBadgeSnippet() {
          const htmlSnippet = document.getElementById('badge-snippet-html').value;
          navigator.clipboard.writeText(htmlSnippet).then(() => {
            showToast('✓ HTML rozet kodu panoya kopyalandı!');
          });
        }

        // 5. Son Taramalar Geçmişi (Storage)
        function getRecentScans() {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          } catch(e) {
            return [];
          }
        }

        function saveToRecentScans(data) {
          let list = getRecentScans();
          list = list.filter(item => item.cleanHost !== data.cleanHost);
          list.unshift({
            cleanHost: data.cleanHost,
            co2Grams: data.co2Grams,
            grade: data.grade,
            isGreen: data.isGreen,
            date: new Date().toLocaleDateString('tr-TR')
          });
          if (list.length > 8) list = list.slice(0, 8);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          renderRecentScans();
        }

        function renderRecentScans() {
          const grid = document.getElementById('recent-scans-grid');
          const empty = document.getElementById('recent-scans-empty');
          const list = getRecentScans();

          if (list.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
          }

          empty.classList.add('hidden');
          grid.innerHTML = list.map(item => `
            <div class="p-4 rounded-2xl bg-white border border-mistral-hairline hover:border-lime-500/40 transition cursor-pointer flex items-center justify-between" onclick="quickAnalyze('https://${item.cleanHost}')">
              <div class="min-w-0 pr-2">
                <h4 class="font-bold text-xs text-mistral-ink truncate">${item.cleanHost}</h4>
                <div class="flex items-center gap-1.5 text-[10px] text-mistral-slate mt-0.5">
                  <span class="font-mono text-lime-400 font-bold">${item.co2Grams.toFixed(2)}g CO2</span>
                  <span>•</span>
                  <span>${item.date}</span>
                </div>
              </div>
              <span class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 eco-grade-${item.grade.replace('+', '-plus')}">
                ${item.grade}
              </span>
            </div>
          `).join('');
        }

        function clearRecentScans() {
          if (!confirm('Tüm geçmiş analiz kayıtlarını silmek istediğinize emin misiniz?')) return;
          localStorage.removeItem(STORAGE_KEY);
          renderRecentScans();
        }

        function showToast(msg) {
          const toast = document.getElementById('carbon-toast');
          toast.innerText = msg;
          toast.classList.remove('hidden');
          setTimeout(() => toast.classList.add('hidden'), 3500);
        }

        // Başlangıç
        document.addEventListener('DOMContentLoaded', () => {
          renderRecentScans();
        });
