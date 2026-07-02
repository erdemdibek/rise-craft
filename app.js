// 4 Ana XP Grubu Verisi (Görsellerden Çıkarılan Net Logaritma)
const xpGroups = {
    heavy: [0, 12000, 24000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 192000, 240000, 288000, 360000, 432000, 504000, 600000, 696000, 792000, 912000, 1032000, 1152000, 1296000, 1440000, 1584000, 1752000, 1920000, 2160000, 2400000, 2880000, 3360000, 4080000, 4800000, 5760000, 6720000, 7920000, 9120000, 10560000, 12240000, 14160000, 16800000],
    medium: [0, 9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000, 108000, 144000, 180000, 216000, 270000, 324000, 378000, 450000, 522000, 594000, 684000, 774000, 864000, 972000, 1080000, 1188000, 1314000, 1440000, 1620000, 1800000, 2160000, 2520000, 3060000, 3600000, 4320000, 5040000, 5940000, 6840000, 7920000, 9180000, 10620000, 12600000],
    standard: [0, 6000, 12000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 180000, 216000, 252000, 300000, 348000, 396000, 456000, 516000, 576000, 648000, 720000, 792000, 876000, 960000, 1080000, 1200000, 1440000, 1680000, 2040000, 2400000, 2880000, 3360000, 3960000, 4560000, 5280000, 6120000, 7080000, 8400000],
    easy: [0, 3000, 6000, 9000, 12000, 15000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 90000, 108000, 126000, 150000, 174000, 198000, 228000, 258000, 288000, 324000, 360000, 396000, 438000, 480000, 540000, 600000, 720000, 840000, 1020000, 1200000, 1440000, 1680000, 1980000, 2280000, 2640000, 3060000, 3600000, 4200000]
};

// 10 Ana Meslek Tanımı ve Grupları
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

// Tarayıcı hafızasından (localStorage) verileri çek veya sıfırdan oluştur
let userProgress = JSON.parse(localStorage.getItem('rise_craft_progress')) || 
    initialProfessions.map(p => ({ ...p, level: 1, currentXp: 0 }));

function saveProgress() {
    localStorage.setItem('rise_craft_progress', JSON.stringify(userProgress));
    calculateGrandMasterStatus();
}

function calculateGrandMasterStatus() {
    const levels = userProgress.map(p => p.level);
    const minLevel = Math.min(...levels);
    let statusText = "Normal Üye";
    
    if (minLevel >= 40) statusText = "🏆 GrandMaster 4";
    else if (minLevel >= 30) statusText = "🥇 GrandMaster 3";
    else if (minLevel >= 20) statusText = "🥈 GrandMaster 2";
    else if (minLevel >= 10) statusText = "🥉 GrandMaster 1";
    else {
        statusText = `Gelişmekte (En düşük meslek leveli: ${minLevel}/10)`;
    }
    
    document.getElementById('gm-status').innerText = statusText;
}

function renderProfessions() {
    const container = document.getElementById('professions-container');
    container.innerHTML = '';

    userProgress.forEach((prof, index) => {
        const xpTable = xpGroups[prof.group];
        const nextLevelXp = xpTable[prof.level] || 0;
        const pct = nextLevelXp > 0 ? (prof.currentXp / nextLevelXp) * 100 : 100;

        const card = document.createElement('div');
        card.className = "bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm hover:border-gray-700 transition duration-200";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-gray-200">${prof.name}</h3>
                <span class="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Grup: ${prof.group.toUpperCase()}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Seviye (1-40)</label>
                    <input type="number" min="1" max="40" value="${prof.level}" 
                        class="w-full bg-black border border-gray-700 rounded p-2 text-amber-500 font-bold focus:outline-none focus:border-amber-500"
                        onchange="updateLevel(${index}, this.value)">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Mevcut XP</label>
                    <input type="number" min="0" max="${nextLevelXp}" value="${prof.currentXp}" 
                        class="w-full bg-black border border-gray-700 rounded p-2 text-gray-300 focus:outline-none focus:border-amber-500"
                        onchange="updateXp(${index}, this.value)">
                </div>
            </div>

            <div class="w-full bg-black rounded-full h-2.5 mb-1 overflow-hidden">
                <div class="bg-amber-500 h-2.5 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
            </div>
            <div class="flex justify-between text-xs text-gray-500">
                <span>%${pct.toFixed(1)}</span>
                <span>${prof.currentXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP</span>
            </div>
        `;
        container.appendChild(card);
    });
}

window.updateLevel = function(index, value) {
    let lvl = parseInt(value) || 1;
    if (lvl < 1) lvl = 1;
    if (lvl > 40) lvl = 40;
    userProgress[index].level = lvl;
    saveProgress();
    renderProfessions();
}

window.updateXp = function(index, value) {
    let xp = parseInt(value) || 0;
    const maxVal = xpGroups[userProgress[index].group][userProgress[index].level] || 0;
    if (xp < 0) xp = 0;
    if (xp > maxVal) xp = maxVal;
    userProgress[index].currentXp = xp;
    saveProgress();
    renderProfessions();
}

// İlk Çalıştırma
calculateGrandMasterStatus();
renderProfessions();
