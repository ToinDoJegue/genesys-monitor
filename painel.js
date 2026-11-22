(function() {
    // Evita duplicar o painel se clicar no favorito mais de uma vez
    if (document.getElementById('meu-painel-genesys')) {
        alert('O painel já está ativo na tela!');
        return;
    }

    const URL_APPS_SCRIPT = 'https://script.google.com/macros/s/SUA_CHAVE_AQUI/exec';

    // 1. Cria o estilo CSS do painel flutuante e do botão inferior
    const style = document.createElement('style');
    style.innerHTML = `
        #btn-flutuante-fila {
            position: fixed; bottom: 16px; right: 16px; z-index: 999999;
            background: #1e2329; color: #fff; border: 1px solid #363d47;
            padding: 10px 16px; border-radius: 20px; font-family: sans-serif;
            font-size: 13px; font-weight: bold; cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px;
        }
        #btn-flutuante-fila:hover { background: #2b3139; }
        #meu-painel-genesys {
            position: fixed; bottom: 65px; right: 16px; width: 340px;
            background: #1e2329; color: #e2e8f0; border: 1px solid #363d47;
            border-radius: 12px; padding: 16px; z-index: 999999;
            font-family: sans-serif; font-size: 13px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.6); display: none;
        }
        .pg-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #363d47; padding-bottom: 10px; margin-bottom: 12px; }
        .pg-linha { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #2b3139; }
        .pg-badge { background: #0d6efd; color: white; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
        .pg-btn-acao { width: 100%; background: #0d6efd; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .pg-btn-acao:hover { background: #0b5ed7; }
    `;
    document.head.appendChild(style);

    // 2. Cria o HTML do painel e do botão
    const painel = document.createElement('div');
    painel.id = 'meu-painel-genesys';
    painel.innerHTML = `
        <div class="pg-header">
            <strong>📊 Monitor de Fila</strong>
            <span id="pg-status" style="font-size: 11px; color: #22c55e;">● Ativo</span>
        </div>
        <div id="pg-conteudo">Aguardando leitura da tela...</div>
        <button class="pg-btn-acao" id="pg-btn-enviar">Forçar envio para Site</button>
    `;

    const botao = document.createElement('button');
    botao.id = 'btn-flutuante-fila';
    botao.innerHTML = `☰ Fila: <span id="pg-resumo-btn">--</span>`;

    document.body.appendChild(painel);
    document.body.appendChild(botao);

    // 3. Abre/fecha o painel ao clicar no botão ou apertar um atalho (ex: Insert ou Num0)
    function alternarPainel() {
        painel.style.display = (painel.style.display === 'none' || painel.style.display === '') ? 'block' : 'none';
    }
    botao.onclick = alternarPainel;

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Numpad0') alternarPainel(); // Mesmo atalho da sua imagem
    });

    // 4. Função de leitura da tela e envio para o Apps Script
    function lerEAtualizar() {
        const iframe = document.querySelector('iframe');
        const doc = (iframe && iframe.contentDocument) ? iframe.contentDocument : document;
        const linhas = doc.querySelectorAll('table tbody tr');
        const dadosFila = [];

        linhas.forEach(linha => {
            const cols = linha.querySelectorAll('td');
            if (cols.length >= 2) {
                dadosFila.push({
                    fila: cols[0]?.innerText.trim(),
                    emEspera: cols[1]?.innerText.trim(),
                    disponiveis: cols[2]?.innerText.trim() || '0'
                });
            }
        });

        if (dadosFila.length > 0) {
            // Atualiza o botão flutuante e o painel interno
            document.getElementById('pg-resumo-btn').innerText = dadosFila[0].emEspera;
            document.getElementById('pg-conteudo').innerHTML = dadosFila.map(f => `
                <div class="pg-linha">
                    <span>${f.fila}</span>
                    <span class="pg-badge">${f.emEspera} em espera</span>
                </div>
            `).join('');

            // Envia para o seu Google Apps Script
            fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ atualizadoEm: new Date().toLocaleTimeString('pt-BR'), filas: dadosFila })
            });
        }
    }

    document.getElementById('pg-btn-enviar').onclick = lerEAtualizar;
    setInterval(lerEAtualizar, 10000);
})();
