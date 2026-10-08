/* VidaLeve — Fase 11: Assistente VidaLeve
   Módulo "drop-in": integra-se ao app.js existente sem alterar os dados automaticamente.
   Instalação: no index.html, depois de <script src="app.js"></script>, adicione:
   <script src="fase11.js"></script>
*/
(function () {
  "use strict";

  const STORE = "VIDALEVE_ASSISTENTE_APROVADAS_V11";
  const STYLE_ID = "vidaleve-fase11-style";
  const TAB_ID = "tab-assistente-v11";
  const PAGE_ID = "assistente";

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function isoToday() {
    const d = new Date();
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }

  function dateObj(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(+m[1], +m[2]-1, +m[3]) : null;
  }

  function addDays(iso, n) {
    const d = dateObj(iso) || new Date();
    d.setDate(d.getDate() + n);
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }

  function daysBetween(start, end) {
    const a = dateObj(start), b = dateObj(end), out = [];
    if (!a || !b || a > b) return out;
    for (let d = new Date(a); d <= b; d.setDate(d.getDate()+1)) {
      out.push(new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,10));
    }
    return out;
  }

  function appProfile() {
    try { return typeof p === "function" ? p() : null; } catch (_) { return null; }
  }

  function foodDay(x, d) {
    const rows = (x.foods || []).filter(z => z.date === d);
    return rows.reduce((s,z) => ({
      cal:s.cal + (+z.cal||0), p:s.p + (+z.p||0), c:s.c + (+z.c||0),
      f:s.f + (+z.f||0), fi:s.fi + (+z.fi||0)
    }), {cal:0,p:0,c:0,f:0,fi:0});
  }

  function exerciseDay(x, d) {
    if (typeof exTotals === "function") return exTotals(x,d);
    const rows = (x.exercises || []).filter(z => z.date === d);
    return {cal:rows.reduce((s,z)=>s+(+z.cal||0),0),
            min:rows.reduce((s,z)=>s+(+z.min||0),0)};
  }

  function weightRows(x, start, end) {
    return (x.weights || [])
      .filter(z => z.date >= start && z.date <= end)
      .map(z => ({date:z.date, value:+z.value||0}))
      .filter(z => z.value > 0)
      .sort((a,b) => a.date.localeCompare(b.date));
  }

  function linearSlope(rows) {
    if (rows.length < 2) return 0;
    const t0 = dateObj(rows[0].date).getTime();
    const xs = rows.map(r => (dateObj(r.date).getTime()-t0)/86400000);
    const ys = rows.map(r => r.value);
    const xm = xs.reduce((a,b)=>a+b,0)/xs.length;
    const ym = ys.reduce((a,b)=>a+b,0)/ys.length;
    const num = xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0);
    const den = xs.reduce((s,x)=>s+(x-xm)**2,0);
    return den ? num/den : 0;
  }

  function avg(values) {
    return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
  }

  function needsSafe(x) {
    try {
      if (typeof needs === "function") return needs(x) || {};
    } catch (_) {}
    return {};
  }

  function analyze(period) {
    const x = appProfile();
    if (!x) return null;

    const end = isoToday();
    const start = addDays(end, -(period-1));
    const days = daysBetween(start,end);

    const foods = days.map(d => foodDay(x,d));
    const exercises = days.map(d => exerciseDay(x,d));
    const foodDays = foods.filter(z => z.cal > 0);
    const exerciseDays = exercises.filter(z => z.min > 0);
    const weights = weightRows(x,start,end);
    const n = needsSafe(x);

    const avgCal = avg(foodDays.map(z=>z.cal));
    const avgProt = avg(foodDays.map(z=>z.p));
    const totalExMin = exercises.reduce((s,z)=>s+(+z.min||0),0);
    const totalExCal = exercises.reduce((s,z)=>s+(+z.cal||0),0);
    const activeDays = exerciseDays.length;
    const loggedDays = days.filter((d,i) =>
      foods[i].cal > 0 || exercises[i].min > 0 || weights.some(w=>w.date===d)
    ).length;

    const firstW = weights[0]?.value || 0;
    const lastW = weights.at(-1)?.value || 0;
    const change = firstW && lastW ? lastW-firstW : 0;
    const slopeWeek = linearSlope(weights) * 7;

    const calorieTarget = +n.cal || 0;
    const proteinTarget = +n.p || 0;

    const findings = [];
    const suggestions = [];

    if (weights.length >= 2) {
      if (Math.abs(change) < 0.2 && weights.length >= 2) {
        findings.push({
          type:"attention", title:"Peso estável",
          text:"A variação do peso no período foi pequena. Isso pode indicar estabilidade ou um platô."
        });
        suggestions.push({
          id:"peso-estavel",
          title:"Revisar o planejamento da semana",
          text:"Compare as porções e a regularidade das refeições antes de fazer mudanças maiores.",
          reason:"O peso apresentou pouca variação no período."
        });
      } else if (change < 0) {
        findings.push({
          type:"good", title:"Tendência de queda",
          text:`O peso variou ${Math.abs(change).toFixed(1)} kg para baixo no período.`
        });
      } else if (change > 0) {
        findings.push({
          type:"attention", title:"Tendência de alta",
          text:`O peso variou ${change.toFixed(1)} kg para cima no período.`
        });
        suggestions.push({
          id:"peso-alta",
          title:"Revisar porções e regularidade",
          text:"Revise as refeições registradas e mantenha o planejamento consistente antes de alterar metas.",
          reason:"Foi observada tendência de alta no peso."
        });
      }
    } else {
      findings.push({
        type:"neutral", title:"Poucos dados de peso",
        text:"Registre mais pesos para que a tendência seja interpretada com maior confiança."
      });
    }

    if (foodDays.length) {
      if (calorieTarget && avgCal < calorieTarget*0.80) {
        findings.push({
          type:"attention", title:"Ingestão média baixa",
          text:`A média registrada ficou em ${Math.round(avgCal)} kcal/dia, abaixo de 80% da meta estimada.`
        });
        suggestions.push({
          id:"calorias-baixas",
          title:"Revisar a distribuição das refeições",
          text:"Verifique se o planejamento está deixando refeições muito pequenas ou sem registro.",
          reason:"A média de calorias ficou bem abaixo da meta estimada."
        });
      } else if (calorieTarget && avgCal <= calorieTarget*1.10) {
        findings.push({
          type:"good", title:"Calorias próximas da referência",
          text:`A média registrada foi de ${Math.round(avgCal)} kcal/dia.`
        });
      } else if (calorieTarget) {
        findings.push({
          type:"attention", title:"Calorias acima da referência",
          text:`A média registrada foi de ${Math.round(avgCal)} kcal/dia.`
        });
        suggestions.push({
          id:"calorias-altas",
          title:"Planejar melhor as refeições mais calóricas",
          text:"Identifique onde a maior parte das calorias está concentrada e distribua melhor as porções.",
          reason:"A média ficou acima da meta estimada."
        });
      }

      if (proteinTarget && avgProt < proteinTarget*0.80) {
        findings.push({
          type:"attention", title:"Proteína abaixo da meta",
          text:`Média de ${avgProt.toFixed(1)} g/dia frente a uma referência de ${proteinTarget.toFixed(1)} g.`
        });
        suggestions.push({
          id:"proteina",
          title:"Priorizar proteína no planejamento",
          text:"Ao revisar as refeições, priorize fontes proteicas nas refeições principais.",
          reason:"A média de proteína ficou abaixo de 80% da referência."
        });
      } else if (proteinTarget) {
        findings.push({
          type:"good", title:"Proteína adequada",
          text:`Média registrada de ${avgProt.toFixed(1)} g/dia.`
        });
      }
    } else {
      findings.push({
        type:"neutral", title:"Sem dados alimentares",
        text:"Registre as refeições para que o assistente consiga avaliar a alimentação."
      });
    }

    const weeklyEquivalent = period === 7 ? totalExMin : totalExMin / period * 7;
    if (weeklyEquivalent >= 150) {
      findings.push({
        type:"good", title:"Boa atividade física",
        text:`Foram registrados ${Math.round(totalExMin)} minutos de exercício no período.`
      });
    } else if (totalExMin > 0) {
      findings.push({
        type:"attention", title:"Atividade abaixo da referência",
        text:`Foram registrados ${Math.round(totalExMin)} minutos no período.`
      });
      suggestions.push({
        id:"exercicio",
        title:"Distribuir melhor a atividade na semana",
        text:"Programe sessões em dias diferentes para tornar a rotina mais regular.",
        reason:"O volume registrado ficou abaixo da referência semanal de 150 minutos."
      });
    } else {
      findings.push({
        type:"neutral", title:"Sem exercícios registrados",
        text:"Não há atividade física registrada no período."
      });
      suggestions.push({
        id:"exercicio-zero",
        title:"Adicionar atividade ao planejamento",
        text:"Reserve horários realistas para atividade física na próxima semana.",
        reason:"Não houve exercícios registrados no período."
      });
    }

    const regularity = days.length ? loggedDays/days.length*100 : 0;
    if (regularity >= 80) {
      findings.push({
        type:"good", title:"Boa regularidade",
        text:`Há registros em ${loggedDays} de ${days.length} dias (${Math.round(regularity)}%).`
      });
    } else {
      findings.push({
        type:"attention", title:"Regularidade pode melhorar",
        text:`Há registros em ${loggedDays} de ${days.length} dias (${Math.round(regularity)}%).`
      });
      suggestions.push({
        id:"regularidade",
        title:"Planejar os registros da semana",
        text:"Use o planejamento semanal para deixar refeições e exercícios definidos antes do dia começar.",
        reason:"Há muitos dias sem registros suficientes."
      });
    }

    // Remove duplicate suggestions by id.
    const unique = [];
    const seen = new Set();
    suggestions.forEach(s => { if (!seen.has(s.id)) { seen.add(s.id); unique.push(s); } });

    return {
      period,start,end,days,foodDays,weights,
      avgCal,avgProt,totalExMin,totalExCal,activeDays,loggedDays,regularity,
      calorieTarget,proteinTarget,firstW,lastW,change,slopeWeek,
      findings,suggestions:unique
    };
  }

  function getApproved() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]"); }
    catch (_) { return []; }
  }

  function saveApproved(items) {
    localStorage.setItem(STORE, JSON.stringify(items));
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #${PAGE_ID} .assistant-hero{background:#111;color:#fff;border-radius:10px;padding:18px;margin-bottom:14px}
      #${PAGE_ID} .assistant-hero h2{margin:0 0 5px}
      #${PAGE_ID} .assistant-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end}
      #${PAGE_ID} .assistant-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
      #${PAGE_ID} .assistant-kpi{background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px}
      #${PAGE_ID} .assistant-kpi b{font-size:20px;display:block;margin-bottom:4px}
      #${PAGE_ID} .assistant-list{display:grid;gap:10px}
      #${PAGE_ID} .assistant-item{background:#fff;border:1px solid #ddd;border-radius:8px;padding:13px}
      #${PAGE_ID} .assistant-item.good{border-left:5px solid #287a3d}
      #${PAGE_ID} .assistant-item.attention{border-left:5px solid #9a5b00}
      #${PAGE_ID} .assistant-item.neutral{border-left:5px solid #777}
      #${PAGE_ID} .assistant-item p{margin:6px 0 0;line-height:1.45}
      #${PAGE_ID} .suggestion{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;background:#fafafa;border:1px solid #ddd;border-radius:8px;padding:13px}
      #${PAGE_ID} .suggestion input{margin-top:3px}
      #${PAGE_ID} .suggestion-title{font-weight:bold}
      #${PAGE_ID} .assistant-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      #${PAGE_ID} .approved{border-left:5px solid #287a3d;background:#f6fbf7}
      #${PAGE_ID} .small-note{font-size:12px;color:#777;line-height:1.45}
      @media(max-width:650px){#${PAGE_ID} .assistant-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function buildUI() {
    injectStyle();

    const nav = document.getElementById("tabs");
    const main = document.querySelector("main");
    if (!nav || !main) return;

    if (!document.getElementById(TAB_ID)) {
      const b = document.createElement("button");
      b.id = TAB_ID;
      b.dataset.page = PAGE_ID;
      b.textContent = "Assistente";
      nav.appendChild(b);
      b.onclick = () => {
        document.querySelectorAll(".page").forEach(s=>s.classList.remove("active"));
        document.querySelectorAll("#tabs button").forEach(q=>q.classList.remove("active"));
        document.getElementById(PAGE_ID).classList.add("active");
        b.classList.add("active");
        render();
      };
    }

    if (!document.getElementById(PAGE_ID)) {
      const sec = document.createElement("section");
      sec.id = PAGE_ID;
      sec.className = "page";
      sec.innerHTML = `
        <div class="assistant-hero">
          <h2>Assistente VidaLeve</h2>
          <div>Analisa os dados registrados, identifica padrões e apresenta sugestões para você revisar.</div>
        </div>

        <div class="card assistant-controls">
          <label>Período
            <select id="v11Period">
              <option value="7">Últimos 7 dias</option>
              <option value="30" selected>Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </label>
          <button id="v11Analyze">Analisar agora</button>
        </div>

        <div class="section-title">Resumo da análise</div>
        <div id="v11Kpis" class="assistant-summary"></div>

        <div class="section-title">Padrões identificados</div>
        <div id="v11Findings" class="assistant-list"></div>

        <div class="section-title">Sugestões para revisão</div>
        <div class="card">
          <p class="small-note">As sugestões não alteram seus dados nem seu planejamento automaticamente. Marque apenas as que deseja aprovar e confirme.</p>
          <div id="v11Suggestions" class="assistant-list"></div>
          <div class="assistant-actions">
            <button id="v11Approve">Aprovar selecionadas</button>
            <button id="v11Clear" class="secondary">Limpar seleção</button>
          </div>
          <div id="v11Message" class="success"></div>
        </div>

        <div class="section-title">Sugestões aprovadas</div>
        <div class="card">
          <div id="v11Approved" class="assistant-list"></div>
        </div>
      `;
      main.appendChild(sec);
    }

    document.getElementById("v11Analyze").onclick = render;
    document.getElementById("v11Period").onchange = render;
    document.getElementById("v11Clear").onclick = () => {
      document.querySelectorAll("#v11Suggestions input[type=checkbox]").forEach(x=>x.checked=false);
      const m=document.getElementById("v11Message"); if(m)m.textContent="";
    };
    document.getElementById("v11Approve").onclick = approveSelected;

    // Make the new tab compatible with the existing navigation render cycle.
    const oldRenderAll = window.renderAll;
    if (typeof oldRenderAll === "function" && !oldRenderAll.__v11wrapped) {
      const wrapped = function () {
        const r = oldRenderAll.apply(this, arguments);
        if (document.getElementById(PAGE_ID)?.classList.contains("active")) render();
        return r;
      };
      wrapped.__v11wrapped = true;
      window.renderAll = wrapped;
    }

    render();
  }

  function render() {
    const root = document.getElementById(PAGE_ID);
    if (!root) return;
    const period = +(document.getElementById("v11Period")?.value || 30);
    const a = analyze(period);
    if (!a) return;

    document.getElementById("v11Kpis").innerHTML = `
      <div class="assistant-kpi"><b>${a.firstW && a.lastW ? a.lastW.toFixed(1)+" kg" : "—"}</b><span>Peso mais recente</span></div>
      <div class="assistant-kpi"><b>${a.change ? (a.change>0?"+":"")+a.change.toFixed(1)+" kg" : "0,0 kg"}</b><span>Variação no período</span></div>
      <div class="assistant-kpi"><b>${a.avgCal ? Math.round(a.avgCal)+" kcal" : "—"}</b><span>Média alimentar/dia</span></div>
      <div class="assistant-kpi"><b>${a.avgProt ? a.avgProt.toFixed(1)+" g" : "—"}</b><span>Proteína média/dia</span></div>
      <div class="assistant-kpi"><b>${Math.round(a.totalExMin)} min</b><span>Exercício registrado</span></div>
      <div class="assistant-kpi"><b>${Math.round(a.regularity)}%</b><span>Regularidade</span></div>
    `;

    document.getElementById("v11Findings").innerHTML = a.findings.map(f => `
      <div class="assistant-item ${esc(f.type)}">
        <strong>${esc(f.title)}</strong>
        <p>${esc(f.text)}</p>
      </div>
    `).join("") || `<div class="assistant-item neutral">Não há dados suficientes para análise.</div>`;

    document.getElementById("v11Suggestions").innerHTML = a.suggestions.length
      ? a.suggestions.map(s => `
        <label class="suggestion">
          <input type="checkbox" data-v11-id="${esc(s.id)}">
          <span>
            <span class="suggestion-title">${esc(s.title)}</span>
            <p>${esc(s.text)}</p>
            <span class="small-note">Motivo: ${esc(s.reason)}</span>
          </span>
        </label>
      `).join("")
      : `<div class="assistant-item good"><strong>Nenhuma mudança prioritária sugerida.</strong><p>Continue acompanhando os registros.</p></div>`;

    renderApproved();
  }

  function approveSelected() {
    const x = appProfile();
    const a = analyze(+(document.getElementById("v11Period")?.value || 30));
    if (!a) return;

    const selected = [...document.querySelectorAll("#v11Suggestions input[data-v11-id]:checked")]
      .map(el => a.suggestions.find(s => s.id === el.dataset.v11Id))
      .filter(Boolean);

    if (!selected.length) {
      alert("Selecione pelo menos uma sugestão para aprovar.");
      return;
    }

    const now = new Date().toISOString();
    const existing = getApproved();
    selected.forEach(s => existing.push({
      ...s,
      profile: typeof current !== "undefined" ? current : "Perfil",
      period:a.period,
      approvedAt:now,
      status:"aprovada — aguardando aplicação no planejamento"
    }));
    saveApproved(existing.slice(-50));

    const msg = document.getElementById("v11Message");
    msg.textContent = `${selected.length} sugestão(ões) aprovada(s). Nenhum dado foi alterado automaticamente.`;
    document.querySelectorAll("#v11Suggestions input[type=checkbox]").forEach(x=>x.checked=false);

    // Optional integration point for a future planning module.
    window.dispatchEvent(new CustomEvent("vidaleve:assistant-approved", {
      detail:{profile:typeof current !== "undefined" ? current : null, suggestions:selected, period:a.period}
    }));

    renderApproved();
  }

  function renderApproved() {
    const box = document.getElementById("v11Approved");
    if (!box) return;
    const items = getApproved().filter(z =>
      !z.profile || z.profile === (typeof current !== "undefined" ? current : z.profile)
    ).slice().reverse();

    box.innerHTML = items.length ? items.map(s => `
      <div class="assistant-item approved">
        <strong>${esc(s.title)}</strong>
        <p>${esc(s.text)}</p>
        <span class="small-note">Aprovada em ${esc(new Date(s.approvedAt).toLocaleString("pt-BR"))}. Status: ${esc(s.status)}.</span>
      </div>
    `).join("") : `<p class="muted">Nenhuma sugestão aprovada ainda.</p>`;
  }

  // The base app calls setup() on DOMContentLoaded; wait until its UI exists.
  function boot() {
    if (document.getElementById("tabs") && document.querySelector("main")) buildUI();
    else setTimeout(boot, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
