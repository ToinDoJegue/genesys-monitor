(function() {
    const API = 'https://api.npoint.io/4f0c66f493424945a6a2';
    const KF = 'GENESYS_FILAS_CFG';
    const MEU_ID = 'OP_' + Math.random().toString(36).substr(2, 9);

    if (window.__MG) {
        const p = document.getElementById('mpg');
        if (p) p.style.display = p.style.display === 'none' ? 'flex' : 'none';
        return;
    }
    window.__MG = 1;

    function getDocs() {
        const d = [document];
        document.querySelectorAll('iframe').forEach(i => {
            try { if (i.contentDocument) d.push(i.contentDocument); } catch (e) {}
        });
        return d;
    }

    function ler() {
        const res = [];
        getDocs().forEach(doc => {
            doc.querySelectorAll('table tbody tr').forEach(tr => {
                const td = tr.querySelectorAll('td'), tot = tr.querySelectorAll('.total-count');
                if (td.length >= 6 && tot.length >= 2) {
                    res.push({
                        f: td[0].innerText.trim().replace(/\s+/g, ' '),
                        a: tot[0].innerText.trim(),
                        i: tot[1].innerText.trim(),
                        ef: td[4]?.innerText.trim() || '-',
                        ff: td[5]?.innerText.trim() || '-'
                    });
                }
            });
        });
        return res;
    }

    function estaNaTelaDeFilas() {
        const url = window.location.href.toLowerCase();
        return url.includes('queues') || url.includes('analytics') || ler().length > 0;
    }

    // =========================================================================
    // MODO 1: ABA DE FILAS (TRANSMISSOR COM DETECÇÃO CONTÍNUA E ANTI-CONFLITO)
    // =========================================================================
    if (estaNaTelaDeFilas()) {
        const av = document.createElement('div');
        av.style.cssText = 'position:fixed;top:10px;right:20px;z-index:2147483647;background:#2563eb;color:#fff;padding:6px 14px;border-radius:20px;font:bold 12px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)';
        av.innerText = '⏳ Aguardando tabela de filas carregar...';
        document.body.appendChild(av);

        function tentarTransmitir() {
            const f = ler();
            if (f.length === 0) {
                av.style.background = '#2563eb';
                av.innerText = '⏳ Procurando filas na tela...';
                return;
            }
            fetch(API + '?t=' + Date.now()).then(r => r.json()).then(atual => {
                const agora = Date.now();
                const outroAtivo = atual && atual.lider && atual.lider !== MEU_ID && (agora - (atual.t || 0)) < 10000;
                if (outroAtivo) {
                    av.style.background = '#d97706';
                    av.innerText = '⏸️ Outro operador já está transmitindo (em espera)';
                    return;
                }
                av.style.background = '#16a34a';
                av.innerText = '📡 Transmitindo ' + f.length + ' filas p/ equipe...';
                fetch(API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lider: MEU_ID, h: new Date().toLocaleTimeString('pt-BR'), t: agora, f })
                }).catch(() => {});
            }).catch(() => {});
        }
        tentarTransmitir();
        setInterval(tentarTransmitir, 4000);
        return;
    }

    // =========================================================================
    // MODO 2: ABA DE ATENDIMENTO (PAINEL FLUTUANTE COM ARRASTO LIVRE)
    // =========================================================================
    const st = document.createElement('style');
    st.innerHTML = `
        #bfg { position:fixed; bottom:16px; right:16px; z-index:2147483647; background:#181b20; color:#fff; border:1px solid #363d47; padding:10px 16px; border-radius:20px; font:bold 13px sans-serif; cursor:grab; user-select:none; box-shadow:0 4px 12px rgba(0,0,0,.5); }
        #bfg:active { cursor:grabbing; }
        #mpg { position:fixed; bottom:65px; right:16px; width:360px; height:320px; min-width:180px; min-height:110px; background:#181b20; color:#e2e8f0; border:1px solid #363d47; border-radius:12px; padding:14px; z-index:2147483647; font:13px sans-serif; box-shadow:0 10px 25px rgba(0,0,0,.7); display:flex; flex-direction:column; box-sizing:border-box; }
        #pg-hdr { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2d333b; padding-bottom:8px; margin-bottom:10px; cursor:move; user-select:none; }
        .pgc { background:#22272e; border:1px solid #363d47; border-radius:8px; padding:10px; margin-bottom:8px; }
        .pgt { font-weight:bold; color:#fff; margin-bottom:6px; display:flex; justify-content:space-between; gap:8px; }
        .pga { background:#dc2626; color:#fff; padding:2px 8px; border-radius:10px; white-space:nowrap; }
        .pgo { background:#1d4ed8; color:#fff; padding:2px 8px; border-radius:10px; white-space:nowrap; }
        #pg-cfg { background:#121418; border:1px solid #363d47; border-radius:8px; padding:10px; margin-bottom:10px; display:none; max-height:160px; overflow-y:auto; }
        .pg-chk { display:flex; align-items:center; gap:8px; padding:4px 0; cursor:pointer; font-size:12px; }
        #pg-rsz { position:absolute; right:2px; bottom:2px; width:18px; height:18px; cursor:nwse-resize; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:13px; user-select:none; }
    `;
    document.head.appendChild(st);

    const p = document.createElement('div');
    p.id = 'mpg';
    p.innerHTML = '<div id="pg-hdr"><b>📊 Monitor de Filas</b><div style="display:flex;align-items:center;gap:8px"><span id="pgs" style="font-size:11px;color:#22c55e">● Ativo</span><button id="pg-btn-cfg" title="Filtrar filas" style="background:#262b33;border:1px solid #363d47;color:#fff;border-radius:6px;padding:2px 7px;cursor:pointer;font-size:12px">⚙️</button><button id="pg-btn-x" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px">✕</button></div></div><div id="pg-cfg"></div><div id="pgb" style="flex:1;overflow-y:auto;padding-right:4px">Conectando ao monitor...</div><div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-top:6px;padding-top:6px;border-top:1px solid #2d333b;padding-right:14px"><span id="pgh">--</span><span>F9</span></div><div id="pg-rsz" title="Redimensionar">◢</div>';

    const b = document.createElement('button');
    b.id = 'bfg';
    b.innerHTML = '☰ Fila: <span id="pgr">--</span>';

    document.body.appendChild(p);
    document.body.appendChild(b);

    function setIframesPointer(valor) {
        document.querySelectorAll('iframe').forEach(ifr => { ifr.style.pointerEvents = valor; });
    }

    // 1. Arrastar Botão Flutuante
    let arrB = false, bx = 0, by = 0;
    b.addEventListener('mousedown', e => {
        e.preventDefault();
        arrB = false;
        const r = b.getBoundingClientRect();
        bx = e.clientX - r.left;
        by = e.clientY - r.top;
        setIframesPointer('none');

        function moverBotao(ev) {
            arrB = true;
            b.style.left = (ev.clientX - bx) + 'px';
            b.style.top = (ev.clientY - by) + 'px';
            b.style.right = 'auto';
            b.style.bottom = 'auto';
        }
        function soltarBotao() {
            setIframesPointer('auto');
            window.removeEventListener('mousemove', moverBotao);
            window.removeEventListener('mouseup', soltarBotao);
        }
        window.addEventListener('mousemove', moverBotao);
        window.addEventListener('mouseup', soltarBotao);
    });
    b.addEventListener('click', () => {
        if (!arrB) p.style.display = p.style.display === 'none' ? 'flex' : 'none';
    });

    // 2. Arrastar Painel Inteiro pelo Cabeçalho
    const hdr = document.getElementById('pg-hdr');
    hdr.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        const r = p.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        setIframesPointer('none');

        function moverPainel(ev) {
            p.style.left = (ev.clientX - px) + 'px';
            p.style.top = (ev.clientY - py) + 'px';
            p.style.right = 'auto';
            p.style.bottom = 'auto';
        }
        function soltarPainel() {
            setIframesPointer('auto');
            window.removeEventListener('mousemove', moverPainel);
            window.removeEventListener('mouseup', soltarPainel);
        }
        window.addEventListener('mousemove', moverPainel);
        window.addEventListener('mouseup', soltarPainel);
    });

    // 3. Redimensionar Largura e Altura Livremente
    const rsz = document.getElementById('pg-rsz');
    rsz.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        const r = p.getBoundingClientRect();
        const sw = r.width, sh = r.height, sx = e.clientX, sy = e.clientY;
        p.style.left = r.left + 'px';
        p.style.top = r.top + 'px';
        p.style.right = 'auto';
        p.style.bottom = 'auto';
        setIframesPointer('none');

        function redimensionar(ev) {
            p.style.width = Math.max(180, sw + (ev.clientX - sx)) + 'px';
            p.style.height = Math.max(110, sh + (ev.clientY - sy)) + 'px';
        }
        function soltarRedimensionar() {
            setIframesPointer('auto');
            window.removeEventListener('mousemove', redimensionar);
            window.removeEventListener('mouseup', soltarRedimensionar);
        }
        window.addEventListener('mousemove', redimensionar);
        window.addEventListener('mouseup', soltarRedimensionar);
    });

    document.getElementById('pg-btn-x').onclick = () => { p.style.display = 'none'; };
    document.addEventListener('keydown', e => {
        if (e.key === 'F9') {
            e.preventDefault();
            p.style.display = p.style.display === 'none' ? 'flex' : 'none';
        }
    });

    const cfgBox = document.getElementById('pg-cfg');
    document.getElementById('pg-btn-cfg').onclick = () => { cfgBox.style.display = cfgBox.style.display === 'none' ? 'block' : 'none'; };

    let ocultas = JSON.parse(localStorage.getItem(KF) || '[]');
    window.__tgFila = nome => {
        if (ocultas.includes(nome)) ocultas = ocultas.filter(x => x !== nome);
        else ocultas.push(nome);
        localStorage.setItem(KF, JSON.stringify(ocultas));
    };

    let listaUltima = '';
    setInterval(() => {
        fetch(API + '?t=' + Date.now()).then(r => r.json()).then(d => {
            if (!d || !d.f) return;
            const nomes = d.f.map(x => x.f).join('|');
            if (nomes !== listaUltima) {
                listaUltima = nomes;
                cfgBox.innerHTML = '<div style="font-weight:bold;margin-bottom:6px;color:#94a3b8;font-size:11px">EXIBIR FILAS:</div>' + d.f.map(x => '<label class="pg-chk"><input type="checkbox" ' + (ocultas.includes(x.f) ? '' : 'checked') + ' onchange="window.__tgFila(\'' + x.f.replace(/'/g, "\\'") + '\')"> ' + x.f + '</label>').join('');
            }
            const visiveis = d.f.filter(x => !ocultas.includes(x.f));
            if (visiveis.length > 0) {
                const dest = visiveis.find(x => x.f.includes('VAREJO')) || visiveis[0];
                document.getElementById('pgr').innerText = dest.a + ' esp. | ' + dest.i + ' at.';
                document.getElementById('pgb').innerHTML = visiveis.map(x => '<div class="pgc"><div class="pgt"><span>' + x.f + '</span><span class="' + (parseInt(x.a) > 0 ? 'pga' : 'pgo') + '">' + x.a + ' aguardando</span></div><div style="display:flex;justify-content:space-between;font-size:12px"><span>Int: <b>' + x.i + '</b></span><span>Fila: <b>' + x.ef + '</b></span><span>Fora: <b>' + x.ff + '</b></span></div></div>').join('');
            } else {
                document.getElementById('pgr').innerText = '0 sel.';
                document.getElementById('pgb').innerHTML = '<span style="color:#94a3b8">Nenhuma fila marcada no filtro ⚙️</span>';
            }
            const atraso = (Date.now() - (d.t || 0)) / 1000, stEl = document.getElementById('pgs');
            if (atraso > 15) { stEl.style.color = '#f59e0b'; stEl.innerText = '● Pausado'; }
            else { stEl.style.color = '#22c55e'; stEl.innerText = '● Ativo'; }
            document.getElementById('pgh').innerText = 'Atualizado às ' + d.h;
        }).catch(() => {});
    }, 4000);
})();
