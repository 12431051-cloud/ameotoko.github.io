/* 雨男 - シンプルな避けゲー（60秒）
   操作: 左右矢印 / マウス移動 / タッチで操作
*/
(function(){
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const timerEl = document.getElementById('timer');
  const message = document.getElementById('message');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const msgTitle = document.getElementById('message-title');
  const msgSub = document.getElementById('message-sub');

  let width = Math.min(window.innerWidth * 0.9, 900);
  let height = Math.min(window.innerHeight * 0.8, 700);
  canvas.width = width;
  canvas.height = height;

  window.addEventListener('resize', ()=>{
    width = Math.min(window.innerWidth * 0.9, 900);
    height = Math.min(window.innerHeight * 0.8, 700);
    canvas.width = width; canvas.height = height;
  });

  const GAME_TIME = 60; // seconds

  // プレイヤー
  const player = {w:80, h:18, x:0, y:0, speed:420, vx:0};
  function resetPlayer(){
    player.x = width/2 - player.w/2;
    player.y = height - player.h - 18;
    player.vx = 0;
  }
  resetPlayer();

  // 雨要素
  let drops = [];
  function spawnDrop(x, speed){
    drops.push({x:x, y:-10, r:6 + Math.random()*6, speed:speed, color:'rgba(55, 125, 255,0.9)'});
  }

  // 難易度パラメータ
  const baseSpawnRate = 0.9; // drops/sec at start
  const maxSpawnRate = 6.0; // max drops/sec
  const baseSpeed = 140; // px/sec
  const maxSpeed = 520; // px/sec

  // ゲーム状態
  let lastTime = 0;
  let accumulated = 0;
  let elapsed = 0;
  let running = false;
  let gameOver = false;

  // 入力
  const keys = {};
  window.addEventListener('keydown', (e)=>{ keys[e.key]=true; });
  window.addEventListener('keyup', (e)=>{ keys[e.key]=false; });
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    player.x = Math.min(Math.max(0, mx - player.w/2), width - player.w);
  });
  // タッチ
  canvas.addEventListener('touchmove',(e)=>{
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const mx = t.clientX - rect.left;
    player.x = Math.min(Math.max(0, mx - player.w/2), width - player.w);
    e.preventDefault();
  },{passive:false});

  function update(dt){
    if(!running) return;
    elapsed += dt;
    if(elapsed >= GAME_TIME){
      running = false;
      win();
      return;
    }

    // 難易度の進行(線形)
    const t = elapsed / GAME_TIME; // 0..1
    const spawnRate = baseSpawnRate + (maxSpawnRate - baseSpawnRate) * t; // per sec
    const dropSpeed = baseSpeed + (maxSpeed - baseSpeed) * t;

    // スポーン処理: 毎秒 spawnRate 個
    accumulated += dt * spawnRate;
    while(accumulated > 1){
      accumulated -= 1;
      const x = Math.random() * (width - 8) + 4;
      spawnDrop(x, dropSpeed * (0.85 + Math.random()*0.5));
    }

    // プレイヤー左右移動（キーボード）
    let move = 0;
    if(keys['ArrowLeft'] || keys['a']) move -= 1;
    if(keys['ArrowRight'] || keys['d']) move += 1;
    if(move !== 0){
      player.x += move * player.speed * dt;
      if(player.x < 0) player.x = 0;
      if(player.x + player.w > width) player.x = width - player.w;
    }

    // ドロップ更新
    for(let i = drops.length-1; i >= 0; i--){
      const d = drops[i];
      d.y += d.speed * dt;
      if(d.y - d.r > height){ drops.splice(i,1); continue; }
      // 衝突判定 AABB 近似
      if(d.y + d.r >= player.y && d.y - d.r <= player.y + player.h){
        if(d.x >= player.x && d.x <= player.x + player.w){
          // 当たり
          running = false;
          gameOver = true;
          showGameOver();
          return;
        }
      }
    }

    // UI更新
    timerEl.textContent = Math.ceil(GAME_TIME - elapsed);
  }

  function draw(){
    // 背景
    ctx.clearRect(0,0,width,height);

    // 雲（簡易）
    const grad = ctx.createLinearGradient(0,0,0,height);
    grad.addColorStop(0,'rgba(255,255,255,0.06)');
    grad.addColorStop(1,'rgba(255,255,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,width,height);

    // ドロップ
    for(const d of drops){
      ctx.beginPath();
      ctx.fillStyle = d.color;
      ctx.ellipse(d.x, d.y, d.r/1.2, d.r, 0, 0, Math.PI*2);
      ctx.fill();
      // 軌跡
      ctx.strokeStyle = 'rgba(200,230,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(d.x - d.r*0.25, d.y - d.r*1.6);
      ctx.lineTo(d.x + d.r*0.25, d.y + d.r*0.6);
      ctx.stroke();
    }

    // プレイヤー（傘を模した長方形）
    ctx.fillStyle = '#ffecb3';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    // 傘のアーチ
    ctx.beginPath();
    ctx.fillStyle = '#ffd166';
    ctx.ellipse(player.x + player.w/2, player.y, player.w/1.3, player.h*2, 0, Math.PI, 2*Math.PI);
    ctx.fill();

    // 時間バー（下部）
    const barW = width * 0.6;
    const bw = barW * (1 - elapsed / GAME_TIME);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect((width-barW)/2, 8, barW, 8);
    ctx.fillStyle = '#fffb81';
    ctx.fillRect((width-barW)/2, 8, bw, 8);
  }

  function loop(ts){
    if(!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    if(running) requestAnimationFrame(loop);
  }

  function startGame(){
    // 初期化
    drops = [];
    elapsed = 0; accumulated = 0; lastTime = 0; gameOver = false; running = true;
    resetPlayer();
    message.classList.add('hidden');
    restartBtn.classList.add('hidden');
    timerEl.textContent = GAME_TIME;
    requestAnimationFrame(loop);
  }

  function showStart(){
    msgTitle.textContent = '雨男 - 雨を避けろ';
    msgSub.textContent = '60秒間、降ってくる雨を避け続けよう。時間が経つほど難しくなる！';
    message.classList.remove('hidden');
    startBtn.classList.remove('hidden');
    restartBtn.classList.add('hidden');
  }

  function showGameOver(){
    msgTitle.textContent = 'ゲームオーバー';
    msgSub.textContent = `生き残った時間: ${Math.floor(elapsed)} 秒`;
    message.classList.remove('hidden');
    startBtn.classList.add('hidden');
    restartBtn.classList.remove('hidden');
  }

  function win(){
    msgTitle.textContent = 'クリア！';
    msgSub.textContent = `60秒間生き延びた！おめでとう！`;
    message.classList.remove('hidden');
    startBtn.classList.add('hidden');
    restartBtn.classList.remove('hidden');
  }

  startBtn.addEventListener('click', ()=>{ startGame(); });
  restartBtn.addEventListener('click', ()=>{ startGame(); });

  // 初期表示
  showStart();
})();
