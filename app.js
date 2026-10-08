const STORAGE_KEY="VIDALEVE_RECONSTRUCAO_V1";

const FOODS={
"Arroz branco cozido":{cal:128,p:2.5,c:28,f:.2,fi:1.6},
"Feijão carioca cozido":{cal:76,p:4.8,c:13.6,f:.5,fi:8.5},
"Peito de frango grelhado":{cal:165,p:31,c:0,f:3.6,fi:0},
"Ovo cozido":{cal:155,p:13,c:1.1,f:10.6,fi:0},
"Banana":{cal:89,p:1.1,c:22.8,f:.3,fi:2.6},
"Maçã":{cal:52,p:.3,c:13.8,f:.2,fi:2.4},
"Pão francês":{cal:300,p:8,c:58,f:3.1,fi:2.3},
"Leite integral":{cal:61,p:3.2,c:4.8,f:3.3,fi:0},
"Aveia":{cal:394,p:13.9,c:66.6,f:8.5,fi:9.1},
"Batata inglesa cozida":{cal:52,p:1.2,c:11.9,f:.1,fi:1.3},
"Batata-doce cozida":{cal:77,p:.6,c:18.4,f:.1,fi:2.2},
"Tomate":{cal:18,p:.9,c:3.9,f:.2,fi:1.2},
"Alface":{cal:15,p:1.4,c:2.9,f:.2,fi:1.7}
};

const MET={
Caminhada:{leve:2.8,moderada:3.5,intensa:4.8},
Corrida:{leve:6,moderada:8,intensa:10},
Bicicleta:{leve:4,moderada:6.8,intensa:10},
Musculação:{leve:3,moderada:5,intensa:6},
Natação:{leve:5,moderada:7,intensa:9},
Dança:{leve:3,moderada:5.5,intensa:7},
Alongamento:{leve:2.3,moderada:2.5,intensa:3},
Outro:{leve:3,moderada:5,intensa:7}
};

function profile(){
  return {
    name:"",age:0,sex:"M",height:0,currentWeight:0,goalWeight:0,
    objective:"perder",activity:1.2,weights:[],foods:[],exercises:[],customFoods:[]
  };
}

let db=load(),current="Ivan",editingWeightId=null,editingExerciseId=null;

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(x&&x.Ivan&&x["Mônica"]){
      x.Ivan=normalizeProfile(x.Ivan);
      x["Mônica"]=normalizeProfile(x["Mônica"]);
      return x;
    }
  }catch(e){}
  return {Ivan:profile(),Mônica:profile()};
}

function normalizeProfile(x){
  const d=profile();
  return {
    ...d,...x,
    objective:x.objective||"perder",
    weights:Array.isArray(x.weights)?x.weights:[],
    foods:Array.isArray(x.foods)?x.foods:[],
    exercises:Array.isArray(x.exercises)?x.exercises:[],
    customFoods:Array.isArray(x.customFoods)?x.customFoods:[]
  };
}

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
function p(){return db[current]}
function $(id){return document.getElementById(id)}

function today(){
  const d=new Date();
  return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function toBR(iso){
  const m=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:"";
}
function getDate(id){
  const e=$(id);
  return e&&e.value?e.value:today();
}

function bmi(x){
  const h=Number(x.height)/100,w=Number(x.currentWeight);
  return h&&w?w/(h*h):0;
}
function bmr(x){
  const w=+x.currentWeight,h=+x.height,a=+x.age;
  if(!w||!h||!a)return 0;
  return x.sex==="F"?10*w+6.25*h-5*a-161:10*w+6.25*h-5*a+5;
}
function needs(x){
  const cal=bmr(x)*(+x.activity||1.2);
  return {cal,p:x.currentWeight?1.6*x.currentWeight:0,f:cal*.25/9,c:cal*.5/4,fi:25};
}
function foodTotals(x,d){
  return x.foods.filter(z=>z.date===d).reduce(
    (s,z)=>({cal:s.cal+z.cal,p:s.p+z.p,c:s.c+z.c,f:s.f+z.f,fi:s.fi+z.fi}),
    {cal:0,p:0,c:0,f:0,fi:0}
  );
}
function foodTotalsByMeal(x,d){
  const meals=["Café da manhã","Almoço","Lanche","Jantar","Ceia"];
  const out={};
  meals.forEach(m=>out[m]={cal:0,p:0,c:0,f:0,fi:0,count:0});
  x.foods.filter(z=>z.date===d).forEach(z=>{
    if(!out[z.meal])out[z.meal]={cal:0,p:0,c:0,f:0,fi:0,count:0};
    out[z.meal].cal+=z.cal;out[z.meal].p+=z.p;out[z.meal].c+=z.c;
    out[z.meal].f+=z.f;out[z.meal].fi+=z.fi;out[z.meal].count++;
  });
  return out;
}
function availableFoods(x){
  const out={...FOODS};
  (x.customFoods||[]).forEach(z=>out[z.name]=z);
  return out;
}
function exKcal(x,e){
  const w=+x.currentWeight||0;
  const m=(MET[e.type]||MET.Outro)[e.intensity]||5;
  return w?Math.round(m*3.5*w/200*e.min):0;
}
function exTotals(x,d){
  return x.exercises.filter(z=>z.date===d).reduce(
    (s,z)=>({cal:s.cal+exKcal(x,z),min:s.min+ +z.min}),
    {cal:0,min:0}
  );
}
function dateObj(iso){
  const p=String(iso).split("-");
  return p.length===3?new Date(+p[0],+p[1]-1,+p[2]):null;
}
function startOfWeek(iso){
  const d=dateObj(iso)||new Date();
  const day=d.getDay();
  d.setDate(d.getDate()-(day===0?6:day-1));
  return d;
}
function isoFromDate(d){
  return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function weekDates(iso){
  const d=startOfWeek(iso),a=[];
  for(let i=0;i<7;i++){
    const x=new Date(d);x.setDate(d.getDate()+i);a.push(isoFromDate(x));
  }
  return a;
}
function periodExerciseTotals(x,dates){
  return dates.reduce((s,d)=>{
    const t=exTotals(x,d);return {cal:s.cal+t.cal,min:s.min+t.min};
  },{cal:0,min:0});
}
function monthDates(iso){
  const d=dateObj(iso)||new Date(),y=d.getFullYear(),m=d.getMonth();
  const last=new Date(y,m+1,0).getDate(),a=[];
  for(let i=1;i<=last;i++)a.push(isoFromDate(new Date(y,m,i)));
  return a;
}
function sortedWeights(x){
  return x.weights.slice().sort((a,b)=>a.date.localeCompare(b.date)||(+a.id)-(+b.id));
}
function weightStats(x){
  const a=sortedWeights(x);
  const initial=a.length?a[0].value:+x.currentWeight||0;
  const current=a.length?a[a.length-1].value:+x.currentWeight||0;
  const lowest=a.length?Math.min(...a.map(z=>+z.value)):current;
  const change=initial&&current?current-initial:0;
  return {a,initial,current,lowest,change};
}
function goalProgress(x,current){
  const goal=+x.goalWeight||0;
  if(!goal||!current)return 0;
  const s=weightStats(x).initial;
  if(!s||s===goal)return current===goal?100:0;
  let pct=x.objective==="ganhar"?(current-s)/(goal-s)*100:(s-current)/(s-goal)*100;
  if(x.objective==="manter") pct=current?100:0;
  return Math.max(0,Math.min(100,pct));
}
function goalRemaining(x,current){
  const goal=+x.goalWeight||0;
  if(!goal||!current)return 0;
  return Math.abs(current-goal);
}
function goalText(x,current){
  const goal=+x.goalWeight||0;
  if(!goal)return "Defina uma meta de peso no Perfil";
  if(!current)return `Meta: ${goal.toFixed(1)} kg`;
  if(Math.abs(current-goal)<0.05)return "Meta de peso atingida";
  if(x.objective==="ganhar")return `Ganhar ${Math.abs(goal-current).toFixed(1)} kg`;
  if(x.objective==="manter")return `Manter em ${goal.toFixed(1)} kg`;
  return `Perder ${Math.abs(current-goal).toFixed(1)} kg`;
}

function renderProfile(){
  const x=p();
  $("profile").value=current;
  $("name").value=x.name||"";
  $("age").value=x.age||"";
  $("sex").value=x.sex||"M";
  $("height").value=x.height||"";
  $("currentWeight").value=x.currentWeight||"";
  $("goalWeight").value=x.goalWeight||"";
  $("objective").value=x.objective||"perder";
  $("activity").value=x.activity||1.2;
  $("profileLabel").textContent="Perfil: "+current;
  const st=weightStats(x);
  $("profileGoalText").textContent=x.goalWeight?
    `${goalText(x,st.current)}. Progresso atual: ${Math.round(goalProgress(x,st.current))}%.`:
    "Defina o peso-meta para acompanhar sua evolução.";
}

function renderSummary(){
  const x=p(),d=getDate("summaryDate"),f=foodTotals(x,d),e=exTotals(x,d),n=needs(x);
  const st=weightStats(x),b=bmi({...x,currentWeight:st.current}),w=st.current;
  $("sumCal").textContent=Math.round(f.cal)+" kcal";
  $("sumProt").textContent=f.p.toFixed(1)+" g";
  $("sumCarb").textContent=f.c.toFixed(1)+" g";
  $("sumFat").textContent=f.f.toFixed(1)+" g";
  $("sumFiber").textContent=f.fi.toFixed(1)+" g";
  $("sumExercise").textContent=Math.round(e.cal)+" kcal";
  $("sumExerciseMin").textContent=e.min+" min";
  $("sumNet").textContent=Math.round(f.cal-e.cal)+" kcal";
  $("sumCalNeed").textContent=n.cal?Math.round(n.cal)+" kcal":"—";
  $("sumProtNeed").textContent=n.p?n.p.toFixed(1)+" g":"—";
  $("sumCarbNeed").textContent=n.c?n.c.toFixed(1)+" g":"—";
  $("sumFatNeed").textContent=n.f?n.f.toFixed(1)+" g":"—";
  $("sumFiberNeed").textContent=n.fi+" g";

  if(n.cal&&f.cal){
    const diff=f.cal-n.cal;
    $("calStatus").textContent=diff<=0?"Dentro da referência":`+${Math.round(diff)} kcal`;
    $("calStatus").className="status "+(diff<=0?"ok":"attention");
  }else{
    $("calStatus").textContent="";
    $("calStatus").className="status";
  }

  $("goalInitial").textContent=st.initial?st.initial.toFixed(1)+" kg":"—";
  $("sumWeight").textContent=w?w.toFixed(1)+" kg":"—";
  $("sumGoal").textContent=x.goalWeight?x.goalWeight.toFixed(1)+" kg":"—";
  $("sumToGoal").textContent=x.goalWeight&&w?goalRemaining(x,w).toFixed(1)+" kg":"—";
  $("sumBMI").textContent=b?b.toFixed(1):"—";
  $("sumChange").textContent=st.initial&&w?`${st.change>0?"+":""}${st.change.toFixed(1)} kg`:"—";
  $("sumLowest").textContent=st.lowest?st.lowest.toFixed(1)+" kg":"—";

  const pct=goalProgress(x,w);
  $("goalPercent").textContent=x.goalWeight?Math.round(pct)+"%":"—";
  $("goalProgress").style.width=pct+"%";
  $("goalTitle").textContent=goalText(x,w);
}

function renderWeight(){
  const x=p(),st=weightStats(x),t={...x,currentWeight:st.current};
  $("weightInitial").textContent=st.initial?st.initial.toFixed(1)+" kg":"—";
  $("weightCurrent").textContent=st.current?st.current.toFixed(1)+" kg":"—";
  $("weightLowest").textContent=st.lowest?st.lowest.toFixed(1)+" kg":"—";
  $("weightChange").textContent=st.initial&&st.current?`${st.change>0?"+":""}${st.change.toFixed(1)} kg`:"—";
  $("weightGoal").textContent=x.goalWeight?x.goalWeight.toFixed(1)+" kg":"—";
  $("weightGap").textContent=x.goalWeight&&st.current?goalRemaining(x,st.current).toFixed(1)+" kg":"—";

  const pct=goalProgress(x,st.current);
  $("weightGoalPercent").textContent=x.goalWeight?Math.round(pct)+"%":"—";
  $("weightGoalProgress").style.width=pct+"%";

  $("weightHistory").innerHTML=st.a.length?st.a.slice().reverse().map((z,i,arr)=>{
    const older=arr[i+1];
    const diff=older?z.value-older.value:0;
    const sign=diff>0?"+":"";
    return `<div class="item">
      <span><strong>${toBR(z.date)}</strong> — ${Number(z.value).toFixed(1)} kg
      ${z.note?`<br><small>${escapeHTML(z.note)}</small>`:""}
      ${older?`<br><small class="${diff<=0?"good":"attention-text"}">Variação: ${sign}${diff.toFixed(1)} kg</small>`:""}
      </span>
      <span class="actions">
        <button onclick="editWeight('${z.id}')">Editar</button>
        <button onclick="delWeight('${z.id}')" class="danger">Excluir</button>
      </span>
    </div>`;
  }).join(""):"<span class='muted'>Nenhum registro.</span>";

  drawChart(st.a,x.goalWeight);
}

function escapeHTML(s){
  return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

function drawChart(a,goal){
  const c=$("weightChart"),ctx=c.getContext("2d"),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  if(!a.length){
    ctx.fillStyle="#777";ctx.font="14px Arial";
    ctx.fillText("Nenhum registro de peso ainda.",20,30);return;
  }
  const vals=a.map(x=>+x.value);
  if(goal) vals.push(+goal);
  let lo=Math.min(...vals)-1,hi=Math.max(...vals)+1;
  if(hi===lo){hi+=1;lo-=1}
  const left=55,right=25,top=30,bottom=45;
  ctx.font="12px Arial";
  ctx.strokeStyle="#e1e1e1";
  for(let i=0;i<5;i++){
    const y=top+i*(h-top-bottom)/4;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
  }
  if(goal){
    const gy=top+(hi-goal)/(hi-lo)*(h-top-bottom);
    ctx.setLineDash([7,5]);ctx.strokeStyle="#777";
    ctx.beginPath();ctx.moveTo(left,gy);ctx.lineTo(w-right,gy);ctx.stroke();
    ctx.setLineDash([]);ctx.fillStyle="#555";ctx.fillText("Meta "+Number(goal).toFixed(1)+" kg",left+5,gy-6);
  }
  ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();
  a.forEach((z,i)=>{
    const px=a.length===1?w/2:left+i*(w-left-right)/(a.length-1);
    const py=top+(hi-z.value)/(hi-lo)*(h-top-bottom);
    i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  });ctx.stroke();
  ctx.fillStyle="#111";
  a.forEach((z,i)=>{
    const px=a.length===1?w/2:left+i*(w-left-right)/(a.length-1);
    const py=top+(hi-z.value)/(hi-lo)*(h-top-bottom);
    ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
    ctx.fillText(Number(z.value).toFixed(1),px-13,py-10);
    if(a.length<=8)ctx.fillText(toBR(z.date).slice(0,5),px-15,h-18);
  });
}

function renderFood(){
  const x=p(),d=getDate("foodDate"),t=foodTotals(x,d),n=needs(x);
  $("foodCal").textContent=Math.round(t.cal)+" kcal";
  $("foodProt").textContent=t.p.toFixed(1)+" g";
  $("foodCarb").textContent=t.c.toFixed(1)+" g";
  $("foodFat").textContent=t.f.toFixed(1)+" g";
  $("foodFiber").textContent=t.fi.toFixed(1)+" g";

  const by=foodTotalsByMeal(x,d);
  $("mealSummary").innerHTML=Object.entries(by).map(([meal,v])=>
    `<div class="meal-row"><div><strong>${meal}</strong><small>${v.count} ${v.count===1?"alimento":"alimentos"}</small></div>
     <span><b>${Math.round(v.cal)} kcal</b> · ${v.p.toFixed(1)} g proteína · ${v.c.toFixed(1)} g carbo. · ${v.f.toFixed(1)} g gordura</span></div>`
  ).join("");

  const pct=n.cal?Math.min(100,(t.cal/n.cal)*100):0;
  $("foodGoalText").textContent=n.cal?`${Math.round(t.cal)} / ${Math.round(n.cal)} kcal`:"Defina seu perfil";
  $("foodGoalProgress").style.width=pct+"%";
  $("foodGoalStatus").textContent=n.cal?(t.cal<=n.cal?`Restam aproximadamente ${Math.max(0,Math.round(n.cal-t.cal))} kcal.`:`Acima da referência em ${Math.round(t.cal-n.cal)} kcal.`):"";

  const a=x.foods.filter(z=>z.date===d);
  $("foodLog").innerHTML=a.length?a.map(z=>
    `<div class="item"><span><strong>${escapeHTML(z.meal)}</strong>: ${escapeHTML(z.name)} — ${z.qty} g<br>
    ${Math.round(z.cal)} kcal · P ${z.p.toFixed(1)} g · C ${z.c.toFixed(1)} g · G ${z.f.toFixed(1)} g · F ${z.fi.toFixed(1)} g</span>
    <span class="actions"><button onclick="editFood('${z.id}')">Editar</button><button onclick="delFood('${z.id}')" class="danger">Excluir</button></span></div>`
  ).join(""):"<span class='muted'>Nenhum alimento registrado.</span>";

  renderCustomFoods();
}

function renderExercise(){
  const x=p(),d=getDate("exerciseDate"),todayT=exTotals(x,d);
  const week=periodExerciseTotals(x,weekDates(d));
  const month=periodExerciseTotals(x,monthDates(d));
  $("exerciseCalories").textContent=todayT.cal+" kcal";
  $("exerciseMinutes").textContent=todayT.min+" min";
  $("exerciseWeekCalories").textContent=week.cal+" kcal";
  $("exerciseWeekMinutes").textContent=week.min+" min";
  $("exerciseMonthCalories").textContent=month.cal+" kcal";
  $("exerciseMonthMinutes").textContent=month.min+" min";

  const goal=150,pct=Math.min(100,week.min/goal*100);
  $("exerciseGoalText").textContent=`${week.min} / ${goal} min`;
  $("exerciseGoalProgress").style.width=pct+"%";
  $("exerciseGoalStatus").textContent=week.min>=goal?
    "Meta semanal atingida.":"Faltam "+Math.max(0,goal-week.min)+" minutos para a meta semanal.";

  const a=x.exercises.filter(z=>z.date===d);
  $("exerciseLog").innerHTML=a.length?a.map(z=>
    `<div class="item"><span><strong>${escapeHTML(z.type)}</strong> — ${z.min} min — ${escapeHTML(z.intensity)}
    <br>${exKcal(x,z)} kcal</span>
    <span class="actions"><button onclick="editExercise('${z.id}')">Editar</button>
    <button onclick="delExercise('${z.id}')" class="danger">Excluir</button></span></div>`
  ).join(""):"<span class='muted'>Nenhum exercício registrado nesta data.</span>";

  const recent=x.exercises.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  $("exerciseHistory").innerHTML=recent.length?recent.map(z=>
    `<div class="item"><span><strong>${toBR(z.date)}</strong> — ${escapeHTML(z.type)} — ${z.min} min
    <br><small>${escapeHTML(z.intensity)} · ${exKcal(x,z)} kcal</small></span>
    <button onclick="delExercise('${z.id}')" class="danger">Excluir</button></div>`
  ).join(""):"<span class='muted'>Nenhum exercício registrado.</span>";

  drawExerciseWeekChart(x,d);
  drawExerciseTypeChart(x,d);
}

function renderAll(){
  renderProfile();renderSummary();renderWeight();refreshFoodSelect();renderFood();renderExercise();renderReports();
}

function addFood(){
  const x=p(),d=getDate("foodDate"),name=$("food").value,q=+$("foodQty").value;
  const foods=availableFoods(x),f=foods[name];
  if(!d||!q||!f)return alert("Informe data, alimento e quantidade.");
  const k=q/100;
  x.foods.push({id:Date.now()+Math.random(),date:d,meal:$("meal").value,name,qty:q,
    cal:f.cal*k,p:f.p*k,c:f.c*k,f:f.f*k,fi:f.fi*k});
  save();renderAll();
}
function delFood(id){
  if(!confirm("Excluir este lançamento de alimentação?"))return;
  p().foods=p().foods.filter(z=>String(z.id)!==String(id));
  save();renderAll();
}
function editFood(id){
  const z=p().foods.find(v=>String(v.id)===String(id));
  if(!z)return;
  $("foodDate").value=z.date;
  $("meal").value=z.meal;
  $("food").value=z.name;
  $("foodQty").value=z.qty;
  p().foods=p().foods.filter(v=>String(v.id)!==String(id));
  save();renderAll();
  $("foodQty").focus();
}
function refreshFoodSelect(){
  const x=p(),select=$("food"),old=select.value,foods=availableFoods(x);
  select.innerHTML="";
  Object.keys(foods).sort((a,b)=>a.localeCompare(b,"pt-BR")).forEach(n=>{
    const o=document.createElement("option");o.value=n;o.textContent=n;select.appendChild(o);
  });
  if(foods[old])select.value=old;
}
function renderCustomFoods(){
  const x=p(),a=x.customFoods||[];
  $("customFoodList").innerHTML=a.length?
    a.map(z=>`<div class="item"><span><strong>${escapeHTML(z.name)}</strong><br>
      ${z.cal} kcal · P ${z.p} g · C ${z.c} g · G ${z.f} g · F ${z.fi} g / 100 g</span>
      <button onclick="delCustomFood('${z.id}')" class="danger">Excluir</button></div>`).join("")
    :"<span class='muted'>Nenhum alimento personalizado cadastrado.</span>";
}
function saveCustomFood(){
  const x=p(),name=$("customFoodName").value.trim(),cal=+$("customFoodCal").value||0,
    prot=+$("customFoodProt").value||0,carb=+$("customFoodCarb").value||0,
    fat=+$("customFoodFat").value||0,fiber=+$("customFoodFiber").value||0;
  if(!name||cal<0)return alert("Informe pelo menos o nome e as calorias do alimento.");
  if(availableFoods(x)[name] && !(x.customFoods||[]).some(z=>z.name===name))
    return alert("Esse alimento já existe no cadastro.");
  if(!x.customFoods)x.customFoods=[];
  const existing=x.customFoods.find(z=>z.name===name);
  const item={id:existing?existing.id:Date.now()+Math.random(),name,cal,p:prot,c:carb,f:fat,fi:fiber};
  if(existing)Object.assign(existing,item);else x.customFoods.push(item);
  save();
  $("customFoodName").value="";$("customFoodCal").value="";$("customFoodProt").value="";
  $("customFoodCarb").value="";$("customFoodFat").value="";$("customFoodFiber").value="";
  $("customFoodMessage").textContent="Alimento cadastrado.";
  setTimeout(()=>$("customFoodMessage").textContent="",2000);
  refreshFoodSelect();renderCustomFoods();
}
function delCustomFood(id){
  if(!confirm("Excluir este alimento personalizado?"))return;
  p().customFoods=(p().customFoods||[]).filter(z=>String(z.id)!==String(id));
  save();refreshFoodSelect();renderCustomFoods();
}

function addExercise(){
  const x=p(),d=getDate("exerciseDate"),min=+$("exerciseMin").value;
  if(!d||!min)return alert("Informe data e duração.");
  const item={type:$("exerciseType").value,min,intensity:$("exerciseIntensity").value};
  if(editingExerciseId!==null){
    const old=x.exercises.find(z=>String(z.id)===String(editingExerciseId));
    if(old)Object.assign(old,item,{date:d});
    editingExerciseId=null;
    $("addExercise").textContent="Registrar exercício";
    $("cancelExerciseEdit").hidden=true;
  }else{
    x.exercises.push({id:Date.now()+Math.random(),date:d,...item});
  }
  save();
  $("exerciseMin").value="";
  renderAll();updateExerciseEstimate();
}
function delExercise(id){
  if(!confirm("Excluir este exercício?"))return;
  p().exercises=p().exercises.filter(z=>String(z.id)!==String(id));
  save();renderAll();updateExerciseEstimate();
}
function editExercise(id){
  const z=p().exercises.find(v=>String(v.id)===String(id));
  if(!z)return;
  editingExerciseId=id;
  $("exerciseDate").value=z.date;
  $("exerciseType").value=z.type;
  $("exerciseMin").value=z.min;
  $("exerciseIntensity").value=z.intensity;
  $("addExercise").textContent="Salvar alteração";
  $("cancelExerciseEdit").hidden=false;
  updateExerciseEstimate();
  $("exerciseMin").focus();
}
function cancelExerciseEdit(){
  editingExerciseId=null;
  $("addExercise").textContent="Registrar exercício";
  $("cancelExerciseEdit").hidden=true;
  $("exerciseMin").value="";
  updateExerciseEstimate();
}
function drawExerciseWeekChart(x,d){
  const c=$("exerciseWeekChart"),ctx=c.getContext("2d"),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  const days=weekDates(d),vals=days.map(q=>exTotals(x,q).min),max=Math.max(60,...vals);
  const left=45,right=20,top=25,bottom=45,bar=(w-left-right)/7-16;
  ctx.strokeStyle="#ddd";ctx.font="12px Arial";
  for(let i=0;i<4;i++){
    const y=top+i*(h-top-bottom)/3;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.fillStyle="#666";ctx.fillText(Math.round(max-(max*i/3)),5,y+4);
  }
  vals.forEach((v,i)=>{
    const x0=left+i*((w-left-right)/7)+8;
    const bh=(v/max)*(h-top-bottom),y=h-bottom-bh;
    ctx.fillStyle="#222";ctx.fillRect(x0,y,bar,bh);
    ctx.fillStyle="#222";ctx.fillText(String(v),x0+bar/2-5,y-6);
    ctx.fillText(["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][i],x0,h-18);
  });
}
function drawExerciseTypeChart(x,d){
  const c=$("exerciseTypeChart"),ctx=c.getContext("2d"),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  const map={};
  x.exercises.filter(z=>z.date===d).forEach(z=>map[z.type]=(map[z.type]||0)+exKcal(x,z));
  const a=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!a.length){ctx.fillStyle="#777";ctx.font="14px Arial";ctx.fillText("Nenhum exercício registrado nesta data.",20,30);return}
  const max=Math.max(...a.map(z=>z[1]),1),left=160,right=30,top=25,bottom=30,bh=Math.min(28,(h-top-bottom)/a.length-8);
  ctx.font="12px Arial";
  a.forEach((z,i)=>{
    const y=top+i*((h-top-bottom)/a.length);
    ctx.fillStyle="#eee";ctx.fillRect(left,y,w-left-right,bh);
    ctx.fillStyle="#222";ctx.fillRect(left,y,(z[1]/max)*(w-left-right),bh);
    ctx.fillStyle="#222";ctx.fillText(z[0],10,y+bh-8);
    ctx.fillText(Math.round(z[1])+" kcal",left+(z[1]/max)*(w-left-right)+6,y+bh-8);
  });
}

function addWeight(){
  const d=getDate("weightDate"),v=+$("weightValue").value,note=$("weightNote").value.trim();
  if(!d||!v)return alert("Informe uma data válida e o peso.");
  const x=p();
  if(editingWeightId!==null){
    const item=x.weights.find(z=>String(z.id)===String(editingWeightId));
    if(item){item.date=d;item.value=v;item.note=note}
    editingWeightId=null;
    $("saveWeight").textContent="Registrar peso";
    $("cancelWeightEdit").hidden=true;
  }else{
    x.weights.push({id:Date.now()+Math.random(),date:d,value:v,note});
  }
  x.currentWeight=v;
  save();$("weightValue").value="";$("weightNote").value="";renderAll();
}

function editWeight(id){
  const item=p().weights.find(z=>String(z.id)===String(id));
  if(!item)return;
  editingWeightId=id;
  $("weightDate").value=item.date;
  $("weightValue").value=item.value;
  $("weightNote").value=item.note||"";
  $("saveWeight").textContent="Salvar alteração";
  $("cancelWeightEdit").hidden=false;
  $("weightValue").focus();
}

function cancelWeightEdit(){
  editingWeightId=null;
  $("saveWeight").textContent="Registrar peso";
  $("cancelWeightEdit").hidden=true;
  $("weightValue").value="";
  $("weightNote").value="";
}

function delWeight(id){
  if(!confirm("Excluir este registro de peso?"))return;
  const x=p();
  x.weights=x.weights.filter(z=>String(z.id)!==String(id));
  const st=weightStats(x);
  x.currentWeight=st.current||0;
  save();renderAll();
}

function saveProfile(){
  const x=p();
  x.name=$("name").value.trim()||current;
  x.age=+$("age").value||0;
  x.sex=$("sex").value;
  x.height=+$("height").value||0;
  x.currentWeight=+$("currentWeight").value||0;
  x.goalWeight=+$("goalWeight").value||0;
  x.objective=$("objective").value;
  x.activity=+$("activity").value||1.2;
  save();
  $("profileMessage").textContent="Perfil salvo.";
  setTimeout(()=>$("profileMessage").textContent="",2200);
  renderAll();
}


function rangeDays(start,end){
  const a=[],d=dateObj(start),last=dateObj(end);
  if(!d||!last||d>last)return a;
  for(let x=new Date(d);x<=last;x.setDate(x.getDate()+1))a.push(isoFromDate(new Date(x)));
  return a;
}
function periodRange(period,reference){
  const d=dateObj(reference)||new Date();
  if(period==="month"){
    const y=d.getFullYear(),m=d.getMonth();
    return [isoFromDate(new Date(y,m,1)),isoFromDate(new Date(y,m+1,0))];
  }
  const days=weekDates(reference);
  return [days[0],days[6]];
}
function priorRange(start,end){
  const a=dateObj(start),b=dateObj(end);
  if(!a||!b)return ["",""];
  const span=Math.round((b-a)/86400000)+1;
  const pe=new Date(a);pe.setDate(a.getDate()-1);
  const ps=new Date(a);ps.setDate(a.getDate()-span);
  return [isoFromDate(ps),isoFromDate(pe)];
}
function periodStats(x,start,end){
  const days=rangeDays(start,end);
  const foods=days.map(d=>foodTotals(x,d));
  const exs=days.map(d=>exTotals(x,d));
  const foodCal=foods.reduce((s,z)=>s+z.cal,0);
  const exCal=exs.reduce((s,z)=>s+z.cal,0);
  const exMin=exs.reduce((s,z)=>s+z.min,0);
  const recordedFood=new Set(x.foods.filter(z=>z.date>=start&&z.date<=end).map(z=>z.date));
  const recordedEx=new Set(x.exercises.filter(z=>z.date>=start&&z.date<=end).map(z=>z.date));
  const recordedWeight=x.weights.filter(z=>z.date>=start&&z.date<=end);
  const weights=recordedWeight.map(z=>+z.value);
  return {
    days,foodCal,exCal,exMin,
    avgCal:days.length?foodCal/days.length:0,
    avgWeight:weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:0,
    weights:recordedWeight.sort((a,b)=>a.date.localeCompare(b.date)),
    recordedDays:new Set([...recordedFood,...recordedEx,...recordedWeight.map(z=>z.date)]).size
  };
}
function formatDelta(v,suffix=""){
  if(v===null||v===undefined||isNaN(v))return "—";
  return `${v>0?"+":""}${v.toFixed(1)}${suffix}`;
}
function renderReports(){
  const x=p(),period=$("reportPeriod").value,ref=getDate("summaryDate");
  let start,end;
  if(period==="custom"){
    start=$("reportStart").value||ref;
    end=$("reportEnd").value||ref;
  }else{
    [start,end]=periodRange(period,ref);
    $("reportStart").value=start;$("reportEnd").value=end;
  }
  if(start>end){const t=start;start=end;end=t}
  const s=periodStats(x,start,end),[ps,pe]=priorRange(start,end),prev=periodStats(x,ps,pe);

  const first=s.weights[0],last=s.weights[s.weights.length-1];
  const weightChange=first&&last?+last.value-+first.value:null;
  $("reportWeightChange").textContent=weightChange===null?"—":formatDelta(weightChange," kg");
  $("reportAvgWeight").textContent=s.avgWeight?s.avgWeight.toFixed(1)+" kg":"—";
  $("reportAvgCalories").textContent=s.avgCal?Math.round(s.avgCal)+" kcal":"—";
  $("reportExerciseMin").textContent=Math.round(s.exMin)+" min";
  $("reportExerciseCal").textContent=Math.round(s.exCal)+" kcal";
  $("reportDays").textContent=`${s.recordedDays} / ${s.days.length}`;

  // Weekly panel uses selected period when it is a week; otherwise current week.
  const [ws,we]=periodRange("week",ref),[pws,pwe]=priorRange(ws,we);
  const w=periodStats(x,ws,we),pw=periodStats(x,pws,pwe);
  const ww=w.weights[0]&&w.weights[w.weights.length-1]?+w.weights[w.weights.length-1].value-+w.weights[0].value:null;
  const pww=pw.weights[0]&&pw.weights[pw.weights.length-1]?+pw.weights[pw.weights.length-1].value-+pw.weights[0].value:null;
  $("weekWeight").textContent=ww===null?"—":formatDelta(ww," kg");
  $("weekWeightCompare").textContent=ww===null?"Sem pesagens":`Semana anterior: ${pww===null?"—":formatDelta(pww," kg")}`;
  $("weekCalories").textContent=w.avgCal?Math.round(w.avgCal)+" kcal/dia":"—";
  $("weekCaloriesCompare").textContent=pw.avgCal?`Anterior: ${Math.round(pw.avgCal)} kcal/dia`:"Sem dados anteriores";
  $("weekExercise").textContent=w.exMin+" min";
  $("weekExerciseCompare").textContent=`Anterior: ${pw.exMin} min`;
  $("weekRegistered").textContent=`${w.recordedDays} / ${w.days.length}`;
  $("weekRegisteredCompare").textContent=`Anterior: ${pw.recordedDays} / ${pw.days.length}`;

  const indicators=[];
  if(s.exMin>=150)indicators.push(["good","Exercícios","Você atingiu pelo menos 150 minutos de atividade no período."]);
  else if(s.exMin>0)indicators.push(["attention","Exercícios",`Você registrou ${Math.round(s.exMin)} minutos de atividade.`]);
  else indicators.push(["neutral","Exercícios","Ainda não há exercícios registrados no período."]);

  if(x.goalWeight&&last){
    const pct=goalProgress(x,+last.value);
    indicators.push([pct>=80?"good":pct>0?"attention":"neutral","Meta de peso",`Progresso estimado: ${Math.round(pct)}% da meta.`]);
  }else indicators.push(["neutral","Meta de peso","Registre peso e defina uma meta no Perfil."]);

  if(s.avgCal&&prev.avgCal){
    const d=s.avgCal-prev.avgCal;
    indicators.push([d<=0?"good":"attention","Alimentação",`Média de calorias ${d>0?"aumentou":"reduziu"} ${Math.abs(Math.round(d))} kcal/dia em relação ao período anterior.`]);
  }else indicators.push(["neutral","Alimentação","Ainda não há dados suficientes para comparar períodos."]);

  if(s.recordedDays===s.days.length)indicators.push(["good","Regularidade","Todos os dias do período possuem algum registro."]);
  else indicators.push(["attention","Regularidade",`${s.recordedDays} de ${s.days.length} dias possuem registros.`]);

  $("reportIndicators").innerHTML=indicators.map(i=>`<div class="indicator ${i[0]}"><strong>${i[1]}</strong><p>${i[2]}</p></div>`).join("");

  renderReportWeightChart(s);
  renderReportActivityChart(s);

  const comps=[
    ["Calorias/dia",s.avgCal?Math.round(s.avgCal)+" kcal":"—",prev.avgCal?formatDelta(s.avgCal-prev.avgCal," kcal"):"—"],
    ["Exercícios",s.exMin+" min",prev.exMin?formatDelta(s.exMin-prev.exMin," min"):"—"],
    ["Calorias gastas",Math.round(s.exCal)+" kcal",prev.exCal?formatDelta(s.exCal-prev.exCal," kcal"):"—"],
    ["Dias registrados",`${s.recordedDays}/${s.days.length}`,`${s.recordedDays-prev.recordedDays>0?"+":""}${s.recordedDays-prev.recordedDays}`]
  ];
  $("periodComparison").innerHTML=comps.map(z=>`<div class="compare-item"><span>${z[0]}</span><b>${z[1]}</b><small>Variação: ${z[2]}</small></div>`).join("");

  let conclusion="Registre seus dados para obter uma análise mais completa.";
  if(s.recordedDays){
    const parts=[];
    if(s.exMin>=150)parts.push("a atividade física atingiu a referência semanal de 150 minutos");
    else if(s.exMin>0)parts.push(`foram registrados ${Math.round(s.exMin)} minutos de atividade`);
    if(weightChange!==null){
      if(weightChange<0)parts.push(`o peso variou ${Math.abs(weightChange).toFixed(1)} kg para baixo`);
      else if(weightChange>0)parts.push(`o peso variou ${weightChange.toFixed(1)} kg para cima`);
      else parts.push("o peso permaneceu estável");
    }
    if(s.recordedDays<s.days.length)parts.push("a regularidade dos registros pode ser melhorada");
    conclusion="No período selecionado, "+parts.join("; ")+".";
  }
  $("reportConclusion").textContent=conclusion;
}
function renderReportWeightChart(s){
  const c=$("reportWeightChart"),ctx=c.getContext("2d"),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  const a=s.weights;
  if(!a.length){ctx.fillStyle="#777";ctx.font="14px Arial";ctx.fillText("Nenhum registro de peso no período.",20,30);return}
  const vals=a.map(z=>+z.value),lo=Math.min(...vals)-1,hi=Math.max(...vals)+1,left=55,right=25,top=25,bottom=40;
  ctx.strokeStyle="#ddd";ctx.font="12px Arial";
  for(let i=0;i<5;i++){const y=top+i*(h-top-bottom)/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke()}
  ctx.strokeStyle="#222";ctx.lineWidth=2;ctx.beginPath();
  a.forEach((z,i)=>{const px=a.length===1?w/2:left+i*(w-left-right)/(a.length-1),py=top+(hi-z.value)/(hi-lo)*(h-top-bottom);i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();
  ctx.fillStyle="#222";
  a.forEach((z,i)=>{const px=a.length===1?w/2:left+i*(w-left-right)/(a.length-1),py=top+(hi-z.value)/(hi-lo)*(h-top-bottom);ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();ctx.fillText(Number(z.value).toFixed(1),px-12,py-9)});
}
function renderReportActivityChart(s){
  const c=$("reportActivityChart"),ctx=c.getContext("2d"),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  const vals=s.days.map(d=>({d,cal:exTotals(p(),d).cal,min:exTotals(p(),d).min}));
  const max=Math.max(1,...vals.map(z=>z.cal)),left=45,right=20,top=25,bottom=40,bar=Math.max(8,(w-left-right)/Math.max(1,vals.length)-5);
  ctx.font="11px Arial";ctx.fillStyle="#222";
  vals.forEach((z,i)=>{const x=left+i*((w-left-right)/Math.max(1,vals.length))+2,bh=z.cal/max*(h-top-bottom),y=h-bottom-bh;ctx.fillRect(x,y,bar,bh);if(vals.length<=14)ctx.fillText(z.cal?Math.round(z.cal):"",x,y-5)});
}
function downloadJSON(filename,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function backupPayload(){
  return {app:"VidaLeve",version:5,exportedAt:new Date().toISOString(),storageKey:STORAGE_KEY,data:db};
}
function exportData(){
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  downloadJSON(`VidaLeve_backup_${stamp}.json`,backupPayload());
  const el=$("backupStatus");if(el)el.textContent="Backup exportado com sucesso em "+new Date().toLocaleString("pt-BR");
}
function validateBackup(payload){
  if(!payload || typeof payload!=="object") return false;
  const data=payload.data;
  if(!data || typeof data!=="object") return false;
  if(!data.profiles || typeof data.profiles!=="object") return false;
  if(!Array.isArray(data.weights)) return false;
  if(!Array.isArray(data.foods)) return false;
  if(!Array.isArray(data.exercises)) return false;
  if(!Array.isArray(data.customFoods)) return false;
  return true;
}
function importData(){
  const input=$("importFile");
  if(!input || !input.files || !input.files[0]){alert("Selecione um arquivo de backup JSON.");return;}
  const file=input.files[0];
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const payload=JSON.parse(reader.result);
      if(!validateBackup(payload)){alert("Arquivo inválido ou incompatível com o VidaLeve.");return;}
      if(!confirm("A importação substituirá os dados atuais deste navegador. Deseja continuar?"))return;
      db=payload.data;
      save();
      localStorage.setItem("VIDALEVE_LAST_BACKUP",JSON.stringify({exportedAt:payload.exportedAt||null,importedAt:new Date().toISOString()}));
      renderAll();
      const el=$("backupStatus");if(el)el.textContent="Backup importado com sucesso em "+new Date().toLocaleString("pt-BR");
      alert("Backup importado com sucesso.");
    }catch(e){alert("Não foi possível ler o arquivo de backup.");}
  };
  reader.readAsText(file);
}
function quickBackup(){exportData()}
function printPage(){window.print()}

function setup(){
  const t=today();
  $("summaryDate").value=t;
  $("foodDate").value=t;
  $("exerciseDate").value=t;
  $("weightDate").value=t;

  refreshFoodSelect();

  document.querySelectorAll("#tabs button").forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll(".page").forEach(s=>s.classList.remove("active"));
      document.querySelectorAll("#tabs button").forEach(q=>q.classList.remove("active"));
      $(b.dataset.page).classList.add("active");
      b.classList.add("active");
      renderAll();
    };
  });

  document.querySelector("#tabs button").classList.add("active");
  $("profile").onchange=()=>{current=$("profile").value;renderAll()};
  $("weightDate").onchange=renderWeight;
  $("summaryDate").onchange=renderSummary;
  $("foodDate").onchange=renderFood;
  $("exerciseDate").onchange=renderExercise;
  $("saveProfile").onclick=saveProfile;
  $("saveWeight").onclick=addWeight;
  $("cancelWeightEdit").onclick=cancelWeightEdit;
  $("addFood").onclick=addFood;
  $("saveCustomFood").onclick=saveCustomFood;
  $("addExercise").onclick=addExercise;
  $("cancelExerciseEdit").onclick=cancelExerciseEdit;
  $("exerciseMin").oninput=updateExerciseEstimate;
  $("exerciseType").onchange=updateExerciseEstimate;
  $("exerciseIntensity").onchange=updateExerciseEstimate;
  $("reportPeriod").onchange=()=>{
    $("reportStart").disabled=$("reportPeriod").value!=="custom";
    $("reportEnd").disabled=$("reportPeriod").value!=="custom";
    renderReports();
  };
  $("reportStart").onchange=renderReports;
  $("reportEnd").onchange=renderReports;
  $("generateReport").onclick=renderReports;
  $("exportData").onclick=exportData;
  $("importData").onclick=importData;
  $("quickBackup").onclick=quickBackup;
  $("printPage").onclick=printPage;

  $("reportStart").value=t;
  $("reportEnd").value=t;
  $("reportStart").disabled=true;
  $("reportEnd").disabled=true;
  renderAll();
  updateExerciseEstimate();
}

function updateExerciseEstimate(){
  const x=p(),min=+$("exerciseMin").value||0;
  if(!min){$("exerciseEstimate").textContent="";return}
  const e={type:$("exerciseType").value,intensity:$("exerciseIntensity").value,min};
  $("exerciseEstimate").textContent=`Estimativa: ${exKcal(x,e)} kcal`;
}

document.addEventListener("DOMContentLoaded",setup);
