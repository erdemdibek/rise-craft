// Tüm Meslek Modüllerini İçeri Aktar
import { alchemyRecipes } from './recipes/alchemy.js';
import { armorSmithingRecipes } from './recipes/armor_smithing.js';
import { blacksmithingRecipes, calculateBlacksmithingChain } from './recipes/blacksmithing.js';
import { carpentryRecipes, calculateCarpentryChain } from './recipes/carpentry.js';
import { cookingRecipes } from './recipes/cooking.js';
import { jewelCraftingRecipes } from './recipes/jewel_crafting.js';
import { leatherworkingRecipes, calculateLeatherworkingChain } from './recipes/leatherworking.js';
import { stonemasonryRecipes } from './recipes/stonemasonry.js';
import { tailoringRecipes, calculateTailoringChain } from './recipes/tailoring.js';
import { weaponSmithingRecipes } from './recipes/weapon_smithing.js';

const xpGroups = {
    heavy: [0, 12000, 24000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 192000, 240000, 288000, 360000, 432000, 504000, 600000, 696000, 792000, 912000, 1032000, 1152000, 1296000, 1440000, 1584000, 1752000, 1920000, 2160000, 2400000, 2880000, 3360000, 4080000, 4800000, 5760000, 6720000, 7920000, 9120000, 10560000, 12240000, 14160000, 16800000],
    medium: [0, 9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000, 108000, 144000, 180000, 216000, 270000, 324000, 378000, 450000, 522000, 594000, 684000, 774000, 864000, 972000, 1080000, 1188000, 1314000, 1440000, 1620000, 1800000, 2160000, 2520000, 3060000, 3600000, 4320000, 5040000, 5940000, 6720000, 7920000, 9180000, 10620000, 12600000],
    standard: [0, 6000, 12000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 180000, 216000, 252000, 300000, 348000, 396000, 456000, 516000, 576000, 648000, 720000, 792000, 876000, 960000, 1080000, 1200000, 1440000, 1680000, 2040000, 2400000, 2880000, 3360000, 3960000, 4560000, 5280000, 6120000, 7080000, 8400000],
    easy: [0, 3000, 6000, 9000, 12000, 15000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 90000, 108000, 126000, 150000, 174000, 198000, 228000, 258000, 288000, 324000, 360000, 396000, 438000, 480000, 540000, 600000, 720000, 840000, 1020000, 1200000, 1440000, 1680000, 1980000, 2280000, 2640000, 3060000, 3600000, 4200000]
};

const recipes = {
    alchemy: alchemyRecipes, armor_smithing: armorSmithingRecipes, blacksmithing: blacksmithingRecipes,
    carpentry: carpentryRecipes, cooking: cookingRecipes, jewel_crafting: jewelCraftingRecipes,
    leatherworking: leatherworkingRecipes, stonemasonry: stonemasonryRecipes, tailoring: tailoringRecipes,
    weapon_smithing: weaponSmithingRecipes
};

const professionIcons = {
    alchemy: "fa-flask", armor_smithing: "fa-shield-halved", blacksmithing: "fa-fire",
    carpentry: "fa-tree", cooking: "fa-utensils", jewel_crafting: "fa-gem",
    leatherworking: "fa-shoe-prints", stonemasonry: "fa-mountain", tailoring: "fa-shirt",
    weapon_smithing: "fa-sword"
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
    { id: 'tailoring', name: 'Tailoring', group: 'standard' },
    { id: 'weapon_smithing', name: 'Weapon Smithing', group: 'heavy' }
];

let userProgress = JSON.parse(localStorage.getItem('rise_craft_progress')) || 
    initialProfessions.map(p => ({ ...p, level: 1, currentXp: 0 }));

let selectedProfessionId = null;

function saveProgress() {
    localStorage.setItem('rise_craft_progress', JSON.stringify(userProgress));
    calculateGrandMasterStatus();
    renderGridDashboard();
}

function calculateGrandMasterStatus() {
    const levels = userProgress.map(p => p.level);
    const minLevel = Math.min(...levels);
    
    let statusText = "Normal Üye";
    let targetGmLevel = 10;
    let baseGmLevel = 1;
    let nextGmStatus = "GM 1";

    if (minLevel >= 40) { statusText = "🏆 GrandMaster 4"; targetGmLevel = 40; baseGmLevel = 40; nextGmStatus = "MAX"; }
    else if (minLevel >= 30) { statusText = "🥇 GrandMaster 3"; targetGmLevel = 40; baseGmLevel = 30; nextGmStatus = "GM 4"; }
    else if (minLevel >= 20) { statusText = "🥈 GrandMaster 2"; targetGmLevel = 30; baseGmLevel = 20; nextGmStatus = "GM 3"; }
    else if (minLevel >= 10) { statusText = "🥉 GrandMaster 1"; targetGmLevel = 20; baseGmLevel = 10; nextGmStatus = "GM 2"; }
    else { statusText = `Usta Adayı`; targetGmLevel = 10; baseGmLevel = 1; nextGmStatus = "GM 1"; }
    
    document.getElementById('gm-status').innerText = statusText;

    // Alt Bar İlerleme Yüzdesi Hesaplama (Tüm mesleklerin hedefe göre toplam durumu)
    let totalCurrentProgress = 0;
    let totalTargetSegment = 0;

    userProgress.forEach(prof => {
        const currentLvl = prof.level;
        // Mevcut GM segmenti içindeki ilerlemesi
        const segmentEarned = Math.max(0, currentLvl - baseGmLevel);
        const segmentTotal = targetGmLevel - baseGmLevel;
        
        totalCurrentProgress += segmentEarned;
        totalTargetSegment += segmentTotal;
    });

    const totalPct = totalTargetSegment > 0 ? Math.min(100, Math.floor((totalCurrentProgress / totalTargetSegment) * 100)) : 100;

    const gmBarContainer = document.getElementById('gm-bar-container');
    if (gmBarContainer) {
        gmBarContainer.innerHTML = `
            <div class="flex justify-between items-center mb-1.5 text-[11px] font-bold">
                <span class="text-gray-400 flex items-center gap-1">
                    <i class="fa-solid fa-trophy text-amber-500 text-[10px]"></i> ${nextGmStatus} Olmaya Kalan:
                </span>
                <span class="text-amber-400 font-black text-xs">${totalPct}%</span>
            </div>
            <div class="w-full bg-gray-950 rounded-full h-2.5 p-0.5 border border-gray-800 shadow-inner overflow-hidden">
                <div class="bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 h-1.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-500" style="width: ${totalPct}%"></div>
            </div>
        `;
    }
}

function renderGridDashboard() {
    const gridContainer = document.getElementById('professions-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    userProgress.forEach((prof) => {
        const xpTable = xpGroups[prof.group];
        const nextLevelXp = xpTable[prof.level] || 0;
        const pct = nextLevelXp > 0 ? (prof.currentXp / nextLevelXp) * 100 : 100;
        const icon = professionIcons[prof.id] || "fa-gavel";
        const isSelected = selectedProfessionId === prof.id;

        const card = document.createElement('button');
        card.onclick = () => selectProfession(prof.id);
        card.className = `w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
            isSelected 
            ? 'bg-gradient-to-b from-amber-500/15 to-transparent border-amber-500/80 shadow-[0_4px_20px_rgba(245,158,11,0.12)] scale-[0.98]' 
            : 'bg-gray-900/40 border-gray-800/60 hover:border-gray-700 hover:bg-gray-900/80'
        }`;

        card.innerHTML = `
            <div class="flex items-center justify-between w-full mb-3.5 z-10">
                <div class="flex items-center space-x-2.5">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-amber-500 text-black' : 'bg-gray-950 text-gray-400'} border ${isSelected ? 'border-amber-400' : 'border-gray-800/80'} transition-colors duration-200">
                        <i class="fa-solid ${icon} text-xs"></i>
                    </div>
                    <span class="text-xs font-black text-gray-100 tracking-wide">${prof.name}</span>
                </div>
                <span class="text-[10px] font-black ${isSelected ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-gray-400 bg-gray-950 border-gray-850'} px-2 py-0.5 rounded-md border shadow-sm">
                    Lvl ${prof.level}
                </span>
            </div>
            <div class="w-full z-10">
                <div class="flex justify-between text-[9px] font-bold text-gray-500 mb-1 px-0.5">
                    <span>XP İlerleme</span>
                    <span>%${Math.floor(pct)}</span>
                </div>
                <div class="w-full bg-gray-950 rounded-full h-1.5 p-0.5 border border-gray-850 overflow-hidden">
                    <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-0.5 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

function selectProfession(id) {
    selectedProfessionId = id;
    renderGridDashboard();

    const detailPanel = document.getElementById('active-detail-panel');
    const profIndex = userProgress.findIndex(p => p.id === id);
    const prof = userProgress[profIndex];
    
    const xpTable = xpGroups[prof.group];
    const nextLevelXp = xpTable[prof.level] || 0;

    let recipeOptions = `<option value="">-- Üretilecek Reçeteyi Seçin --</option>`;
    if (recipes[prof.id] && recipes[prof.id].length > 0) {
        recipes[prof.id].forEach(r => {
            if (prof.level >= r.levelRequired) {
                recipeOptions += `<option value="${r.id}">${r.name} (Lvl ${r.levelRequired})</option>`;
            }
        });
    } else {
        recipeOptions = `<option value="">Bu meslek için aktif reçete verisi yok.</option>`;
    }

    detailPanel.innerHTML = `
        <div class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-2xl animate-fadeIn glass-panel">
            <div class="flex justify-between items-center border-b border-gray-800 pb-3.5 mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <i class="fa-solid ${professionIcons[prof.id]} text-xs"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-white">${prof.name} Panel</h3>
                        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">${prof.group.toUpperCase()} XP Grubu</p>
                    </div>
                </div>
                <button onclick="closeDetailPanel()" class="w-7 h-7 bg-gray-950 hover:bg-gray-800 rounded-lg border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors duration-150">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-black/30 border border-gray-850 p-2.5 rounded-xl">
                    <label class="block text-[9px] uppercase font-black text-amber-500/80 mb-1 tracking-widest">Mevcut Lvl</label>
                    <input type="number" min="1" max="40" value="${prof.level}" 
                        class="w-full bg-black/60 border border-gray-800 rounded-lg p-2 text-white font-black text-sm text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all"
                        onchange="updateLevel(${profIndex}, this.value)">
                </div>
                <div class="bg-black/30 border border-gray-850 p-2.5 rounded-xl">
                    <label class="block text-[9px] uppercase font-black text-amber-500/80 mb-1 tracking-widest">Mevcut XP</label>
                    <input type="number" min="0" max="${nextLevelXp}" value="${prof.currentXp}" 
                        id="xp-input-${profIndex}"
                        class="w-full bg-black/60 border border-gray-800 rounded-lg p-2 text-gray-200 font-bold text-sm text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all"
                        onchange="updateXp(${profIndex}, this.value)">
                </div>
            </div>

            <div class="bg-black/50 border border-gray-950 rounded-2xl p-4 shadow-inner">
                <p class="text-[9px] font-black text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                    <i class="fa-solid fa-calculator text-amber-500"></i> Hedef Hesaplayıcı
                </p>
                <div class="space-y-3 mb-3.5">
                    <div class="flex gap-2">
                        <div class="w-1/3">
                            <input type="number" id="target-${profIndex}" min="${prof.level + 1}" max="40" placeholder="Hedef Lvl" 
                                class="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs font-black text-center text-white focus:border-amber-500 outline-none h-11">
                        </div>
                        <div class="w-2/3">
                            <select id="select-${profIndex}" class="w-full bg-black border border-gray-800 rounded-xl px-3 text-xs font-bold text-gray-300 focus:border-amber-500 outline-none h-11 appearance-none custom-select">
                                ${recipeOptions}
                            </select>
                        </div>
                    </div>
                </div>
                <button id="calc-btn-${profIndex}" class="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-black font-black text-xs py-3 rounded-xl transition duration-300 shadow-md transform active:scale-[0.99] tracking-wider uppercase">
                    Hesaplamayı Başlat
                </button>
                <div id="result-${profIndex}" class="text-xs text-left mt-3.5 p-3.5 bg-gray-950/90 rounded-xl border border-gray-850 text-amber-400 font-medium hidden space-y-1.5 shadow-inner animate-fadeIn"></div>
            </div>
        </div>
    `;

    document.getElementById(`calc-btn-${profIndex}`).addEventListener('click', () => runCalculation(profIndex));
    detailPanel.classList.remove('hidden');
    
    // Mobil odaklanmayı kolaylaştırmak için görünümü panele kaydır
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function runCalculation(index) {
    const prof = userProgress[index];
    const targetInput = document.getElementById(`target-${index}`).value;
    const recipeId = document.getElementById(`select-${index}`).value;
    const resultDiv = document.getElementById(`result-${index}`);
    const targetLvl = parseInt(targetInput);

    if (!targetLvl || targetLvl <= prof.level || targetLvl > 40) {
        alert("Lütfen geçerli bir hedef seviye girin (Mevcut seviyeden büyük, max 40)."); return;
    }
    if (!recipeId) {
        alert("Lütfen bir reçete seçin."); return;
    }

    const table = xpGroups[prof.group];
    let neededXp = 0;
    for (let i = prof.level; i < targetLvl; i++) { neededXp += table[i] || 0; }
    neededXp = neededXp - prof.currentXp;
    if (neededXp < 0) neededXp = 0;

    const currentRecipes = recipes[prof.id] || [];
    const selectedRecipe = currentRecipes.find(r => r.id === recipeId);
    if (!selectedRecipe) return;

    // --- ÖZEL MODÜLER ZİNCİR YÖNETİMİ ---
    if (prof.id === "carpentry" && selectedRecipe.isChain) {
        resultDiv.innerHTML = calculateCarpentryChain(neededXp, selectedRecipe, currentRecipes);
    }
    else if (prof.id === "tailoring" && selectedRecipe.isChain) {
        resultDiv.innerHTML = calculateTailoringChain(neededXp, selectedRecipe);
    } 
    else if (prof.id === "blacksmithing" && selectedRecipe.isChain) {
        resultDiv.innerHTML = calculateBlacksmithingChain(neededXp, selectedRecipe, currentRecipes);
    } 
    else if (prof.id === "leatherworking" && selectedRecipe.isChain) {
        resultDiv.innerHTML = calculateLeatherworkingChain(neededXp, selectedRecipe, currentRecipes);
    }
    // --- GENEL DİNAMİK MATERYAL HESAPLAYICI (FALLBACK) ---
    else if (selectedRecipe.materials) {
        const craftCount = Math.ceil(neededXp / selectedRecipe.xpGiven);
        const mats = selectedRecipe.materials;
        let dynamicMatsHtml = "";
        
        Object.keys(mats).forEach(key => {
            if (mats[key] > 0) {
                const totalMatCount = mats[key] * craftCount;
                dynamicMatsHtml += `
                <div class="flex justify-between items-center border-b border-gray-900 py-1.5 text-[11px] font-bold">
                    <span class="text-gray-400">📦 ${key.replace(/([A-Z])/g, ' $1').toUpperCase()}:</span> 
                    <span class="text-white">${totalMatCount.toLocaleString()} Adet</span>
                </div>`;
            }
        });

        resultDiv.innerHTML = `
            <div class="text-amber-500 font-black border-b border-gray-900 pb-2 mb-2 text-center text-[10px] tracking-widest uppercase">🛠️ Gereken Toplam Materyaller</div>
            <div class="mb-1.5 flex justify-between text-[11px] font-bold text-gray-400"><span>Hedefe Kalan Net XP:</span> <span class="text-white">${neededXp.toLocaleString()} XP</span></div>
            <div class="mb-3 flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-gray-900">
                <span class="text-gray-400 font-bold text-xs">Toplam Üretim:</span>
                <span class="text-sm font-black text-amber-400">${craftCount.toLocaleString()} Adet</span>
            </div>
            <div class="space-y-0.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">${dynamicMatsHtml}</div>
        `;
    } 
    // --- DÜZ ÜRETİM / REÇETE DETAYI ---
    else {
        const xpPerCraft = selectedRecipe.xpGiven;
        const craftCount = Math.ceil(neededXp / xpPerCraft);
        resultDiv.innerHTML = `
            <div class="text-amber-500 font-black border-b border-gray-900 pb-2 mb-2 text-center text-[10px] tracking-widest uppercase">🍳 Üretim Özeti</div>
            <div class="mb-1.5 flex justify-between text-[11px] font-bold text-gray-400"><span>Hedefe Kalan Net XP:</span> <span class="text-white">${neededXp.toLocaleString()} XP</span></div>
            <div class="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-gray-900">
                <span class="text-gray-400 font-bold text-xs">Gereken Üretim Adedi:</span>
                <span class="text-sm font-black text-amber-400">${craftCount.toLocaleString()} Adet</span>
            </div>
        `;
    }
    resultDiv.classList.remove('hidden');
}

window.closeDetailPanel = function() {
    selectedProfessionId = null;
    document.getElementById('active-detail-panel').classList.add('hidden');
    renderGridDashboard();
}

window.updateLevel = function(index, value) {
    let lvl = parseInt(value) || 1;
    if (lvl < 1) lvl = 1; if (lvl > 40) lvl = 40;
    userProgress[index].level = lvl;
    
    const maxVal = xpGroups[userProgress[index].group][lvl] || 0;
    if (userProgress[index].currentXp > maxVal) {
        userProgress[index].currentXp = maxVal;
    }
    
    saveProgress();
    
    const xpInput = document.getElementById(`xp-input-${index}`);
    if (xpInput) {
        xpInput.max = maxVal;
        if(userProgress[index].currentXp === maxVal) xpInput.value = maxVal;
    }
    
    const selectEl = document.getElementById(`select-${index}`);
    if (selectEl) {
        let recipeOptions = `<option value="">-- Üretilecek Reçeteyi Seçin --</option>`;
        const prof = userProgress[index];
        if (recipes[prof.id] && recipes[prof.id].length > 0) {
            recipes[prof.id].forEach(r => {
                if (prof.level >= r.levelRequired) {
                    recipeOptions += `<option value="${r.id}">${r.name} (Lvl ${r.levelRequired})</option>`;
                }
            });
        }
        selectEl.innerHTML = recipeOptions;
    }
}

window.updateXp = function(index, value) {
    let xp = parseInt(value) || 0;
    const maxVal = xpGroups[userProgress[index].group][userProgress[index].level] || 0;
    if (xp < 0) xp = 0; if (xp > maxVal) xp = maxVal;
    userProgress[index].currentXp = xp;
    saveProgress();
}

window.addEventListener('DOMContentLoaded', () => {
    calculateGrandMasterStatus();
    renderGridDashboard();
});
