let algo = 'fcfs', pidCnt = 1, procs = [];

const DESCS = {
  fcfs: 'First Come First Serve — processes execute in arrival order. Simple but causes convoy effect with long jobs.',
  sjf: 'Shortest Job First — picks the process with smallest burst time. Optimal average wait time but risks starvation.',
  srtf: 'Shortest Remaining Time First — preemptive SJF. Preempts running process if a shorter job arrives.',
  rr: 'Round Robin — each process gets equal CPU time (quantum) in turns. Fair, prevents starvation.',
  priority: 'Priority Scheduling — lower number = higher priority. Risk of starvation for low-priority jobs.',
  pp: 'Preemptive Priority — higher-priority arriving process immediately preempts the running one.',
  mlfq: 'MLFQ — 3-level queue system. Adapts to CPU-burst behaviour automatically. Most intelligent.'
};

const ALGO_NAMES = {
  fcfs: 'FCFS',
  sjf: 'SJF',
  srtf: 'SRTF',
  rr: 'Round Robin',
  priority: 'Priority',
  pp: 'Preemptive Priority',
  mlfq: 'MLFQ'
};

const PRESETS = {
  basic: [[0,6,3],[1,4,1],[2,8,4],[3,3,2],[4,5,5]],
  convoy: [[0,24,1],[1,3,2],[2,3,3],[3,3,4]],
  starve: [[0,2,1],[0,9,4],[0,9,5],[0,9,6],[0,9,7]],
  mix: [[0,2,2],[1,1,1],[2,8,3],[4,4,2],[5,5,4],[6,3,1]]
};

// Playback State
let playbackState = {
  isPlaying: false,
  currentTime: 0,
  maxTime: 0,
  ganttLog: [],
  results: {},
  processes: [],
  animationId: null,
  speedMs: 80
};

function getProcessBurstDoneAt(pid, t) {
  let done = 0;
  for (const e of playbackState.ganttLog) {
    if (e.id === pid) {
      const end = Math.min(e.end, t);
      if (end > e.start) done += end - e.start;
    }
  }
  return done;
}

function getCurrentRunning(t) {
  for (const e of playbackState.ganttLog) {
    if (e.start < t && t <= e.end && e.id !== -1) return e.id;
  }
  return -1;
}

function updateSpeedDisplay() {
  const speedValue = +document.getElementById('speed-slider').value;
  playbackState.speedMs = Math.round(400 / speedValue);
  document.getElementById('speed-display').textContent = speedValue + 'x';
  // If playing, restart interval with new speed
  if (playbackState.isPlaying) {
    clearInterval(playbackState.animationId);
    playbackState.animationId = setInterval(stepFwd, playbackState.speedMs);
  }
}

function updateTimeDisplay() {
  document.getElementById('current-time').textContent = playbackState.currentTime;
}

function playProgress() {
  if (!playbackState.ganttLog.length) return alert('Run simulation first!');
  
  // If finished, restart from beginning
  if (!playbackState.isPlaying && playbackState.currentTime >= playbackState.maxTime) {
    playbackState.currentTime = 0;
    updateTimeDisplay();
    renderProgressAnimated();
  }
  
  playbackState.isPlaying = !playbackState.isPlaying;
  const btn = document.getElementById('play-btn');
  if (playbackState.isPlaying) {
    btn.classList.remove('paused');
    btn.textContent = '⏸ Pause';
    playbackState.animationId = setInterval(stepFwd, playbackState.speedMs);
  } else {
    btn.classList.add('paused');
    btn.textContent = '▶ Play';
    clearInterval(playbackState.animationId);
  }
}

function stepFwd() {
  if (playbackState.currentTime < playbackState.maxTime) {
    playbackState.currentTime++;
  } else {
    playbackState.isPlaying = false;
    clearInterval(playbackState.animationId);
    document.getElementById('play-btn').classList.add('paused');
    document.getElementById('play-btn').textContent = '▶ Play';
  }
  updateTimeDisplay();
  renderProgressAnimated();
}

function stepProgress() {
  if (!playbackState.ganttLog.length) return;
  playbackState.isPlaying = false;
  clearInterval(playbackState.animationId);
  document.getElementById('play-btn').classList.add('paused');
  document.getElementById('play-btn').textContent = '▶ Play';
  
  playbackState.currentTime = Math.min(playbackState.currentTime + 1, playbackState.maxTime);
  updateTimeDisplay();
  renderProgressAnimated();
}

function resetProgress() {
  playbackState.isPlaying = false;
  playbackState.currentTime = 0;
  clearInterval(playbackState.animationId);
  document.getElementById('play-btn').classList.add('paused');
  document.getElementById('play-btn').textContent = '▶ Play';
  updateTimeDisplay();
  renderProgressAnimated();
}

function renderProgressAnimated() {
  updateTimeDisplay();
  const t = Math.floor(playbackState.currentTime);
  const running = getCurrentRunning(t);
  const log = playbackState.ganttLog;
  const ps = playbackState.processes;
  const res = playbackState.results;
  
  let completed = 0, executing = 0, pending = 0, waiting = 0;
  
  let html = `<div class="card">
    <div class="card-head">Process Execution Progress — Real-Time View</div>
    <div class="progress-summary">
      <div class="progress-stat">
        <div class="progress-stat-val" style="color:var(--g);">` + ps.length + `</div>
        <div class="progress-stat-lbl">Total</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-val" style="color:var(--g);" id="progress-completed">0</div>
        <div class="progress-stat-lbl">Completed</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-val" style="color:var(--b);" id="progress-running">0</div>
        <div class="progress-stat-lbl">Running</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-val" style="color:var(--mute);" id="progress-pending">` + ps.length + `</div>
        <div class="progress-stat-lbl">Pending</div>
      </div>
    </div>
    
    <div style="margin-top:16px;margin-bottom:16px;font-size:.65rem;color:var(--mute);letter-spacing:1px;text-transform:uppercase;">Process Lanes</div>
    <div class="process-lanes">`;

  ps.forEach((p, i) => {
    const doneBurst = getProcessBurstDoneAt(p.id, t);
    const pctComplete = Math.min(100, (doneBurst / p.bt) * 100);
    const isRunning = (p.id === running);
    const hasArrived = (p.at <= t);
    const isDone = (res[p.id] && res[p.id].ct <= t && res[p.id].ct > 0);
    
    let status = 'pending';
    let statusText = 'Not arrived';
    let statusClass = 'status-pending';
    
    if (!hasArrived) {
      pending++;
    } else if (isDone) {
      status = 'completed';
      statusText = 'Done';
      statusClass = 'status-completed';
      completed++;
    } else if (isRunning) {
      status = 'executing';
      statusText = 'Running';
      statusClass = 'status-executing';
      executing++;
    } else if (hasArrived) {
      status = 'waiting';
      statusText = 'Ready';
      statusClass = 'status-waiting';
      waiting++;
    }
    
    const colors = ['#0fefb4', '#5b8cff', '#ff5b7a', '#ffc94a', '#3de6ff', '#ff8c42', '#c26dff'];
    const textColors = ['#03100a', '#03100a', '#fff', '#03100a', '#03100a', '#03100a', '#03100a'];
    const bgColor = colors[i % 7];
    const txtColor = textColors[i % 7];
    
    html += `<div class="lane" style="animation-delay:${i * 0.05}s;">
      <div class="lane-id" style="background:${bgColor};color:${txtColor};">P${p.id}</div>
      <div class="lane-info">
        <div class="lane-label">P${p.id}</div>
        <div class="lane-sub">AT:${p.at} BT:${p.bt} PR:${p.pr}</div>
      </div>
      <div class="progress-bar-wrapper" style="flex:1;">
        <div class="progress-bar ${status}" style="width:${pctComplete.toFixed(1)}%;background:${bgColor};color:${txtColor};">
          ${pctComplete >= 15 ? Math.round(pctComplete) + '%' : ''}
        </div>
        ${pctComplete < 15 && pctComplete > 0 ? `<span class="bar-pct">${Math.round(pctComplete)}%</span>` : ''}
      </div>
      <div class="status-badge ${statusClass}">${statusText}</div>
    </div>`;
  });

  html += `</div></div>`;
  
  // Update stats
  setTimeout(() => {
    const c = document.getElementById('progress-completed');
    const r = document.getElementById('progress-running');
    const p = document.getElementById('progress-pending');
    if (c) c.textContent = completed;
    if (r) r.textContent = executing;
    if (p) p.textContent = pending;
  }, 0);
  
  document.getElementById('progress-content').innerHTML = html;
}

function setAlgo(a) {
  algo = a;
  document.querySelectorAll('.ab').forEach(b => b.classList.remove('on'));
  event.target.closest('.ab').classList.add('on');
  document.getElementById('desc').textContent = DESCS[a];
  document.getElementById('cfg-sec').style.display = (a === 'rr' || a === 'mlfq') ? 'block' : 'none';
}

function switchTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById(id).classList.add('on');
}

function addProc() {
  procs.push({id: pidCnt, at: 0, bt: 4, pr: 1});
  pidCnt++;
  renderTable();
}

function removeProc(id) {
  procs = procs.filter(p => p.id !== id);
  renderTable();
}

function updateProc(id, field, val) {
  procs.find(p => p.id === id)[field] = +val;
}

function renderTable() {
  const html = procs.map((p, i) => `
    <tr>
      <td><span class="pid pc${i%7}">P${p.id}</span></td>
      <td><input type="number" value="${p.at}" onchange="updateProc(${p.id}, 'at', this.value)" min="0" max="99"></td>
      <td><input type="number" value="${p.bt}" onchange="updateProc(${p.id}, 'bt', this.value)" min="1" max="50"></td>
      <td><input type="number" value="${p.pr}" onchange="updateProc(${p.id}, 'pr', this.value)" min="1" max="10"></td>
      <td><button class="xbtn" onclick="removeProc(${p.id})">✕</button></td>
    </tr>
  `).join('');
  document.getElementById('proc-table').innerHTML = html;
}

function loadPreset(name) {
  pidCnt = 1;
  procs = PRESETS[name].map(([at,bt,pr],i) => ({id:i+1,at,bt,pr}));
  pidCnt = procs.length + 1;
  renderTable();
}

function run() {
  if (!procs.length) return alert('Add at least one process!');
  const q = +document.getElementById('quantum').value;
  fetch('/api/schedule', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({algorithm: algo, processes: procs, quantum: q})
  })
  .then(r => r.json())
  .then(data => {
    renderGantt(data.gantt_log, procs, algo);
    renderMetrics(data.metrics, procs, data.results);
    renderTable2(data.results, procs);
    
    // Initialize playback state
    playbackState.ganttLog = data.gantt_log;
    playbackState.results = data.results;
    playbackState.processes = procs;
    playbackState.maxTime = Math.max(...data.gantt_log.map(e => e.end));
    playbackState.currentTime = 0;
    playbackState.isPlaying = false;
    
    // Update algo display
    document.getElementById('algo-display').textContent = ALGO_NAMES[algo];
    document.getElementById('quantum-slider').value = q;
    
    // Switch to progress tab and render
    renderProgressAnimated();
  })
  .catch(e => alert('Error: ' + e.message));
}

function resetAll() {
  pidCnt = 1;
  procs = [];
  renderTable();
  loadPreset('basic');
}

function renderGantt(log, ps, algoName) {
  const totalT = Math.max(...log.map(e => e.end));
  const scale = Math.min(Math.floor(580 / totalT), 26) || 1;
  let html = `<div class="card"><div class="card-head">Gantt Chart — ${algoName.toUpperCase()}</div><div class="gantt-scroll">`;
  
  ps.forEach((p, i) => {
    const pLog = log.filter(e => e.id === p.id);
    html += `<div class="gantt-row"><div class="glabel clr${i%7}">P${p.id}</div><div class="gblocks">`;
    let cur = 0;
    pLog.forEach((e, ei) => {
      if (e.start > cur) html += `<div style="width:${(e.start-cur)*scale}px;flex-shrink:0;"></div>`;
      const w = Math.max((e.end-e.start)*scale, 8);
      html += `<div class="gblock bg${i%7}" style="width:${w}px;min-width:${w}px;color:#03100a;animation-delay:${i*0.04}s;"></div>`;
      cur = e.end;
    });
    html += `</div></div>`;
  });
  
  html += `<div class="gantt-row" style="margin-top:10px"><div class="glabel" style="font-size:.56rem">CPU</div><div class="gblocks">`;
  log.forEach((e, i) => {
    const w = Math.max((e.end-e.start)*scale, 8);
    if (e.id === -1) {
      html += `<div class="gblock idle" style="width:${w}px;min-width:${w}px;font-size:.55rem">idle</div>`;
    } else {
      const c = ps.findIndex(p => p.id === e.id) % 7;
      html += `<div class="gblock bg${c}" style="width:${w}px;min-width:${w}px;color:#03100a;font-size:.58rem;animation-delay:${i*0.025}s">P${e.id}</div>`;
    }
  });
  html += `</div></div></div>`;
  document.getElementById('gantt').innerHTML = html;
}

function renderMetrics(m, ps, res) {
  const HTML = `<div class="metrics-grid">
    <div class="metric m-g"><div class="m-lbl">Avg Wait Time</div><div class="m-val clr0">${m.avg_wt}<span class="m-unit">ms</span></div></div>
    <div class="metric m-b"><div class="m-lbl">Avg Turnaround</div><div class="m-val clr1">${m.avg_tat}<span class="m-unit">ms</span></div></div>
    <div class="metric m-g"><div class="m-lbl">CPU Utilization</div><div class="m-val clr0">${m.cpu}<span class="m-unit">%</span></div></div>
    <div class="metric m-b"><div class="m-lbl">Throughput</div><div class="m-val clr1">${m.tp}<span class="m-unit">p/ms</span></div></div>
  </div>`;
  document.getElementById('metrics').innerHTML = HTML;
}

function renderTable2(res, ps) {
  const maxTAT = Math.max(...ps.map(p => res[p.id].tat));
  let html = `<div class="card"><table class="rtbl"><thead><tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority</th><th>Completion</th><th>Turnaround</th><th>Waiting</th></tr></thead><tbody>`;
  ps.forEach((p, i) => {
    const pct = ((res[p.id].tat / maxTAT) * 100).toFixed(0);
    html += `<tr><td><span class="pid pc${i%7}">P${p.id}</span></td><td>${p.at}</td><td>${p.bt}</td><td>${p.pr}</td><td>${res[p.id].ct}</td><td class="clr1">${res[p.id].tat}</td><td class="clr0">${res[p.id].wt}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('table').innerHTML = html;
}

// Initialize on page load
loadPreset('basic');
document.getElementById('algo-display').textContent = ALGO_NAMES[algo];

document.addEventListener('DOMContentLoaded', function() {
  const speedSlider = document.getElementById('speed-slider');
  if (speedSlider) speedSlider.addEventListener('input', updateSpeedDisplay);
});
