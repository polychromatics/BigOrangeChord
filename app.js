const COLORS= {
    Verse:'var(--verse)',Chorus:'var(--chorus)',Bridge:'var(--bridge)'
};
const defaults= {
    bpm:120,countIn:4,timeSig:'4/4',fullRepeat:2,order:['Verse','Chorus','Bridge'],sections: {
        Verse: {
            repeat:2,chords:[['C',4],['G',4],['Am',4],['F',4]]
        },Chorus: {
            repeat:2,chords:[['F',4],['G',4],['C',4],['C',4]]
        },Bridge: {
            repeat:0,chords:[['Cm',4],['Ab',4],['Eb',4],['Bb',4]]
        }
    },solos:['Jerry','Frank'],soloEvery:2
};
let settings=structuredClone(defaults), timer=null, tapTimes=[];
let state= {
    phase:'idle',preCount:4,fullRepeat:1,orderIndex:0,sectionRepeat:1,chordIndex:0,beatInChord:1,soloIndex:0,completedVersesForSolo:0
};
const $=id=>document.getElementById(id);
function enabledOrder() {
    return settings.order.filter(n=>settings.sections[n].repeat>0&&settings.sections[n].chords.length)
}
function currentName() {
    return enabledOrder()[state.orderIndex]||enabledOrder()[0]
}
function currentSection() {
    return settings.sections[currentName()]
}
function reset() {
    clearInterval(timer);
    timer=null;
    state= {
        phase:'idle',preCount:settings.countIn,fullRepeat:1,orderIndex:0,sectionRepeat:1,chordIndex:0,beatInChord:1,soloIndex:0,completedVersesForSolo:0
    };
    $('startBtn').textContent='START';
    render()
}
function startPause() {
    if(state.phase==='playing'||state.phase==='precount') {
        clearInterval(timer);
        timer=null;
        state.phase='paused';
        $('startBtn').textContent='START';
        render();
        return
    }
    if(state.phase==='paused') {
        state.phase=state.preCount>0&&state.fullRepeat===1&&state.orderIndex===0&&state.sectionRepeat===1&&state.chordIndex===0?'precount':'playing'
    }
    else {
        reset();
        state.phase='precount'
    };
    $('startBtn').textContent='PAUSE';
    timer=setInterval(tick,60000/settings.bpm);
    render()
}
function tick() {
    if(state.phase==='precount') {
        state.preCount--;
        if(state.preCount<=0) {
            state.phase='playing';
            state.preCount=0
        }
        render();
        return
    }
    if(state.phase!=='playing')return;
    const sec=currentSection();
    const beats=sec.chords[state.chordIndex][1];
    if(state.beatInChord<beats)state.beatInChord++;
    else {
        state.beatInChord=1;
        if(state.chordIndex<sec.chords.length-1)state.chordIndex++;
        else advanceSection()
    }
    render()
}
function advanceSection() {
    const name=currentName(),sec=currentSection();
    if(state.sectionRepeat<sec.repeat) {
        state.sectionRepeat++;
        state.chordIndex=0;
        return
    }
    if(name==='Verse') {
        state.completedVersesForSolo+=sec.repeat;
        while(state.completedVersesForSolo>=settings.soloEvery&&settings.solos.length) {
            state.completedVersesForSolo-=settings.soloEvery;
            state.soloIndex=(state.soloIndex+1)%settings.solos.length
        }
    }
    const order=enabledOrder();
    if(state.orderIndex<order.length-1) {
        state.orderIndex++;
        state.sectionRepeat=1;
        state.chordIndex=0;
        return
    }
    if(state.fullRepeat<settings.fullRepeat) {
        state.fullRepeat++;
        state.orderIndex=0;
        state.sectionRepeat=1;
        state.chordIndex=0;
        return
    }
    clearInterval(timer);
    timer=null;
    state.phase='stopped';
    $('startBtn').textContent='START'
}
function nextChord() {
    if(!['playing','paused'].includes(state.phase))return '—';
    const sec=currentSection();
    if(state.chordIndex<sec.chords.length-1)return sec.chords[state.chordIndex+1][0];
    if(state.sectionRepeat<sec.repeat)return sec.chords[0][0];
    const order=enabledOrder();
    if(state.orderIndex<order.length-1)return settings.sections[order[state.orderIndex+1]].chords[0][0];
    if(state.fullRepeat<settings.fullRepeat)return settings.sections[order[0]].chords[0][0];
    return '—'
}
function render() {
    const order=enabledOrder();
    $('sectionRows').innerHTML=order.map((name,idx)=>{const sec=settings.sections[name],active=['playing','paused','stopped'].includes(state.phase)&&idx===state.orderIndex;return `<div class="section-row"><div class="section-name" style="color:${COLORS[name]}">${name.toUpperCase()}</div><div class="chords">${sec.chords.map(([c,b],i)=>`<div class="chord-cell ${active&&i===state.chordIndex?'active':''}"><b style="color:${COLORS[name]}">${esc(c)}</b><small>${b}</small></div>`).join('')}</div><div class="repeat" style="color:${COLORS[name]}">${active?state.sectionRepeat:'–'}/${sec.repeat}</div></div>`}).join('');
    $('bpmDisplay').textContent=`BPM ${settings.bpm}`;
    $('timeSigDisplay').textContent=settings.timeSig;
    $('fullRepeatDisplay').textContent=`FULL ${state.fullRepeat}/${settings.fullRepeat}`;
    $('status').textContent=state.phase.toUpperCase();
    if(state.phase==='precount') {
        $('currentChord').textContent=Math.max(state.preCount,1);
        $('nextChord').textContent='—'
    }
    else if(state.phase==='idle') {
        $('currentChord').textContent=settings.countIn;
        $('nextChord').textContent='—'
    }
    else {
        const sec=currentSection();
        $('currentChord').textContent=sec?.chords[state.chordIndex]?.[0]||'—';
        $('nextChord').textContent=nextChord()
    }
    renderBeats();
    renderSolo()
}
function renderBeats() {
    let n=0,b=0;
    if(state.phase==='precount') {
        n=settings.countIn;
        b=settings.countIn-state.preCount
    }
    else if(['playing','paused','stopped'].includes(state.phase)) {
        n=currentSection()?.chords[state.chordIndex]?.[1]||0;
        b=state.beatInChord
    }
    const dots=$('beatDots');
    dots.innerHTML='';
    for(let i=1;i<=Math.min(n,64);i++) {
        const d=document.createElement('i');
        d.className='dot'+(i<=b?' on':'');
        dots.appendChild(d)
    }
    $('beatText').textContent=b&&n?`${b}/${n} BEATS`:''
}
function renderSolo() {
    const a=$('soloArea');
    if(!settings.solos.length) {
        a.classList.add('hidden');
        return
    }
    a.classList.remove('hidden');
    const inVerse=['playing','paused'].includes(state.phase)&&currentName()==='Verse';
    $('soloCurrent').textContent=settings.solos[state.soloIndex%settings.solos.length];
    $('soloCurrent').style.color=inVerse?'var(--verse)':'var(--grey)';
    $('soloNext').textContent=inVerse&&settings.solos.length>1?`Next: ${settings.solos[(state.soloIndex+1)%settings.solos.length]}`:''
}
function esc(s) {
    return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function buildSetup(){['bpm','countIn','fullRepeat','timeSig'].forEach(k=>$(k).value=settings[k]);$('soloNames').value=settings.solos.join(', ');$('soloEvery').value=settings.soloEvery;$('orderControls').innerHTML=settings.order.map((n,i)=>`<label>${i+1}<select class="orderSel">${['Verse','Chorus','Bridge'].map(x=>`<option ${x===n?'selected':''}>${x}</option>`).join('')}</select></label>`).join('');$('sectionEditors').innerHTML=['Verse','Chorus','Bridge'].map(name=>{const sec=settings.sections[name],rows=Array.from({length:12},(_,i)=>{const v=sec.chords[i]||['',''];return `<tr><td>${i+1}</td><td><input class="ch" value="${esc(v[0])}"></td><td><input class="bt" type="number" min="1" value="${v[1]}"></td></tr>`}).join('');return `<section class="card section-editor" data-name="${name}"><div class="heading"><h2 style="color:${COLORS[name]}">${name.toUpperCase()}</h2><label>REPEAT<input class="rep" type="number" min="0" value="${sec.repeat}"></label></div><table><thead><tr><th>#</th><th>CHORD</th><th>BEATS</th></tr></thead><tbody>${rows}</tbody></table></section>`}).join('');refreshSongs()}
function readSetup(){const order=[...document.querySelectorAll('.orderSel')].map(x=>x.value);if(new Set(order).size<3)throw Error('Each ORDER position must contain a different section.');const s=structuredClone(settings);s.bpm=+($('bpm').value);s.countIn=Math.round(+($('countIn').value));s.fullRepeat=Math.round(+($('fullRepeat').value));s.timeSig=$('timeSig').value;s.order=order;s.solos=$('soloNames').value.split(',').map(x=>x.trim()).filter(Boolean);s.soloEvery=Math.max(1,Math.round(+($('soloEvery').value)||1));document.querySelectorAll('.section-editor').forEach(card=>{const name=card.dataset.name,rep=Math.max(0,Math.round(+card.querySelector('.rep').value||0)),chs=[...card.querySelectorAll('tbody tr')].map(tr=>[tr.querySelector('.ch').value.trim(),+tr.querySelector('.bt').value]).filter(([c,b])=>c||b);for(const [c,b] of chs)if(!c||!Number.isInteger(b)||b<1)throw Error(`${name}: every used row needs a chord and positive whole-number beat count.`);s.sections[name]={repeat:rep,chords:chs}});if(!s.bpm||s.bpm<30||s.bpm>300)throw Error('BPM must be 30–300.');if(!s.countIn||s.countIn<1||s.countIn>64)throw Error('Count in must be 1–64 beats.');if(!s.fullRepeat||s.fullRepeat<1)throw Error('Full repeat must be at least 1.');if(!Object.values(s.sections).some(x=>x.repeat>0&&x.chords.length))throw Error('Enable at least one section.');settings=s;localStorage.setItem('boc-current',JSON.stringify(settings))}
function songs(){return JSON.parse(localStorage.getItem('boc-songs')||'{}')}function refreshSongs(){const s=songs();$('songSelect').innerHTML=Object.keys(s).sort().map(n=>`<option>${esc(n)}</option>`).join('')||'<option value="">No saved songs</option>'}
function saveSong(){try{readSetup();const n=$('songName').value.trim();if(!n)throw Error('Give the song a name first.');const s=songs();const copy=structuredClone(settings);delete copy.solos;delete copy.soloEvery;s[n]=copy;localStorage.setItem('boc-songs',JSON.stringify(s));refreshSongs();$('songSelect').value=n}catch(e){alert(e.message)}}
function loadSong(){const n=$('songSelect').value,s=songs();if(!s[n])return;const liveSolos=settings.solos,liveEvery=settings.soloEvery;settings={...structuredClone(defaults),...s[n],solos:liveSolos,soloEvery:liveEvery};localStorage.setItem('boc-current',JSON.stringify(settings));buildSetup()}
function delSong(){const n=$('songSelect').value,s=songs();if(!s[n])return;if(confirm(`Delete “${n}”?`)){delete s[n];localStorage.setItem('boc-songs',JSON.stringify(s));refreshSongs()}}
function exportSongs(){const blob=new Blob([JSON.stringify(songs(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='big-orange-chord-songs.json';a.click();URL.revokeObjectURL(a.href)}
async function importSongs(e){const f=e.target.files[0];if(!f)return;try{const incoming=JSON.parse(await f.text());localStorage.setItem('boc-songs',JSON.stringify({...songs(),...incoming}));refreshSongs()}catch{alert('That JSON file could not be imported.')}}
$('startBtn').onclick=startPause;$('stopBtn').onclick=reset;$('setupBtn').onclick=()=>{clearInterval(timer);timer=null;buildSetup();$('playScreen').classList.add('hidden');$('setupScreen').classList.remove('hidden')};$('backBtn').onclick=()=>{$('setupScreen').classList.add('hidden');$('playScreen').classList.remove('hidden');render()};$('applyBtn').onclick=()=>{try{readSetup();reset();$('setupScreen').classList.add('hidden');$('playScreen').classList.remove('hidden')}catch(e){alert(e.message)}};$('tapBtn').onclick=()=>{const t=performance.now();tapTimes.push(t);tapTimes=tapTimes.slice(-8);if(tapTimes.length>1){const ds=tapTimes.slice(1).map((x,i)=>x-tapTimes[i]);$('bpm').value=Math.round(60000/(ds.reduce((a,b)=>a+b,0)/ds.length))}};$('saveSongBtn').onclick=saveSong;$('loadSongBtn').onclick=loadSong;$('deleteSongBtn').onclick=delSong;$('exportBtn').onclick=exportSongs;$('importInput').onchange=importSongs;$('fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
try{const saved=JSON.parse(localStorage.getItem('boc-current')||'null');if(saved)settings={...settings,...saved}}catch{}render();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
