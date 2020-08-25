var id = 10000;
var username;
var opponent;
var turn;
var level;
var mp = [];
var socket = null;
var lobbyws;
var lobby = {};
var pop = document.querySelector('#popup');
var faces = ["Alex", "Alfred", "Anita", "Anne", "Bernard", "Bill", "Charles", "Claire", "David", "Eric", "Frans", "George", "Herman", "Joe", "Maria", "Max", "Paul", "Peter", "Philip", "Richard", "Robert", "Sam", "Susan", "Tom"];
var flipPaused = false;
var fl = document.querySelector('#flip.sound');

function lengthfy(v){
  return "0000".slice((v+"").length) + v;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
  .then(reg => {
    console.log('WebApp registered!', 'scope:', reg.scope);
  })
  .catch(error => {
    console.log('WebApp failed to register!', 'Error:', error);
  });
}

function dialog(title, message, callback, isNote=false){
  var d = document.getElementById('dialog');
  if(isNote)
    d.classList.add('note');
  d.style.setProperty("--title", "'"+title+"'");
  d.lastElementChild.innerHTML = message;
  d.style.display = 'block';
  d.onclick = e => {
    if(e.target.classList.contains('option')){
      callback(e.target.nextElementSibling.classList.contains('option'));
      d.style.setProperty("--title", "'.'");
      d.lastElementChild.innerText = '';
      d.style.display = 'none';
      d.classList.remove('note');
    }
  };
}

const params = new URLSearchParams(window.location.search);
if(params.has('id')){
  id = parseInt(params.get('id'));
  document.querySelectorAll('#radio-container input').forEach(inp => {inp.disabled = true});
  document.querySelector('#gameid').value = lengthfy(id);
  document.querySelector('#connect-tab .continue').classList.remove('disabled');
} else {
  const dt = new Date();
  id = dt.getMinutes() | 1;
  id *= dt.getSeconds() | 1;
  id *= ((dt.getHours() + 1) / 8) | 1;
  id %= 10000;
}

const starter = document.getElementById('start');
const splash = document.getElementById('splash');
starter.onclick = () => {
  starter.style.marginTop = (window.innerHeight*1.3)+'px';
  splash.style.opacity = 0;
  document.querySelector('.tab#invite-tab input').value = lengthfy(id);
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", 'https://script.google.com/macros/s/AKfycbx6zxKKksTB9lgsWgbBcZ5OyOGyleHTcc0fOcg7sRjPUt5WXRaN/exec?id=10000');
  xmlHttp.send(null);
  xmlHttp.onload = () => {
    lobbyws = new WebSocket(xmlHttp.responseText);
    lobbyws.onopen = () => {lobbyws.send('new')};
    lobbyws.onmessage = lobbymessage;
  };
  setTimeout(() => {
    splash.style.display = 'none';
    document.querySelector('.active.tab').style.zIndex = 3;
  }, 1000);
};

var lobbymessage = e => {
  const u = JSON.parse(e.data.slice(4).length ? e.data.slice(4) : "{}");
  if(e.data == 'new' && username && level){
    lobbyws.send('rsp:'+JSON.stringify({
      gameId : id,
      username : username
    }));
  } else if(e.data.startsWith('rsp:') && lobby != null && !lobby[u.gameId]){
    lobby[u.gameId] = u.username;
    document.getElementById('player-container').innerHTML += '<label><input type="radio" name="player" value="'+u.gameId+'" '+((params.has('id') && u.gameId == id) ? 'checked' : '')+'><span></span>'+u.username+'</label>';
  } else if(e.data.startsWith('ext:')){
    delete lobby[u.gameId];
    const i = document.querySelector('input[value="'+u.gameId+'"]');
    if(i){
      if(i.checked){
        document.getElementById('gameid').value = '';
        document.querySelector('#connect-tab .continue').classList.add('disabled');
      }
      i.parentElement.remove();
    }
  }
};

for(var f of faces.map((a) => ({sort: Math.random(), value: a})).sort((a, b) => a.sort - b.sort).map((a) => a.value)){
  const d = document.createElement('DIV');
  const ind = faces.indexOf(f);
  const i = ind % 8;
  const j = parseInt(ind / 8);
  //[7+9, 104+9+9, 9+9+104, 9+9+104, 111+6+9, 100+10+9, 104+9+13, 104+13+9];
  const row = [16, 136, 260, 382, 508, 627, 753, 879];
  //[8+8, 152+40+8+8, 152+40+8+8];
  const col = [16, 224, 432];
  const w = [104, 104, 104, 111, 100, 104, 104, 104];
  /*const h = [192, 192, 192];*/
  d.innerHTML += '<div class="card"><div class="inner"><div class="avatar"><img style="background-image: url('+location.origin+location.pathname+'/assets/full.jpeg); width: '+w[i]+'px; height: '+(192 - 40)+'px; background-position: -'+row[i]+'px -'+col[j]+'px" src="'+location.origin+location.pathname+'/assets/transparent.jpeg" alt="'+f+'"></div><div class="cardback"><div class="logo">Guess Who?</div></div></div></div>';
  document.getElementById('board').appendChild(d.firstElementChild);
}

const board = document.getElementById('board');
board.onclick = e => {
  var t = e.target;
  var p = e.target.parentElement.parentElement;
  if(!board.classList.contains('selection') && !flipPaused){
    if(t.classList.contains('avatar')) {
      if (!fl.ended) 
        fl = fl.cloneNode();
      fl.play();
      p.classList.add('flipped');
      sel = Array.from(document.querySelectorAll('.card:not(.flipped) img')).map(img => img.alt);
      if(sel.length == mp.length){
        flipPaused = true;
        setTimeout(() => {
          dialog('Final Move?', 'Are you sure you want to declare the remaining ' + level + ' card'+(level > 1 ? 's':'')+' as your final Guess ?', bool => {
            flipPaused = bool;
            if(!bool)
              p.classList.remove('flipped');
            else {
              socket.send('sel:'+sel.join(','));
              const g = document.getElementById('game');
              if(sel.every(s => opponent.cards.indexOf(s) >= 0)){
                document.querySelector('#victory.sound').play();
                document.getElementById('result').innerText = 'YOU WON';
                document.getElementById('reason').innerText = 'You Correctly Guessed your opponent\'s Mystery Person'+(level > 1 ? 's':'');
              } else {
                document.querySelector('#failure.sound').play();
                document.getElementById('result').innerText = 'YOU LOST';
                document.getElementById('reason').innerText = 'You failed to Correctly Guess your opponent\'s Mystery Person'+(level > 1 ? 's':'');
              }
              g.style.opacity = 0;
              document.getElementById('over').style.opacity = 1;
              setTimeout(() => {g.style.display = 'none';}, 500);
              window.onbeforeunload = e => {delete e['returnValue']};
            }
          });
        }, 800);
      }
    } else if(t.classList.contains('cardback')){
      p.classList.remove('flipped');
      if (!fl.ended) 
        fl = fl.cloneNode();
      fl.play();
    }
  } else if(!flipPaused) {
    const name = t.previousElementSibling.children[0].alt;
    // const name = t.previousElementSibling.innerText;
    if(p.classList.contains('selected')) {
      p.classList.remove('selected');
      mp.splice(mp.indexOf(name), 1);
    } else if(!flipPaused) {
      p.classList.add('selected');
      mp.push(name);
      if(mp.length == level){
        flipPaused = true;
        socket.send('crd:'+JSON.stringify({cards : mp}));
        //document.getElementById('self').appendChild(t.previousElementSibling.cloneNode(true));
        const cards = document.querySelectorAll('.card.selected').forEach(card => {
          const tp = card.offsetTop + card.parentElement.offsetTop;
          const lf = card.offsetLeft + card.parentElement.offsetLeft + card.parentElement.parentElement.offsetLeft;
          const node = card.cloneNode(true);
          const avatar = card.children[0].children[0].cloneNode(true);
          node.className = '';
          node.style.width = card.clientWidth + 'px';
          node.style.height = card.clientHeight + 'px';
          node.style.position = 'fixed';
          node.style.top = tp + 'px';
          node.style.left = lf + 'px';
          node.style.transition = 'top 1s, left 1s, width 1s, height 1s';
          node.children[0].style.transition = 'transform 1s';
          node.children[0].style.transform = 'rotateX(180deg)';
          setTimeout(() => {
            card.classList.remove('selected');
            node.children[0].style.transform = 'rotateX(0deg)';
            if (!fl.ended) 
              fl = fl.cloneNode();
            fl.play();
          }, 100);
          document.body.appendChild(node);
          setTimeout(() => {
            if(window.innerWidth < 1000){
              node.style.top = 'calc(100% - 60px)';
              node.style.left = 0;
              node.style.width = node.style.height = '60px';
            } else {
              const container = document.getElementById('my-cards');
              node.style.left = (container.offsetLeft + container.parentElement.offsetLeft) + 10 + 'px';
              node.style.top = '10px';
              node.style.width = (container.clientWidth - 20) + 'px';
              node.style.height = (container.clientHeight - 20) + 'px';
            }
          }, 2000);
          setTimeout(() => {
            document.body.removeChild(node);
            board.classList.remove('selection');
            document.getElementById('my-cards').appendChild(avatar);
            document.getElementById('self').appendChild(avatar.cloneNode(true));
            flipPaused = false;
            if(window.innerWidth < 1000){
              dialog('Note', '<span style="width: 50px;height: 50px;display: inline-block;background: radial-gradient(limegreen, forestgreen);border-radius: 7px;color: white;text-align: center;line-height: 50px;font-size: xx-large;float: left;">❏</span><span style="float: right;width: calc(100% - 60px);">Hold it to see your chosen Mystery Card'+(level > 1 ? 's':'')+'</span>', b => {
                pop.innerText = (turn ? 'Start by asking a question' : 'Your opponent will Start by asking a question');
                pop.focus();
              }, true);
            } else {
              pop.innerText = (turn ? 'Start by asking a question' : 'Your opponent will Start asking question');
              pop.focus();
            }
          }, 2900);
        });
      }
    }
  }
};

document.querySelector('#invite-tab svg').onclick = () => {
  const url = 'https://editor.p5js.org/ahmedazhar05/present/zNUjM6Kw8?id='+id;
  if (navigator.share) {
    navigator.share({
      title: 'Guess Who!',
      text: 'Join me to play GUESS WHO?\n',
      url: url,
    })
    .then(() => console.log('Sharing Successful!'))
    .catch(er => er => console.error(er));
  } else {
    navigator.clipboard.writeText(url)
      .then(() => {
        console.log('Copied Successfully!');
        pop.innerText = 'Copied to Clipboard!';
        pop.focus();
        setTimeout(() => {pop.blur()}, 1000);
      })
      .catch(er => console.error(er));
  }
};

document.querySelector('#lobby > div:first-child').onclick = ev => {
  const active = document.querySelector('.active.tab');
  var elm = document.getElementById(ev.target.id+'-tab');
  elm = (active.id == elm.id) ? document.getElementById('instruction-tab') : elm;
  if(ev.target.classList.contains('btn')) {
    elm.style.zIndex = 2;
    active.style.animation = '0.5s ease 0s 1 normal forwards running fadeout';//could also use slideout
    setTimeout(() => {
      active.style.removeProperty('animation');
      active.style.zIndex = 1;
      elm.style.zIndex = 3;
      elm.classList.add('active');
      active.classList.remove('active');
    }, 500);
  }
};

document.querySelector('.container').oninput = ev => {
  const tab = ev.target.closest('.tab');
  if(tab && (tab.id == 'connect-tab' || tab.id == 'uname' || tab.id == 'invite-tab')){
    var v = ev.target.value;
    const btn = tab.lastElementChild;
    switch(tab.id){
      case 'connect-tab':
        if(ev.target.id == 'gameid'){
          v = parseInt(ev.target.value) % 10000;
          if(v && v > 0)
            btn.classList.remove('disabled');
          else
            btn.classList.add('disabled');
          const c = document.querySelector('#player-container input:checked');
          if(lobby[v])
            document.querySelector('#player-container input[value="'+v+'"]').checked = true;
          else if (c)
            c.checked = false;
          ev.target.value = lengthfy(v);
        } else {
          document.getElementById('gameid').value = lengthfy(ev.target.value);
          btn.classList.remove('disabled');
        }
        break;
      case 'invite-tab':
        btn.classList.remove('disabled');
        break;
      case 'uname':
        const already_taken = !Object.values(lobby).every(u => u != v);
        if(/^\w{5,}/g.test(v) && !already_taken)
          btn.classList.remove('disabled');
        else
          btn.classList.add('disabled');
        if(already_taken){
          pop.innerText = "'" + v + "' is already taken";
          pop.focus();
          setTimeout(() => {ev.target.focus()}, 1500);
        }
        ev.target.value = v.replace(/\W+/g, '').toLowerCase();
        break;
    }
  }
};

const container = document.querySelector('body > div.container');
container.onclick = ev => {
  const p = ev.target.parentElement.parentElement;
  if (ev.target.className == 'continue' && p.id == 'user') {
    username = document.querySelector('#uname input').value.trim();
    lobbyws.send('rsp:'+JSON.stringify({
      gameId : id,
      username : username
    }));
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", 'https://script.google.com/macros/s/AKfycbx6zxKKksTB9lgsWgbBcZ5OyOGyleHTcc0fOcg7sRjPUt5WXRaN/exec?id='+id);
    xmlHttp.send(null);
    xmlHttp.onload = () => {
      socket = new WebSocket(xmlHttp.responseText);
      socket.onopen = open;
      socket.onmessage = message;
    };
    lobby = null;
  }
  if (ev.target.className == 'continue' && p.id == 'lobby'){
    if(ev.target.closest('.tab').id == 'connect-tab')
      id = parseInt(document.getElementById('gameid').value);
    else if(ev.target.closest('.tab').id == 'invite-tab')
      level = parseInt(document.querySelector('#radio-container input:checked').value);
  }
  if(ev.target.className == 'continue'){
    p.style.bottom = '-100%';
    setTimeout(() => {
      p.style.display = 'none';
    }, 800);
  }
  if(ev.target.id == 'chatbar' && ev.target.classList.contains('disabled')){
    pop.blur();
    pop.innerText = (mp.length == level) ? 'Not your Turn' : 'Please choose your Mystery Card'+(level > 1 ? 's':'');
    pop.focus();
  }
};

var open = e => {
  turn = false;
  socket.send('new:'+JSON.stringify({
    username: username,
    gameId : id,
    turn : false
  }));
};

var message = e => {
  const response = e.data.charAt(4) == ':';
  const tag = e.data.slice(0, 3);
  const data = e.data.slice(4 + response);
  switch(tag){
    case 'new':
      turn = !response;
      opponent = JSON.parse(data);
      if(turn && level){
        socket.send('new::'+JSON.stringify({
          username: username,
          gameId : id,
          turn : turn,  //basically sending true
          level : level
        }));
        document.getElementById('chatbar').className = '';
      } else if (turn && !level){
        const errorMsg = "Game Mode not set!\\ARestart the Game";
        socket.send('err::'+errorMsg);
        const game = document.getElementById('game');
        game.style.setProperty('--error-msg', "'"+errorMsg+"'");
        game.className = 'bg error';
        socket.close();
        break;
      } else 
        level = opponent.level;
      if(mp.length){
        document.querySelectorAll('.card.flipped').forEach(card => {card.classList.remove('flipped')});
        document.getElementById('my-cards').innerHTML = document.getElementById('chat-text').innerHTML = document.getElementById('chat-container').innerHTML = '';
        mp = [];
      }
      document.getElementById('chat-container').style.setProperty('--opponent-uname', "'"+opponent.username+"'");
      const w = document.querySelector('.waiting');
      w.classList.add('ready');
      setTimeout(() => {w.className = 'bg';}, 550);
      lobbyws.send('ext:{"gameId" : '+id+'}');
      lobbyws.close();
      window.onbeforeunload = e => {
        const st = 'Are you sure you want to quit the game uncompleted ?';
        confirm(st);
        e.preventDefault();
        e.returnValue = st;
        return st;
      };
      pop.blur();
      pop.innerText = opponent.username+' Connected!';
      pop.focus();
      setTimeout(() => {
        pop.innerText = 'Choose your '+level+' Mystery Card'+(level > 1 ? 's' : '');
        pop.focus();
      }, 2000);
      break;
    case 'err':
      if(response)
        socket.close();
      const game = document.getElementById('game');
      game.style.setProperty('--error-msg', "'"+data+"'");
      game.className = 'bg error';
      break;
    case 'ext':
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open("GET", 'https://script.google.com/macros/s/AKfycbx6zxKKksTB9lgsWgbBcZ5OyOGyleHTcc0fOcg7sRjPUt5WXRaN/exec?id=10000');
      xmlHttp.send(null);
      xmlHttp.onload = () => {
        lobbyws = new WebSocket(xmlHttp.responseText);
        lobbyws.onopen = () => {
          lobbyws.send('rsp:'+JSON.stringify({
            gameId : id,
            username : username
          }));
        };
        lobbyws.onmessage = lobbymessage;
      };
      document.getElementById('game').classList.add('waiting');
      document.getElementById('board').classList.add('selection');
      pop.innerText = opponent.username + ' left the game!';
      pop.focus();
      window.onbeforeunload = e => {delete e['returnValue']};
      break;
    case 'sel':
      const g = document.getElementById('game');
      if(data.split(',').every(s => mp.indexOf(s) >= 0)){
        document.querySelector('#failure.sound').play();
        document.getElementById('result').innerText = 'YOU LOST';
        document.getElementById('reason').innerText = 'Your Opponent Correctly Guessed your Mystery Person'+(level > 1 ? 's':'')+' before you';
      } else {
        document.querySelector('#victory.sound').play();
        document.getElementById('result').innerText = 'YOU WON';
        document.getElementById('reason').innerText = 'Your Opponent Failed to correctly guess your Mystery Person'+(level > 1 ? 's':'');
      }
      g.style.opacity = 0;
      setTimeout(() => {g.style.display = 'none';}, 500);
      window.onbeforeunload = e => {delete e['returnValue']};
      break;
    case 'msg':
      document.querySelector('#message.sound').play();
      if(response) {
        turn = true;
      } else 
        document.getElementById('chatbar').classList.remove('disabled');
      updateChats('opp', data, true);
      /*document.activeElement.blur();
      document.getElementById('chat-container').focus();*/
      break;
    case 'crd':
      opponent.cards = JSON.parse(data).cards;
      document.querySelectorAll('.inner img[alt='+opponent.cards.join('], .inner img[alt=')+']').forEach(c => {document.getElementById('opp').appendChild(c.parentElement.cloneNode(true));});
      break;
  }
};

window.onfocus = () => {
  if(socket)
    socket.send('act:true');
};

pop.onblur = () => {
  setTimeout(() => {
    pop.innerText = pop.className = '';
  }, 500);
};

document.getElementById('chat-text').oninput = e => {
  document.body.onkeydown = ev => {
    if(e.inputType == 'insertParagraph' || ev.key == 'Enter' && e.target.innerText.trim() != ''){
      document.querySelector('#sent.sound').play();
      e.preventDefault();
      ev.preventDefault();
      updateChats('you', e.target.innerText, false);
      socket.send('msg:'+e.target.innerText.trim());
      e.target.innerText = '';
      e.target.parentElement.className = 'response disabled';
      e.target.blur();
      turn = false;
    }
  };
};

document.getElementById('binary').onclick = e => {
  document.querySelector('#sent.sound').play();
  const data = e.target.nextElementSibling ? 'YES' : 'NO';
  socket.send('msg::'+data);
  updateChats('you', data, false);
  e.target.parentElement.parentElement.classList.remove('response');
};

document.getElementById('chatbox').onfocus = () => {
  document.getElementById('chatbox').classList.remove('pending');
};

document.getElementById('replay').onclick = () => {
  if(socket){
    socket.send('ext:');
    socket.close();
  }
  location.href = location.origin + location.pathname;
};

function updateChats(tag, chat, received){
  const wp = document.getElementById('chat-container');
  if(received && wp.parentElement != document.activeElement){
    wp.parentElement.classList.add('pending');
    pop.blur();
    setTimeout(() => {
      pop.className = 'message';
      pop.innerText = chat;
      pop.focus();
    }, 500);
  }
  // if(wp.lastElementChild)
  //   wp.lastElementChild.removeAttribute('id');
  // wp.innerHTML += '<div class="chat '+tag+'" id="last-chat">'+chat+'</div>';
  wp.innerHTML += '<div class="chat '+tag+'"></div>';
  setTimeout(() => {wp.lastElementChild.innerText = chat;}, 100);
  wp.scroll(0, wp.scrollHeight);
}

window.onclose = window.onunload = () => {
  if(socket){
    if(document.getElementById('game').style.display != 'none')
      socket.send('ext:');
    socket.close();
  }
  if(lobbyws){
    lobbyws.send('ext:'+JSON.stringify({gameId: id}));
    lobbyws.close();
  }
};
