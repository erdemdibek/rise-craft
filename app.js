// Tüm Temizlenmiş Yeni Dünya Reçetelerini İçeri Aktar
import { alchemyRecipes } from './recipes/alchemy.js';
import { armorSmithingRecipes } from './recipes/armor_smithing.js';
import { blacksmithingRecipes } from './recipes/blacksmithing.js';
import { carpentryRecipes } from './recipes/carpentry.js';
import { cookingRecipes } from './recipes/cooking.js';
import { jewelCraftingRecipes } from './recipes/jewel_crafting.js';
import { leatherworkingRecipes } from './recipes/leatherworking.js';
import { stonemasonryRecipes } from './recipes/stonemasonry.js';
import { tailoringRecipes } from './recipes/tailoring.js';

const xpGroups = {
    heavy: [0, 12000, 24000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 192000, 240000, 288000, 360000, 432000, 504000, 600000, 696000, 792000, 912000, 1032000, 1152000, 1296000, 1440000, 1584000, 1752000, 1920000, 2160000, 2400000, 2880000, 3360000, 4080000, 4800000, 5760000, 6720000, 7920000, 9120000, 10560000, 12240000, 14160000, 16800000],
    medium: [0, 9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000, 108000, 144000, 180000, 216000, 270000, 324000, 378000, 450000, 522000, 594000, 684000, 774000, 864000, 972000, 1080000, 1188000, 1314000, 1440000, 1620000, 1800000, 2160000, 2520000, 3060000, 3600000, 4320000, 5040000, 5940000, 6720000, 7920000, 9180000, 10620000, 12600000],
    standard: [0, 6000, 12000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 180000, 216000, 252000, 300000, 348000, 396000, 456000, 516000, 576000, 648000, 720000, 792000, 876000, 960000, 1080000, 1200000, 1440000, 1680000, 2040000, 2400000, 2880000, 3360000, 3960000, 4560000, 5280000, 6120000, 7080000, 8400000],
    easy: [0, 3000, 6000, 9000, 12000, 15000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 90000, 108000, 126000, 150000, 174000, 198000, 228000, 258000, 288000, 324000, 360000, 396000, 438000, 480000, 540000, 600000, 720000, 840000, 1020000, 1200000, 1440000, 1680000, 1980000, 2280000, 2640000, 3060000, 3600000, 4200000]
};

const recipes = {
    alchemy: alchemyRecipes, armor_smithing: armorSmithingRecipes, blacksmithing: blacksmithingRecipes,
    carpentry: carpentryRecipes, cooking: cookingRecipes, jewel_crafting: jewelCraftingRecipes,
    leatherworking: leatherworkingRecipes, stonemasonry: stonemasonryRecipes, tailoring: tailoringRecipes
};

const professionIcons = {
    alchemy: "fa-flask", armor_smithing: "fa-shield-halved", blacksmithing: "fa-fire",
    carpentry: "fa-tree", cooking: "fa-utensils", jewel_crafting: "fa-gem",
    leatherworking: "fa-shoe-prints", stonemasonry: "fa-mountain", tailoring: "fa-shirt"
};

const initialProfessions = [
    { id: 'alchemy', name: 'Alchemy', group: 'standard' },
    { id: 'armor_smithing', name: 'Armor Smithing', group: 'heavy' },
    { id: 'blacksmithing', name: 'Blacksmithing', group: 'standard' },
    { id: 'carpentry', name: 'Carpentry', group: 'easy' },
    { id: 'cooking', name: 'Cooking', group: 'standard' },
    { id: 'jewel_crafting', name: 'Jewel Crafting', group: 'heavy' },
    { id: 'leatherworking', name: 'Leatherworking', group: 'medium' },
    { id: 'stonemasonry', name: 'Stonemasonry', group: 'easy' },
    { id: 'tailoring', name: 'Tailoring', group: 'standard' }
];

let userProgress = JSON.parse(localStorage.getItem('rise_craft_progress')) || 
    initialProfessions.map(p => ({ ...p, level: 1, currentXp: 0 }));

let selectedProfessionId = null;

// Global Simülatör Ayarları ve Pazar Belleği (Fiyatları ve Tercihleri Korur)
let simXpBonuses = { craftPremium: true, expPremium: false, farmPremium: false, crafterTitle: false, eggPeppers: false, gmEvent: 0, kingEvent: 0 };
let marketPrices = JSON.parse(localStorage.getItem('rise_craft_market_prices')) || {};
let marketStrategies = JSON.parse(localStorage.getItem('rise_craft_market_strategies')) || {};

// SEKME GEÇİŞ MOTORU
window.switchTab = function(tabName) {
    document.getElementById('tab-content-dashboard').classList.add('hidden');
    document.getElementById('tab-content-simulator').classList.add('hidden');
    document.getElementById('btn-tab-dashboard').className = "flex-1 text-center py-2 text-xs font-black tracking-wider uppercase border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-all";
    document.getElementById('btn-tab-simulator').className = "flex-1 text-center py-2 text-xs font-black tracking-wider uppercase border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-all";

    if (tabName === 'dashboard') {
        document.getElementById('tab-content-dashboard').classList.remove('hidden');
        document.getElementById('btn-tab-dashboard').className = "flex-1 text-center py-2 text-xs font-black tracking-wider uppercase border-b-2 border-amber-500 text-amber-400 transition-all";
        renderGridDashboard();
    } else {
        document.getElementById('tab-content-simulator').classList.remove('hidden');
        document.getElementById('btn-tab-simulator').className = "flex-1 text-center py-2 text-xs font-black tracking-wider uppercase border-b-2 border-amber-500 text-amber-400 transition-all";
        initSimulatorUI();
    }
}

// -------------------------------------------------------------
// BÖLÜM 1: GÖSTERGE PANELİ VE SEVİYE GÜNCELLEME (DASHBOARD)
// -------------------------------------------------------------
function saveProgress() {
    localStorage.setItem('rise_craft_progress', JSON.stringify(userProgress));
    calculateGrandMasterStatus();
    renderGridDashboard();
}

function calculateGrandMasterStatus() {
    const levels = userProgress.map(p => p.level);
    const minLevel = Math.min(...levels);
    let statusText = "Usta Adayı", targetGmLevel = 10, baseGmLevel = 1, nextGmStatus = "GM 1";

    if (minLevel >= 40) { statusText = "🏆 GrandMaster 4"; targetGmLevel = 40; baseGmLevel = 40; nextGmStatus = "MAX"; }
    else if (minLevel >= 30) { statusText = "🥇 GrandMaster 3"; targetGmLevel = 40; baseGmLevel = 30; nextGmStatus = "GM 4"; }
    else if (minLevel >= 20) { statusText = "🥈 GrandMaster 2"; targetGmLevel = 30; baseGmLevel = 20; nextGmStatus = "GM 3"; }
    else if (minLevel >= 10) { statusText = "🥉 GrandMaster 1"; targetGmLevel = 20; baseGmLevel = 10; nextGmStatus = "GM 2"; }
    
    document.getElementById('gm-status').innerText = statusText;

    let totalCurrentProgress = 0, totalTargetSegment = 0;
    userProgress.forEach(prof => {
        totalCurrentProgress += Math.max(0, prof.level - baseGmLevel);
        totalTargetSegment += (targetGmLevel - baseGmLevel);
    });

    const totalPct = totalTargetSegment > 0 ? Math.min(100, Math.floor((totalCurrentProgress / totalTargetSegment) * 100)) : 100;
    document.getElementById('gm-bar-container').innerHTML = `
        <div class="flex justify-between items-center mb-1.5 text-[11px] font-bold">
            <span class="text-gray-400 flex items-center gap-1"><i class="fa-solid fa-trophy text-amber-500 text-[10px]"></i> ${nextGmStatus} Gelişimi:</span>
            <span class="text-amber-400 font-black text-xs">${totalPct}%</span>
        </div>
        <div class="w-full bg-gray-950 rounded-full h-2.5 p-0.5 border border-gray-800 shadow-inner overflow-hidden">
            <div class="bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 h-1.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-500" style="width: ${totalPct}%"></div>
        </div>`;
}

function renderGridDashboard() {
    const gridContainer = document.getElementById('professions-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    userProgress.forEach((prof) => {
        const xpTable = xpGroups[prof.group];
        const nextLevelXp = xpTable[prof.level] || 0;
        const pct = nextLevelXp > 0 ? (prof.currentXp / nextLevelXp) * 100 : 100;
        const isSelected = selectedProfessionId === prof.id;

        let cardBgClass = 'bg-gray-900/40 border-gray-800/60 hover:border-gray-700 hover:bg-gray-900/80';
        let levelBadgeClass = 'text-gray-400 bg-gray-950 border-gray-850';
        let iconBgClass = 'bg-gray-950 text-gray-400 border border-gray-800/80';

        if (prof.level >= 40) { cardBgClass = 'bg-gradient-to-b from-purple-950/40 to-black/40 border-purple-800/50 shadow-md'; levelBadgeClass = 'text-purple-400 bg-purple-950/50 border-purple-900/50'; iconBgClass = 'bg-purple-950 text-purple-400'; }
        else if (prof.level >= 30) { cardBgClass = 'bg-gradient-to-b from-amber-950/40 to-black/40 border-amber-900/50 shadow-md'; levelBadgeClass = 'text-amber-400 bg-amber-950/50 border-amber-900/50'; iconBgClass = 'bg-amber-950 text-amber-400'; }
        else if (prof.level >= 20) { cardBgClass = 'bg-gradient-to-b from-slate-800/40 to-black/40 border-slate-700/60 shadow-md'; levelBadgeClass = 'text-slate-300 bg-slate-900/60 border-slate-800'; iconBgClass = 'bg-slate-900 text-slate-300'; }
        else if (prof.level >= 10) { cardBgClass = 'bg-gradient-to-b from-orange-950/30 to-black/40 border-orange-900/40 shadow-md'; levelBadgeClass = 'text-orange-400 bg-orange-950/40 border-orange-900/50'; iconBgClass = 'bg-orange-950 text-orange-400'; }

        if (isSelected) { cardBgClass = 'bg-gradient-to-b from-amber-500/15 to-transparent border-amber-500/80 shadow-lg scale-[0.98]'; levelBadgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30'; iconBgClass = 'bg-amber-500 text-black border-amber-400'; }

        const card = document.createElement('button');
        card.onclick = () => selectProfessionDashboard(prof.id);
        card.className = `w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${cardBgClass}`;
        card.innerHTML = `
            <div class="flex items-center justify-between w-full mb-3 z-10">
                <div class="flex items-center space-x-2">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center ${iconBgClass} border border-transparent"><i class="fa-solid ${professionIcons[prof.id]} text-xs"></i></div>
                    <span class="text-xs font-black text-gray-100">${prof.name}</span>
                </div>
                <span class="text-[10px] font-black px-1.5 py-0.5 rounded border ${levelBadgeClass}">Lvl ${prof.level}</span>
            </div>
            <div class="w-full z-10 space-y-1">
                <div class="flex justify-between text-[9px] font-bold text-gray-500 px-0.5">
                    <span>${prof.currentXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP</span>
                    <span>%${Math.floor(pct)}</span>
                </div>
                <div class="w-full bg-gray-950 rounded-full h-1.5 p-0.5 border border-gray-850 overflow-hidden">
                    <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-0.5 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>`;
        gridContainer.appendChild(card);
    });
}

function selectProfessionDashboard(id) {
    selectedProfessionId = id;
    renderGridDashboard();
    const detailPanel = document.getElementById('active-detail-panel');
    const profIndex = userProgress.findIndex(p => p.id === id);
    const prof = userProgress[profIndex];
    const maxVal = xpGroups[prof.group][prof.level] || 0;

    detailPanel.innerHTML = `
        <div class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-2xl animate-fadeIn glass-panel">
            <div class="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400"><i class="fa-solid ${professionIcons[prof.id]} text-xs"></i></div>
                    <div><h3 class="text-sm font-black text-white">${prof.name} Durum Güncelle</h3></div>
                </div>
                <button onclick="closeDetailPanel()" class="w-7 h-7 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-xs"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-black/30 border border-gray-850 p-2.5 rounded-xl">
                    <label class="block text-[9px] uppercase font-black text-amber-500/80 mb-1 tracking-widest">Mevcut Seviye</label>
                    <input type="number" min="1" max="40" value="${prof.level}" class="w-full bg-black border border-gray-800 rounded-lg p-2 text-white font-black text-sm text-center outline-none" onchange="updateLevel(${profIndex}, this.value)">
                </div>
                <div class="bg-black/30 border border-gray-850 p-2.5 rounded-xl">
                    <label class="block text-[9px] uppercase font-black text-amber-500/80 mb-1 tracking-widest">Mevcut XP</label>
                    <input type="number" min="0" max="${maxVal}" value="${prof.currentXp}" class="w-full bg-black border border-gray-800 rounded-lg p-2 text-white font-bold text-sm text-center outline-none" onchange="updateXp(${profIndex}, this.value)">
                </div>
            </div>
        </div>`;
    detailPanel.classList.remove('hidden');
}

window.closeDetailPanel = function() { selectedProfessionId = null; document.getElementById('active-detail-panel').classList.add('hidden'); renderGridDashboard(); }
window.updateLevel = function(index, value) { let lvl = parseInt(value) || 1; if (lvl < 1) lvl = 1; if (lvl > 40) lvl = 40; userProgress[index].level = lvl; saveProgress(); selectProfessionDashboard(userProgress[index].id); }
window.updateXp = function(index, value) { let xp = parseInt(value) || 0; const maxVal = xpGroups[userProgress[index].group][userProgress[index].level] || 0; if (xp < 0) xp = 0; if (xp > maxVal) xp = maxVal; userProgress[index].currentXp = xp; saveProgress(); }

// -------------------------------------------------------------
// BÖLÜM 2: GELİŞMİŞ RECURSIVE CRAFT SIMULATOR & PAZAR MOTORU
// -------------------------------------------------------------
function initSimulatorUI() {
    const profSelect = document.getElementById('sim-profession-select');
    if (!profSelect) return;
    profSelect.innerHTML = initialProfessions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    onSimulatorProfessionChange();
}

window.onSimulatorProfessionChange = function() {
    const profId = document.getElementById('sim-profession-select').value;
    const recipeSelect = document.getElementById('sim-recipe-select');
    const prof = userProgress.find(p => p.id === profId);

    const currentRecipes = recipes[profId] || [];
    recipeSelect.innerHTML = currentRecipes
        .map(r => `<option value="${r.id}">${r.name} (Lvl ${r.levelRequired})</option>`).join('');
    
    if (currentRecipes.length === 0) {
        recipeSelect.innerHTML = `<option value="">Aktif Reçete Bulunmuyor</option>`;
    }
    runSimulatorCalculation();
}

window.handleSimPremiumChange = function(type) {
    simXpBonuses.craftPremium = false; simXpBonuses.expPremium = false; simXpBonuses.farmPremium = false;
    document.getElementById(`sim-chk-${type}`).checked = true;
    simXpBonuses[type + 'Premium'] = true;
    updateSimBonus();
}

window.updateSimBonus = function() {
    simXpBonuses.crafterTitle = document.getElementById('sim-chk-title').checked;
    simXpBonuses.eggPeppers = document.getElementById('sim-chk-pepper').checked;
    simXpBonuses.gmEvent = parseInt(document.getElementById('sim-num-gm').value) || 0;
    simXpBonuses.kingEvent = parseInt(document.getElementById('sim-num-king').value) || 0;
    runSimulatorCalculation();
}

// BULUCU FONKSİYON: Tüm veri setlerinde malzeme ID'sine göre arama yapar
function findRecipeById(matId) {
    for (const pId in recipes) {
        const found = recipes[pId].find(r => r.id === matId);
        if (found) return found;
    }
    return null;
}

// RECURSIVE (DERİNLİK) MALZEME AĞACI TARAYICI
function aggregateMaterials(recipeId, neededAmount, rawGatherList, intermediateCraftList) {
    const recipe = findRecipeById(recipeId);
    
    // Eğer bir reçete karşılığı yoksa, o saf bir ham maddedir (Örn: copper_ore, charcoal, milk)
    if (!recipe) {
        rawGatherList[recipeId] = (rawGatherList[recipeId] || 0) + neededAmount;
        return;
    }

    const strategy = marketStrategies[recipeId] || 'buy'; // 'buy' veya 'craft'

    // Eğer ara ürünse ve kullanıcı pazardan hazır almayı seçtiyse, dallanmayı durdur ham madde gibi listele
    if (recipe.isIntermediate && strategy === 'buy') {
        rawGatherList[recipeId] = (rawGatherList[recipeId] || 0) + neededAmount;
        return;
    }

    // Eğer "Kendim Üreteceğim" seçildiyse veya ara ürün değilse (son ürünse) alt bileşenlerine in (Dallanma)
    intermediateCraftList[recipeId] = (intermediateCraftList[recipeId] || 0) + neededAmount;
    
    if (recipe.materials) {
        Object.entries(recipe.materials).forEach(([subMatId, count]) => {
            aggregateMaterials(subMatId, count * neededAmount, rawGatherList, intermediateCraftList);
        });
    }
}

window.setMarketStrategy = function(matId, strategy) {
    marketStrategies[matId] = strategy;
    localStorage.setItem('rise_craft_market_strategies', JSON.stringify(marketStrategies));
    runSimulatorCalculation();
}

window.setMarketPrice = function(matId, price) {
    marketPrices[matId] = parseInt(price) || 0;
    localStorage.setItem('rise_craft_market_prices', JSON.stringify(marketPrices));
    runSimulatorCalculation();
}

window.runSimulatorCalculation = function() {
    const profId = document.getElementById('sim-profession-select').value;
    const targetLvl = parseInt(document.getElementById('sim-target-level').value) || 1;
    const recipeId = document.getElementById('sim-recipe-select').value;
    const matrixDiv = document.getElementById('sim-market-matrix');
    const resultPanel = document.getElementById('sim-result-panel');

    if (!recipeId) { matrixDiv.innerHTML = '<p class="text-xs text-gray-500">Reçete bulunamadı.</p>'; resultPanel.classList.add('hidden'); return; }

    const prof = userProgress.find(p => p.id === profId);
    const table = xpGroups[prof.group];
    
    // 1. Hedef Seviye XP İhtiyacı Hesabı
    let neededXp = 0;
    for (let i = prof.level; i < targetLvl; i++) { neededXp += table[i] || 0; }
    neededXp = Math.max(0, neededXp - prof.currentXp);

    if (neededXp === 0) {
        resultPanel.innerHTML = `<div class="text-xs text-center text-amber-500 font-bold">Zaten hedef seviyedesiniz veya daha üstündesiniz!</div>`;
        resultPanel.classList.remove('hidden');
        matrixDiv.innerHTML = '';
        return;
    }

    // 2. Dinamik XP Bonus Çarpanı Hesaplama
    let bonusPercent = 0;
    if (simXpBonuses.craftPremium) bonusPercent += 30;
    if (simXpBonuses.expPremium) bonusPercent += 10;
    if (simXpBonuses.farmPremium) bonusPercent += 10;
    if (simXpBonuses.crafterTitle) bonusPercent += 5;
    if (simXpBonuses.eggPeppers) bonusPercent += 10;
    bonusPercent += simXpBonuses.gmEvent + simXpBonuses.kingEvent;

    const mainRecipe = findRecipeById(recipeId);
    const baseRecipeXp = mainRecipe.xpGiven / 1.30; // Standart taban %30 premiumdan arındırılır
    const dynamicXpPerCraft = baseRecipeXp * (1 + (bonusPercent / 100));

    // 3. Döngüsel/Zincirleme XP Getirisini Simüle Etme Öngörüsü
    // Kullanıcının stratejisine göre zincirleme gelecek gizli XP'leri bulmak için hayali bir ağaç simüle edilir
    let testRaw = {}, testCraft = {};
    aggregateMaterials(recipeId, 1, testRaw, testCraft);

    let xpPerMainCraftCycle = dynamicXpPerCraft;
    Object.entries(testCraft).forEach(([cId, amount]) => {
        if (cId !== recipeId) { // Ara malzeme üretiminden gelen bonus
            const subRecipe = findRecipeById(cId);
            const subBaseXp = subRecipe.xpGiven / 1.30;
            const subDynamicXp = subBaseXp * (1 + (bonusPercent / 100));
            xpPerMainCraftCycle += subDynamicXp * amount;
        }
    });

    // Ana ürün döngü adedi
    const mainCraftCount = Math.ceil(neededXp / xpPerMainCraftCycle);

    // 4. Nihai Malzeme Listelerinin Toplanması (Gerçek Değerlerle)
    let finalRawGather = {};
    let finalIntermediateCraft = {};
    aggregateMaterials(recipeId, mainCraftCount, finalRawGather, finalIntermediateCraft);

    // 5. PAZAR TABLOSU (MATRİS) ÜRETİMİ
    // Listelenecek tüm benzersiz materyalleri topla
    const allUniqueMaterials = new Set([...Object.keys(finalRawGather), ...Object.keys(finalIntermediateCraft)]);
    
    if(allUniqueMaterials.size === 0) { matrixDiv.innerHTML = ''; return; }

    let matrixHtml = "";
    allUniqueMaterials.forEach(matId => {
        const isCraftableIntermediate = findRecipeById(matId)?.isIntermediate;
        const currentPrice = marketPrices[matId] || 0;
        const currentStrategy = marketStrategies[matId] || 'buy';

        const prettyName = matId.replace(/_/g, ' ').toUpperCase();

        matrixHtml += `
            <div class="flex flex-col bg-black/40 border border-gray-900 p-2.5 rounded-xl space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-[11px] font-black text-gray-200">📦 ${prettyName}</span>
                    <div class="flex items-center space-x-1.5">
                        <span class="text-[9px] text-gray-500">Pazar Adet (Gold):</span>
                        <input type="number" value="${currentPrice}" oninput="setMarketPrice('${matId}', this.value)" 
                            class="w-16 bg-black border border-gray-800 rounded px-1 py-0.5 text-right font-bold text-xs text-amber-400 outline-none">
                    </div>
                </div>
                ${isCraftableIntermediate ? `
                <div class="flex justify-end gap-1.5 pt-1 border-t border-gray-900/30">
                    <button onclick="setMarketStrategy('${matId}', 'buy')" class="text-[9px] font-extrabold px-2 py-1 rounded transition-all ${currentStrategy === 'buy' ? 'bg-amber-500 text-black shadow' : 'bg-gray-950 text-gray-400 border border-gray-800'}">🛒 Pazardan Al</button>
                    <button onclick="setMarketStrategy('${matId}', 'craft')" class="text-[9px] font-extrabold px-2 py-1 rounded transition-all ${currentStrategy === 'craft' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-950 text-gray-400 border border-gray-800'}">🔁 Kendim Üret</button>
                </div>` : ''}
            </div>`;
    });
    matrixDiv.innerHTML = matrixHtml;

    // 6. TOPLAM PARASAL MALİYET VE YAPILACAKLAR RAPORU
    let totalCostGold = 0;
    let rawListHtml = "";
    Object.entries(finalRawGather).forEach(([matId, amount]) => {
        const price = marketPrices[matId] || 0;
        const cost = price * amount;
        totalCostGold += cost;
        rawListHtml += `<div class="flex justify-between text-gray-300">• <span>${matId.replace(/_/g, ' ')}</span> <span class="font-bold text-white">${amount.toLocaleString()} Adet <span class="text-gray-500 text-[10px]">(${cost.toLocaleString()} G)</span></span></div>`;
    });

    let craftListHtml = "";
    let totalHiddenXpEarned = 0;
    Object.entries(finalIntermediateCraft).forEach(([matId, amount]) => {
        const subRecipe = findRecipeById(matId);
        const subBaseXp = subRecipe.xpGiven / 1.30;
        const subDynamicXp = subBaseXp * (1 + (bonusPercent / 100));
        const gainedXp = Math.floor(subDynamicXp * amount);
        totalHiddenXpEarned += gainedXp;

        craftListHtml += `<div class="flex justify-between text-gray-400">• <span>${subRecipe.name}</span> <span class="font-bold text-emerald-400">+${gainedXp.toLocaleString()} XP <span class="text-gray-500 text-[10px]">(${amount.toLocaleString()} Kez)</span></span></div>`;
    });

    resultPanel.innerHTML = `
        <div class="text-amber-500 font-black border-b border-gray-900 pb-1.5 mb-2 text-center text-[10px] tracking-widest uppercase">📊 ÜRETİM VE PAZAR ANALİZ RAPORU</div>
        <div class="space-y-1 text-[11px]">
            <div class="flex justify-between text-gray-400"><span>Hedefe Kalan Saf XP:</span> <span class="text-white font-bold">${neededXp.toLocaleString()} XP</span></div>
            <div class="flex justify-between text-gray-400"><span>Toplam Kazanılacak XP:</span> <span class="text-emerald-400 font-bold">${totalHiddenXpEarned.toLocaleString()} XP</span></div>
            <div class="flex justify-between border-b border-gray-900 pb-2 text-gray-400"><span>Ana Ürün Üretim Adedi:</span> <span class="text-amber-400 font-black text-xs">${mainCraftCount.toLocaleString()} Adet</span></div>
            
            <div class="pt-1.5 font-bold text-amber-400 text-[10px] uppercase tracking-wider">🛒 Pazar Alışveriş Listesi:</div>
            <div class="pl-1 space-y-0.5 max-h-[100px] overflow-y-auto custom-scrollbar">${rawListHtml}</div>

            <div class="pt-2 font-bold text-emerald-400 text-[10px] uppercase tracking-wider">🔥 İşlenecek Tezgah Hattı & XP Dağılımı:</div>
            <div class="pl-1 space-y-0.5 max-h-[100px] overflow-y-auto custom-scrollbar">${craftListHtml}</div>
            
            <div class="mt-3 p-2.5 bg-black rounded-xl border border-gray-900 flex justify-between items-center">
                <span class="text-xs font-black text-gray-200">💰 TOPLAM MATERYAL MALİYETİ:</span>
                <span class="text-sm font-black text-yellow-400">${totalCostGold.toLocaleString()} Gold</span>
            </div>
        </div>`;
    resultPanel.classList.remove('hidden');
}

// BAŞLANGIÇ ÇALIŞTIRICISI
window.addEventListener('DOMContentLoaded', () => {
    calculateGrandMasterStatus();
    renderGridDashboard();
});
