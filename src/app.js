    // commit para disparar
    // Chaves PIX movidas para o backend por segurança

    // Variáveis globais
    let categorias = [];
    let categoriaAtual = '';
    let pedidosMusicaAtivos = true;

    // Funções de contador movidas para o backend por segurança

    // Função para formatar telefone e limitar a 11 dígitos
    function formatarTelefone(input) {
      let valor = input.value.replace(/\D/g, '');
      
      if (valor.length > 11) {
        valor = valor.substring(0, 11);
      }
      
      if (valor.length <= 2) {
        input.value = valor;
      } else if (valor.length <= 7) {
        input.value = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
      } else {
        input.value = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7)}`;
      }
    }

    // Verificar se o telefone está preenchido e habilitar/desabilitar checkbox
    function verificarConsentimento() {
      const telefone = document.getElementById('telefone').value;
      const checkbox = document.getElementById('consentimento');
      const label = document.getElementById('labelConsentimento');
      const container = document.querySelector('.consent-container');
      
      const telefoneNumeros = telefone.replace(/\D/g, '');
      
      if (telefoneNumeros.length >= 10) {
        container.style.display = 'block';
        checkbox.disabled = false;
        label.classList.remove('disabled');
      } else {
        container.style.display = 'none';
        checkbox.disabled = true;
        checkbox.checked = false;
        label.classList.add('disabled');
      }
    }

    // Função para detectar modo de economia de dados
    function detectarEconomiaDados() {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          document.body.classList.add('economia-dados');
        }
      }
      
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('economia-dados');
      }
    }

    // Função para remover acentos
    function removerAcentos(texto) {
      return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // FUNÇÃO CORRIGIDA: Carregar categorias do backend
    async function carregarCategorias() {
      console.log('🔄 Iniciando carregamento de categorias...');
      
      try {
        const response = await fetch('/.netlify/functions/get-pastas');
        console.log('📡 Resposta recebida:', response.status);
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 Dados recebidos:', data);
        
        if (data.data && Array.isArray(data.data)) {
          categorias = data.data;
          pedidosMusicaAtivos = data.disponivel;
          console.log('✅ Categorias carregadas:', categorias);
          console.log('✅ Status disponível:', pedidosMusicaAtivos);
          
          // Habilitar botão "Pedir música"
          const btnPedirMusica = document.getElementById('btnPedirMusica');
          if (btnPedirMusica) {
            btnPedirMusica.disabled = false;
            console.log('✅ Botão "Pedir música" habilitado');
          }
        } else {
          throw new Error('Formato de dados inválido');
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
        alert('Erro ao carregar categorias. Verifique sua conexão.');
      }
    }

    // FUNÇÃO CORRIGIDA: Mostrar categorias na interface
    function mostrarCategorias() {
      console.log('🎯 Mostrando categorias...');
      
      if (!pedidosMusicaAtivos) {
        document.getElementById('showNaoComecouOverlay').style.display = 'flex';
        return;
      }

      // Esconder todas as outras seções
      document.getElementById('pagina-inicial').style.display = 'none';
      document.getElementById('listaMusicas').style.display = 'none';
      document.getElementById('formularioPedido').style.display = 'none';
      document.getElementById('confirmacao').style.display = 'none';
      
      // Mostrar seção de categorias
      document.getElementById('listaCategorias').style.display = 'block';
      
      // Limpar e popular lista de categorias
      const listaCategorias = document.getElementById('categorias');
      listaCategorias.innerHTML = '';
      
      console.log('📝 Criando elementos para categorias:', categorias);
      
      categorias.forEach(categoria => {
        const li = document.createElement('li');
        li.textContent = categoria;
        li.style.cursor = 'pointer';
        
        // Adicionar evento de clique
        li.addEventListener('click', () => {
          console.log('🎵 Categoria clicada:', categoria);
          mostrarMusicas(categoria);
        });
        
        listaCategorias.appendChild(li);
        console.log('✅ Categoria adicionada à lista:', categoria);
      });
      
      // Adicionar navegação com history
      history.pushState({ page: 'categorias' }, 'Categorias', '#categorias');
    }

   // FUNÇÃO CORRIGIDA: Carregar e mostrar músicas de uma categoria
async function mostrarMusicas(categoria) {
  console.log('🎵 Carregando músicas da categoria:', categoria);
  
  try {
    categoriaAtual = categoria;
    
    // Esconder categorias e mostrar seção de músicas ANTES da requisição
    document.getElementById('listaCategorias').style.display = 'none';
    document.getElementById('listaMusicas').style.display = 'block';
    
    // Atualizar título da seção
    const tituloMusicas = document.querySelector("#listaMusicas h2");
    if (tituloMusicas) {
      tituloMusicas.textContent = categoria;
    }
    
    // Mostrar loading
    const listaMusicas = document.getElementById('musicas');
    listaMusicas.innerHTML = '<li style="text-align: center; padding: 20px;">Carregando músicas...</li>';
    
    // Fazer requisição para get-lista
    const response = await fetch(`/.netlify/functions/get-pasta?categoria=${encodeURIComponent(categoria)}`);
    console.log('📡 Resposta get-lista:', response.status);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🎶 Dados completos recebidos:', data);
    console.log('🎶 Lista de músicas:', data);
    
    if (Array.isArray(data) && data.length > 0) {
      // Exibir músicas
      exibirMusicas(data);
      console.log('✅ Músicas exibidas com sucesso');
    } else {
      // Mostrar mensagem de categoria vazia
      listaMusicas.innerHTML = '<li style="text-align: center; padding: 20px; color: #888;">Nenhuma música encontrada nesta categoria.</li>';
      console.log('⚠️ Categoria vazia ou dados inválidos');
    }
    
    // Adicionar navegação com history
    history.pushState({ page: 'musicas', categoria: categoria }, `Músicas - ${categoria}`, `#musicas-${categoria}`);
    
  } catch (error) {
    console.error('❌ Erro ao carregar músicas:', error);
    
    // Mostrar erro na interface
    const listaMusicas = document.getElementById('musicas');
    listaMusicas.innerHTML = '<li style="text-align: center; padding: 20px; color: #ff6b6b;">Erro ao carregar músicas. Tente novamente.</li>';
    
    alert(`Erro ao carregar músicas da categoria ${categoria}`);
  }
}

    // FUNÇÃO CORRIGIDA: Exibir lista de músicas
    function exibirMusicas(musicas) {
      console.log('📋 Exibindo músicas:', musicas);
      
      const listaMusicas = document.getElementById('musicas');
      listaMusicas.innerHTML = '';
      
      musicas.forEach((musica, index) => {
        // Garantir que musica é uma string
        const nomeMusica = String(musica);
        const nomeSeguro = nomeMusica.replace(/'/g, "\\'");
        
       const li = document.createElement('li');
li.classList.add('musica-item');
li.innerHTML = `
  <span>${nomeMusica}</span>
  <button class="btn-musica">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5,3 19,12 5,21"></polygon>
    </svg>
    Toca essa!
  </button>
`;
const btn = li.querySelector('.btn-musica');

// Listener seguro, funciona mesmo depois da ofuscação
btn.addEventListener('click', () => {
  selecionarMusica(nomeSeguro); // ainda funciona porque é referência interna
});

        
        listaMusicas.appendChild(li);
        console.log(`✅ Música ${index + 1} adicionada:`, nomeMusica);
      });
    }

   function filtrarMusicas() {
  const termo = document.getElementById('buscaMusica').value.toLowerCase();
  const termoSemAcentos = removerAcentos(termo);

  console.log('🔍 Filtrando músicas com termo:', termo);

  // Seleciona os <li> das músicas já mostradas
  const musicas = document.querySelectorAll('#musicas li');

  musicas.forEach(musica => {
    const texto = removerAcentos(musica.textContent.toLowerCase());
    musica.style.display = texto.includes(termoSemAcentos) ? '' : 'none';
  });
}

    // Função para selecionar música
    function selecionarMusica(musica) {
      console.log('🎯 Música selecionada:', musica);
      
      document.getElementById('listaMusicas').style.display = 'none';
      document.getElementById('formularioPedido').style.display = 'block';
      document.getElementById('musica').value = musica;
      
      // Carregar dados salvos
      const nomeSalvo = localStorage.getItem('nomeUsuario');
      const telefoneSalvo = localStorage.getItem('telefoneUsuario');
      
      if (nomeSalvo) {
        document.getElementById('nome').value = nomeSalvo;
      }
      if (telefoneSalvo) {
        document.getElementById('telefone').value = telefoneSalvo;
        verificarConsentimento();
      }
      
      // Adicionar navegação com history
      history.pushState({ page: 'pedido', musica: musica }, `Pedido - ${musica}`, '#pedido');
    }

    function atualizarGorjeta() {
      const gorjeta = document.getElementById('gorjeta').value;
      const outroValorContainer = document.getElementById('outroValorContainer');
      const mensagemField = document.getElementById('mensagem');
      
      if (gorjeta === 'outro') {
        outroValorContainer.style.display = 'block';
      } else {
        outroValorContainer.style.display = 'none';
      }
      
      if (gorjeta && gorjeta !== '') {
        mensagemField.disabled = false;
        mensagemField.placeholder = 'Digite sua mensagem ou dedicatória...';
      } else {
        mensagemField.disabled = true;
        mensagemField.placeholder = 'Selecione acima para ativar';
        mensagemField.value = '';
      }
    }

    // Variável para controle de debounce (PRESERVADA)
    let enviandoPedido = false;

    async function enviarPedido(event) {
      event.preventDefault();
      
      // DEBOUNCE: Impede múltiplos cliques (PRESERVADO)
      if (enviandoPedido) {
        return;
      }
      
      enviandoPedido = true;
      
      // Controle do botão (PRESERVADO)
      const botaoEnviar = event.target.querySelector('button[type="submit"]');
      const textoOriginalBotao = botaoEnviar.textContent;
      botaoEnviar.disabled = true;
      botaoEnviar.textContent = 'Enviando...';
      
      // Coletar dados do formulário (SIMPLIFICADO)
      const dadosPedido = {
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        musica: document.getElementById('musica').value,
        gorjeta: document.getElementById('gorjeta').value,
        outroValor: document.getElementById('outroValor').value,
        mensagem: document.getElementById('mensagem').value,
        consentimento: document.getElementById('consentimento').checked
      };
      
      // Salvar dados localmente (PRESERVADO)
      if (dadosPedido.nome) {
        localStorage.setItem('nomeUsuario', dadosPedido.nome);
      }
      if (dadosPedido.telefone) {
        localStorage.setItem('telefoneUsuario', dadosPedido.telefone);
      }
      
      try {
        // Enviar para o backend (SIMPLIFICADO)
        const response = await fetch("/.netlify/functions/banner", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dadosPedido)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Erro desconhecido ao enviar pedido.');
        }

        console.log('✅ Pedido enviado com sucesso!');
        
        // Processar resposta do backend
        document.getElementById("formularioPedido").style.display = "none";
        document.getElementById("confirmacao").style.display = "block";

        const tituloConfirmacao = document.querySelector("#confirmacao h2");

        // Lógica de exibição baseada na resposta do backend
        if (data.temGorjeta) {
          tituloConfirmacao.textContent = "Tá quase lá...";
          document.getElementById("pixContainer").style.display = "block";
          document.getElementById("chavePix").value = data.chavePix;
          document.getElementById("btnVoltarInicio").style.display = "none";
        } else {
          tituloConfirmacao.textContent = "Pedido enviado com sucesso!🎤🎶";
          document.getElementById("pixContainer").style.display = "none";
          document.getElementById("btnVoltarInicio").style.display = "block";
        }

        // Adicionar navegação com history (PRESERVADO)
        history.pushState({ page: 'confirmacao' }, 'Confirmação', '#confirmacao');

      } catch (error) {
        console.error('❌ Erro ao enviar pedido:', error);
        alert(`❌ Erro ao enviar pedido. Verifique sua conexão com a internet: ${error.message}`);
      } finally {
        // Restaurar estado do botão (PRESERVADO)
        botaoEnviar.disabled = false;
        botaoEnviar.textContent = textoOriginalBotao;
        enviandoPedido = false;
      }
    }

    function copiarPixConfirmacao() {
      const chavePix = document.getElementById('chavePix');
      chavePix.select();
      chavePix.setSelectionRange(0, 99999);
      
      try {
        document.execCommand('copy');
        const botao = event.target;
        const textoOriginal = botao.textContent;
        botao.textContent = 'Copiado!';
        setTimeout(() => {
          botao.textContent = textoOriginal;
        }, 2000);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }

    // FUNÇÃO CORRIGIDA: Voltar ao início
    function voltarInicio() {
      console.log('🏠 Voltando ao início...');
      
      // Esconder todas as seções
      document.getElementById('confirmacao').style.display = 'none';
      document.getElementById('listaCategorias').style.display = 'none';
      document.getElementById('listaMusicas').style.display = 'none';
      document.getElementById('formularioPedido').style.display = 'none';
      
      // Mostrar página inicial
      document.getElementById('pagina-inicial').style.display = 'block';
      
      // Limpar formulário (exceto nome e telefone)
      document.getElementById('musica').value = '';
      document.getElementById('gorjeta').value = '';
      document.getElementById('outroValor').value = '';
      document.getElementById('mensagem').value = '';
      document.getElementById('consentimento').checked = false;
      document.getElementById('outroValorContainer').style.display = 'none';
      document.getElementById('mensagem').disabled = true;
      document.getElementById('mensagem').placeholder = 'Selecione acima para ativar';
      
      verificarConsentimento();
      
      // Resetar history
      history.pushState({ page: 'inicio' }, 'Início', '/');
    }

    // Fechar pop-up de "show não começou"
    function fecharShowNaoComecou() {
      document.getElementById('showNaoComecouOverlay').style.display = 'none';
    }

    // Funções do Pop-up
    function mostrarPopupDica() {
      document.getElementById('popupDica').style.display = 'flex';
    }

    function fecharPopupDica() {
      document.getElementById('popupDica').style.display = 'none';
      location.reload();
    }

    function mostrarPopupQuinta() {
      document.getElementById('popupQuinta').style.display = 'flex';
    }

    function fecharPopupQuinta() {
      document.getElementById('popupQuinta').style.display = 'none';
    }

    function mostrarPopupGorjeta() {
      document.getElementById('popupGorjeta').style.display = 'flex';
    }

    function fecharPopupGorjeta() {
      document.getElementById('popupGorjeta').style.display = 'none';
    }

    // NAVEGAÇÃO COM HISTORY API
    window.addEventListener('popstate', function(event) {
      console.log('🔙 Navegação com history:', event.state);
      
      if (event.state) {
        switch (event.state.page) {
          case 'inicio':
            voltarInicio();
            break;
          case 'categorias':
            mostrarCategorias();
            break;
          case 'musicas':
            if (event.state.categoria) {
              mostrarMusicas(event.state.categoria);
            }
            break;
          default:
            voltarInicio();
        }
      } else {
        voltarInicio();
      }
    });

    // Event listeners para fechar pop-ups
    document.addEventListener('click', function(event) {
      const popup = document.getElementById('popupDica');
      const popupContent = document.querySelector('.popup-content');
      
      if (event.target === popup && !popupContent.contains(event.target)) {
        fecharPopupDica();
      }
      
      const popupQuinta = document.getElementById('popupQuinta');
      const popupQuintaContent = document.querySelector('.popup-quinta-content');
      
      if (event.target === popupQuinta && !popupQuintaContent.contains(event.target)) {
        fecharPopupQuinta();
      }
      
      const popupGorjeta = document.getElementById('popupGorjeta');
      const popupGorjetaContent = document.querySelector('.popup-gorjeta-content');
      
      if (event.target === popupGorjeta && !popupGorjetaContent.contains(event.target)) {
        fecharPopupGorjeta();
      }

      const showNaoComecouOverlay = document.getElementById('showNaoComecouOverlay');
      const showNaoComecouContent = document.querySelector('.show-nao-comecou-content');
      
      if (event.target === showNaoComecouOverlay && !showNaoComecouContent.contains(event.target)) {
        fecharShowNaoComecou();
      }
    });

    // INICIALIZAÇÃO CORRIGIDA
    window.addEventListener('load', function() {
      console.log('🚀 Inicializando aplicação...');
      
      detectarEconomiaDados();
      carregarCategorias();
      
      console.log('✅ Aplicação inicializada');
    });

    // Adicionar event listener para o botão "Voltar às categorias"
    document.addEventListener('DOMContentLoaded', function() {
      // Encontrar botão de voltar às categorias e adicionar event listener
      const botaoVoltarCategorias = document.querySelector('#listaMusicas button');
      if (botaoVoltarCategorias && botaoVoltarCategorias.textContent.includes('Voltar às categorias')) {
        botaoVoltarCategorias.addEventListener('click', mostrarCategorias);
      }
    });
    document.addEventListener("DOMContentLoaded", function() {
  if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    const nomeSalvo = localStorage.getItem("nome");
    const telefoneSalvo = localStorage.getItem("telefone");
    const avisoVisto = localStorage.getItem("avisoVisto");

    if (!nomeSalvo && !telefoneSalvo && !avisoVisto) {
      document.getElementById("popup-aviso").style.display = "block";
      document.getElementById("popup-overlay").style.display = "block";
    }
  }
});

// Fechar popup e overlay
function fecharPopup() {
  localStorage.setItem("avisoVisto", "sim");
  document.getElementById("popup-aviso").style.display = "none";
  document.getElementById("popup-overlay").style.display = "none";
}

// Fechar popup clicando no overlay
document.getElementById("popup-overlay").addEventListener("click", function() {
  fecharPopup();
});

// Fechar popup com tecla ESC
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    fecharPopup();
  }
});
document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('copyright');
    if (!el) return;

    const anoCriacao = 2025; // ajuste se precisar
    const anoAtual = new Date().getFullYear();
    const textoAno = (anoAtual === anoCriacao) ? `${anoCriacao}` : `${anoCriacao} - ${anoAtual}`;

    el.textContent = `© ${textoAno} Pedro Teixeira. Todos os direitos reservados.`;
  });
// Funções que estavam inline

// Botão "Show não começou"
document.getElementById("btnFecharShowNaoComecou").addEventListener("click", fecharShowNaoComecou);

// Botão "Quinta Alternativa"
document.getElementById("btnMostrarQuinta").addEventListener("click", mostrarPopupQuinta);
document.getElementById("btnFecharQuinta").addEventListener("click", fecharPopupQuinta);

// Botão Instagram
document.getElementById("btnInstagram").addEventListener("click", () => {
  window.open("https://www.instagram.com/pedroteixeiramusic?igsh=NGx1dmo3cHc4YzMw&utm_source=qr");
});

// Botão pedir música
document.getElementById("btnPedirMusica").addEventListener("click", mostrarCategorias);

// Input busca música
document.getElementById("buscaMusica").addEventListener("input", filtrarMusicas);

// Botão voltar categorias
document.getElementById("btnVoltarCategorias").addEventListener("click", mostrarCategorias);

// Popup aviso
document.getElementById("btnFecharPopup").addEventListener("click", fecharPopup);

// Formulário de pedido
document.getElementById("pedidoForm").addEventListener("submit", enviarPedido);

// Telefone input
document.getElementById("telefone").addEventListener("input", function() {
  formatarTelefone(this);
  verificarConsentimento();
});

// Gorjeta
document.getElementById("gorjeta").addEventListener("change", atualizarGorjeta);
document.getElementById("btnMostrarGorjeta").addEventListener("click", mostrarPopupGorjeta);
document.getElementById("btnFecharGorjeta").addEventListener("click", fecharPopupGorjeta);

// Copiar Pix
document.getElementById("btnCopiarPix").addEventListener("click", copiarPixConfirmacao);

// Voltar ao início
document.getElementById("btnVoltarInicio").addEventListener("click", mostrarPopupDica);

// Popup dica
document.getElementById("btnFecharDica").addEventListener("click", fecharPopupDica);
