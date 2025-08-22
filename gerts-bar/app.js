// Gert's Bar — v1.1 met Favorieten & Bonenvergelijker
let allRecipes = [];
let allBeans = [];
const FKEY = 'gertsbar:favs';

// Init
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadRecipes(), loadBeans()]);
  bindFilters();
  route(); // eerste render
});

async function loadRecipes(){
  const res = await fetch('recipes.json');
  allRecipes = await res.json();
}
async function loadBeans(){
  try{
    const res = await fetch('beans.json');
    allBeans = await res.json();
  }catch(e){
    allBeans = [];
    console.warn('beans.json niet gevonden (optioneel).');
  }
}

function bindFilters(){
  document.querySelectorAll('#filters button[data-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key = btn.getAttribute('data-filter');
      if(currentView()!=='recepten') location.hash = '#recepten';
      if(key==='all') renderRecipes(allRecipes);
      else renderRecipes(allRecipes.filter(r => r.brew===key || (r.tags||[]).includes(key)));
    });
  });
  document.getElementById('btn-surprise').addEventListener('click',()=>{
    if(currentView()!=='recepten') location.hash = '#recepten';
    surprise();
  });
  document.getElementById('search').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    const view = currentView();
    if(view==='recepten'){
      const list = allRecipes.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.tags||[]).some(t=>t.toLowerCase().includes(q)) ||
        (r.bean||'').toLowerCase().includes(q)
      );
      renderRecipes(list);
    } else if(view==='bonen'){
      const list = allBeans.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.roaster||'').toLowerCase().includes(q) ||
        (b.flavor_notes||'').toLowerCase().includes(q)
      );
      renderBeans(list);
    } else if(view==='favorieten'){
      const favs = loadFavs();
      const list = allRecipes.filter(r => favs.has(r.id)).filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.tags||[]).some(t=>t.toLowerCase().includes(q)) ||
        (r.bean||'').toLowerCase().includes(q)
      );
      renderRecipes(list, true);
    }
  });
}

function currentView(){
  const h = location.hash.replace('#','') || 'recepten';
  return ['recepten','favorieten','bonen'].includes(h) ? h : 'recepten';
}

function route(){
  const view = currentView();
  document.querySelectorAll('.tabs a').forEach(a=>a.classList.remove('active'));
  document.getElementById('tab-'+view).classList.add('active');
  // filters zichtbaarheid
  document.getElementById('filters').classList.toggle('hidden', view==='bonen');
  if(view==='recepten') renderRecipes(allRecipes);
  if(view==='favorieten') renderFavorites();
  if(view==='bonen') renderBeans(allBeans);
}

function renderRecipes(list, isFav=false){
  const wrap = document.getElementById('view');
  if(!list.length){
    wrap.innerHTML = `<div class="tablewrap"><p><em>Geen recepten gevonden.</em></p></div>`;
    return;
  }
  wrap.innerHTML = `<section class="grid">` + list.map(r => recipeCard(r)).join('') + `</section>`;
}

function recipeCard(r){
  const favs = loadFavs();
  const isFav = favs.has(r.id);
  return `<article class="card" data-brew="${r.brew}">
    <h3>${r.name}</h3>
    <div class="badges">
      ${(r.icons||'')}
      ${(r.tags||[]).map(t=>`<span class="badge">${t}</span>`).join('')}
      <span class="badge">${r.brew.toUpperCase()}</span>
    </div>
    <p><strong>Z10</strong>: sterkte ${num(r.z10.strength)}, maalgraad ${num(r.z10.grind)}, water ${num(r.z10.water_ml)} ml${r.z10.milk_ml?`, melk ${num(r.z10.milk_ml)} ml`:''}</p>
    ${r.extras?.length?`<p><em>Extras:</em> ${r.extras.join(', ')}</p>`:''}
    <div class="actions">
      <button class="primary" onclick="toggleFav('${r.id}')">${isFav?'★ In favorieten':'☆ Voeg toe aan favorieten'}</button>
      <button class="ghost" onclick="copyRecipe('${r.id}')">Kopieer instellingen</button>
    </div>
  </article>`;
}

function renderFavorites(){
  const favs = loadFavs();
  const list = allRecipes.filter(r => favs.has(r.id));
  renderRecipes(list, true);
}

function renderBeans(list){
  const wrap = document.getElementById('view');
  if(!list.length){
    wrap.innerHTML = `<div class="tablewrap"><p><em>Geen bonen om te tonen. Voeg beans.json toe.</em></p></div>`;
    return;
  }
  const head = `<thead><tr>
    <th>Boon</th><th>Branding</th><th>€ / kg</th>
    <th>Zuur</th><th>Bitter</th><th>Body</th>
    <th>Notities</th><th>Advies</th>
  </tr></thead>`;
  const rows = list.map(b=>`<tr>
    <td>${b.icons||''} <strong>${b.name}</strong></td>
    <td>${b.roaster||''}</td>
    <td>${fmtPrice(b.price_per_kg_eur)}</td>
    <td>${scale(b.acidity)}</td>
    <td>${scale(b.bitterness)}</td>
    <td>${scale(b.body)}</td>
    <td>${b.flavor_notes||''}</td>
    <td>${(b.suitable_for||[]).join(', ')}</td>
  </tr>`).join('');
  wrap.innerHTML = `<div class="tablewrap"><table>${head}<tbody>${rows}</tbody></table></div>`;
}

// Helpers
function num(v){ return (v===0?0:(v||'–')); }
function scale(v){
  if(v==null) return '–';
  const n = Math.max(1, Math.min(5, Number(v)));
  return '●'.repeat(n) + '○'.repeat(5-n);
}
function fmtPrice(v){
  if(v==null || isNaN(v)) return '–';
  return '€ ' + Number(v).toFixed(2);
}

function loadFavs(){
  try{
    return new Set(JSON.parse(localStorage.getItem(FKEY) || '[]'));
  }catch{ return new Set(); }
}

function saveFavs(set){
  localStorage.setItem(FKEY, JSON.stringify([...set]));
}

function toggleFav(id){
  const set = loadFavs();
  set.has(id) ? set.delete(id) : set.add(id);
  saveFavs(set);
  // her-render huidige view
  route();
}

function copyRecipe(id){
  const r = allRecipes.find(x=>x.id===id);
  if(!r) return;
  const lines = [
    `${r.name}`,
    `Z10: sterkte ${r.z10.strength}, maalgraad ${r.z10.grind}, water ${r.z10.water_ml} ml${r.z10.milk_ml?`, melk ${r.z10.milk_ml} ml`:''}`,
    r.extras?.length ? `Extras: ${r.extras.join(', ')}` : ''
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(lines).then(()=>{
    alert('Instellingen gekopieerd 📋');
  },()=>{
    prompt('Kopieer handmatig:', lines);
  });
}

function surprise(){
  if(!allRecipes.length) return;
  const pick = allRecipes[Math.floor(Math.random()*allRecipes.length)];
  alert('🎲 Surprise: ' + pick.name);
  // ga visueel pulsen: vind de kaart en pulse
  requestAnimationFrame(()=>{
    const cards = [...document.querySelectorAll('.card h3')];
    const card = cards.find(h => h.textContent.trim()===pick.name)?.parentElement;
    if(card){ card.scrollIntoView({behavior:'smooth', block:'center'}); card.classList.add('pulse'); setTimeout(()=>card.classList.remove('pulse'), 1200); }
  });
}
