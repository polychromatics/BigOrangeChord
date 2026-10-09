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
    },solos:['Jerry','Frank'],soloEvery:2,metronome:'off',metronomeEvery:1,metronomeVolume:0.12
};
let settings=structuredClone(defaults), timer=null, tapTimes=[];
let audioContext=null, nextBeatAt=0, lastScheduledBeat=-1, beatNumber=0;
let pausedRemaining=0, clockOrigin=0, clockBeat=0;
const LOOKAHEAD_MS=25, AUDIO_AHEAD_SECONDS=0.12;
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
    stopClock();
    state= {
        phase:'idle',preCount:settings.countIn,fullRepeat:1,orderIndex:0,sectionRepeat:1,chordIndex:0,beatInChord:1,soloIndex:0,completedVersesForSolo:0
    };
    $('startBtn').textContent='START';
    render()
}
// The clock is anchored to monotonic time, never to DOM rendering time.
// A late browser callback catches up the state rather than stretching the beat.
function stopClock() {
    if (timer !== null) clearInterval(timer);
    timer = null;
}
function beatSeconds() { return 60 / settings.bpm; }
function ensureAudio() {
    if (settings.metronome === 'off') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();
}
function playClick(when, strong) {
    if (!audioContext || settings.metronome === 'off') return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = settings.metronome === 'wood' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(strong ? 1000 : 700, when);
    const volume = settings.metronomeVolume || 0.12;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(when);
    osc.stop(when + 0.05);
}
function startClock() {
    stopClock();
    ensureAudio();
    clockOrigin = performance.now();
    clockBeat = 0;
    lastScheduledBeat = -1;
    scheduleClock();
    timer = setInterval(scheduleClock, LOOKAHEAD_MS);
}
function scheduleClock() {
    if (!['playing', 'precount'].includes(state.phase)) return;
    const elapsed = (performance.now() - clockOrigin) / 1000;
    const period = beatSeconds();
    const due = Math.floor(elapsed / period + 1e-7);
    // Audio is scheduled on the Web Audio clock ahead of the visual clock.
    if (audioContext && settings.metronome !== 'off') {
        const ahead = Math.floor((elapsed + AUDIO_AHEAD_SECONDS) / period);
        for (let n = lastScheduledBeat + 1; n <= ahead; n++) {
            if (n % settings.metronomeEvery !== 0) continue;
            const target = audioContext.currentTime + n * period - elapsed;
            if (target >= audioContext.currentTime - 0.01) {
                playClick(Math.max(target, audioContext.currentTime), n % Number(settings.timeSig.split('/')[0]) === 0);
            }
        }
        lastScheduledBeat = ahead;
    }
    if (due > clockBeat) {
        const missed = due - clockBeat;
        clockBeat = due;
        // Update musical state without drawing on every missed beat.
        for (let i = 0; i < missed && ['playing', 'precount'].includes(state.phase); i++) advanceBeat();
        render();
    }
}
function startPause() {
    if (state.phase === 'playing' || state.phase === 'precount') {
        pausedRemaining = (performance.now() - clockOrigin) % (beatSeconds() * 1000);
        state.lastRunningPhase = state.phase;
        state.phase = 'paused';
        stopClock();
        $('startBtn').textContent = 'START';
        render();
        return;
    }
    if (state.phase === 'paused') {
        state.phase = state.lastRunningPhase || 'playing';
    } else {
        reset();
        state.phase = 'precount';
        pausedRemaining = 0;
    }
    $('startBtn').textContent = 'PAUSE';
    startClock();
    if (pausedRemaining) {
        clockOrigin -= pausedRemaining;
        pausedRemaining = 0;
    }
    render();
}
function advanceBeat() {
    if (state.phase === 'precount') {
        state.preCount--;
        if (state.preCount <= 0) {
            state.phase = 'playing';
            state.preCount = 0;
        }
        return;
    }
    if (state.phase !== 'playing') return;
    const sec = currentSection();
    const beats = sec.chords[state.chordIndex][1];
    if (state.beatInChord < beats) state.beatInChord++;
    else {
        state.beatInChord = 1;
        if (state.chordIndex < sec.chords.length - 1) state.chordIndex++;
        else advanceSection();
    }
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
    stopClock();
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
function buildSetup(){$('metronome').value=settings.metronome||'off';$('metronomeEvery').value=settings.metronomeEvery||1;$('metronomeVolume').value=settings.metronomeVolume??0.12;['bpm','countIn','fullRepeat','timeSig'].forEach(k=>$(k).value=settings[k]);$('soloNames').value=settings.solos.join(', ');$('soloEvery').value=settings.soloEvery;$('orderControls').innerHTML=settings.order.map((n,i)=>`<label>${i+1}<select class="orderSel">${['Verse','Chorus','Bridge'].map(x=>`<option ${x===n?'selected':''}>${x}</option>`).join('')}</select></label>`).join('');$('sectionEditors').innerHTML=['Verse','Chorus','Bridge'].map(name=>{const sec=settings.sections[name],rows=Array.from({length:12},(_,i)=>{const v=sec.chords[i]||['',''];return `<tr><td>${i+1}</td><td><input class="ch" value="${esc(v[0])}"></td><td><input class="bt" type="number" min="1" value="${v[1]}"></td></tr>`}).join('');return `<section class="card section-editor" data-name="${name}"><div class="heading"><h2 style="color:${COLORS[name]}">${name.toUpperCase()}</h2><label>REPEAT<input class="rep" type="number" min="0" value="${sec.repeat}"></label></div><table><thead><tr><th>#</th><th>CHORD</th><th>BEATS</th></tr></thead><tbody>${rows}</tbody></table></section>`}).join('');refreshSongs()}
function readSetup(){const order=[...document.querySelectorAll('.orderSel')].map(x=>x.value);if(new Set(order).size<3)throw Error('Each ORDER position must contain a different section.');const s=structuredClone(settings);s.bpm=+($('bpm').value);s.countIn=Math.round(+($('countIn').value));s.fullRepeat=Math.round(+($('fullRepeat').value));s.timeSig=$('timeSig').value;s.metronome=$('metronome').value;s.metronomeEvery=Math.max(1,Math.round(+$('metronomeEvery').value||1));s.metronomeVolume=+$('metronomeVolume').value;s.order=order;s.solos=$('soloNames').value.split(',').map(x=>x.trim()).filter(Boolean);s.soloEvery=Math.max(1,Math.round(+($('soloEvery').value)||1));document.querySelectorAll('.section-editor').forEach(card=>{const name=card.dataset.name,rep=Math.max(0,Math.round(+card.querySelector('.rep').value||0)),chs=[...card.querySelectorAll('tbody tr')].map(tr=>[tr.querySelector('.ch').value.trim(),+tr.querySelector('.bt').value]).filter(([c,b])=>c||b);for(const [c,b] of chs)if(!c||!Number.isInteger(b)||b<1)throw Error(`${name}: every used row needs a chord and positive whole-number beat count.`);s.sections[name]={repeat:rep,chords:chs}});if(!s.bpm||s.bpm<30||s.bpm>300)throw Error('BPM must be 30–300.');if(!s.countIn||s.countIn<1||s.countIn>64)throw Error('Count in must be 1–64 beats.');if(!s.fullRepeat||s.fullRepeat<1)throw Error('Full repeat must be at least 1.');if(!Object.values(s.sections).some(x=>x.repeat>0&&x.chords.length))throw Error('Enable at least one section.');settings=s;localStorage.setItem('boc-current',JSON.stringify(settings))}
function songs(){return JSON.parse(localStorage.getItem('boc-songs')||'{}')}function refreshSongs(){const s=songs();$('songSelect').innerHTML=Object.keys(s).sort().map(n=>`<option>${esc(n)}</option>`).join('')||'<option value="">No saved songs</option>'}
function saveSong(){try{readSetup();const n=$('songName').value.trim();if(!n)throw Error('Give the song a name first.');const s=songs();const copy=structuredClone(settings);delete copy.solos;delete copy.soloEvery;s[n]=copy;localStorage.setItem('boc-songs',JSON.stringify(s));refreshSongs();$('songSelect').value=n}catch(e){alert(e.message)}}
function loadSong(){const n=$('songSelect').value,s=songs();if(!s[n])return;const liveSolos=settings.solos,liveEvery=settings.soloEvery;settings={...structuredClone(defaults),...s[n],solos:liveSolos,soloEvery:liveEvery};localStorage.setItem('boc-current',JSON.stringify(settings));buildSetup()}
function delSong(){const n=$('songSelect').value,s=songs();if(!s[n])return;if(confirm(`Delete “${n}”?`)){delete s[n];localStorage.setItem('boc-songs',JSON.stringify(s));refreshSongs()}}
function exportSongs(){const blob=new Blob([JSON.stringify(songs(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='big-orange-chord-songs.json';a.click();URL.revokeObjectURL(a.href)}
async function importSongs(e){const f=e.target.files[0];if(!f)return;try{const incoming=JSON.parse(await f.text());localStorage.setItem('boc-songs',JSON.stringify({...songs(),...incoming}));refreshSongs()}catch{alert('That JSON file could not be imported.')}}
$('startBtn').onclick=startPause;$('stopBtn').onclick=reset;$('setupBtn').onclick=()=>{stopClock();state.phase='paused';buildSetup();$('playScreen').classList.add('hidden');$('setupScreen').classList.remove('hidden')};$('backBtn').onclick=()=>{$('setupScreen').classList.add('hidden');$('playScreen').classList.remove('hidden');render()};$('applyBtn').onclick=()=>{try{readSetup();reset();$('setupScreen').classList.add('hidden');$('playScreen').classList.remove('hidden')}catch(e){alert(e.message)}};$('tapBtn').onclick=()=>{const t=performance.now();tapTimes.push(t);tapTimes=tapTimes.slice(-8);if(tapTimes.length>1){const ds=tapTimes.slice(1).map((x,i)=>x-tapTimes[i]);$('bpm').value=Math.round(60000/(ds.reduce((a,b)=>a+b,0)/ds.length))}};$('saveSongBtn').onclick=saveSong;$('loadSongBtn').onclick=loadSong;$('deleteSongBtn').onclick=delSong;$('exportBtn').onclick=exportSongs;$('importInput').onchange=importSongs;$('fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
try{const saved=JSON.parse(localStorage.getItem('boc-current')||'null');if(saved)settings={...settings,...saved}}catch{}render();
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
            await registration.update();
            // Activate the new worker on the next navigation; do not interrupt a jam.
            if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                worker?.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        worker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        } catch (error) { console.warn('Offline installation failed:', error); }
    });
}
