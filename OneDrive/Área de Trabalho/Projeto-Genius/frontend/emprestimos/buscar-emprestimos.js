// frontend/emprestimos/buscar-emprestimos.js

(() => {
let loanListContainer;
let tituloPagina;
let todosEmprestimos = [];
let emprestimosFiltrados = [];
let statusDaPagina = 'ativo';
let debounceTimerEmp; 

let paginaAtualEmp = 1;
let itensPorPaginaEmp = 10; 
let paginationContainer;

function escaparHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[match]));
}

function renderizarEmprestimos(emprestimos) {
    loanListContainer = document.querySelector('.loan-list-container');
    if (!loanListContainer) return;
    
    loanListContainer.innerHTML = '';
    
    if (emprestimos.length === 0) {
        loanListContainer.innerHTML = '<p>Nenhum empréstimo encontrado.</p>';
        return;
    }

    emprestimos.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'loan-card';
        card.setAttribute('data-id', emp.id);

        const dataEmp = new Date(emp.dataEmprestimo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        const nomeSeguro = escaparHTML(emp.usuario.nome);
        const cpfSeguro = escaparHTML(emp.usuario.cpf);
        const tombamentoSeguro = escaparHTML(emp.notebook.tombamento);

        if (statusDaPagina === 'ativo') {
            const dataDev = new Date(emp.dataDevolucaoPrevista).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const agora = new Date();
            const dataDevolucaoPrevista = new Date(emp.dataDevolucaoPrevista);
            const estaAtrasado = dataDevolucaoPrevista < agora;
            
            if (estaAtrasado) {
                card.classList.add('atrasado-card'); 
            }

            const badgeHTML = estaAtrasado ? '<span class="status-badge-floating atrasado">ATRASADO</span>' : '<span class="status-badge-floating em-dia">EM DIA</span>';

            const telefoneNumerico = emp.usuario.telefone ? emp.usuario.telefone.replace(/\D/g, '') : '';
            const primeiroNome = nomeSeguro.split(' ')[0];

            card.innerHTML = `
                ${badgeHTML}
                <div class="loan-header">
                    <div class="loan-info-summary">
                        <div class="user-info">
                            <i class="fas fa-user"></i>
                            <span>${nomeSeguro} (CPF: ${cpfSeguro})</span>
                        </div>
                        <div class="notebook-info">
                            <i class="fas fa-laptop"></i>
                            <span>${tombamentoSeguro}</span>
                        </div>
                        <div class="dates-info">
                            <strong>Emprestado em:</strong> ${dataEmp} | <strong>Devolução Prevista:</strong> ${dataDev}
                        </div>
                    </div>
                    <div class="expand-icon">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                
                <div class="loan-expanded-content" style="display: none;">
                    <div class="expanded-actions">
                        <button class="btn-large zap" data-action="whatsapp" data-tel="${telefoneNumerico}" data-nome="${primeiroNome}" data-tomb="${tombamentoSeguro}">
                            <i class="fab fa-whatsapp"></i> Chamar no WhatsApp
                        </button>
                        <button class="btn-large encerrar" title="Dar Baixa (Encerrar)" data-action="encerrar">
                            <i class="fas fa-check-circle"></i> Concluir Devolução
                        </button>
                        <button class="btn-large delete" title="Excluir Empréstimo do Sistema" data-action="delete">
                            <i class="fas fa-trash-alt"></i> Deletar
                        </button>
                    </div>
                </div>
            `;

        } else {
            card.classList.add('encerrado');
            
            const dataDevReal = emp.dataDevolucaoReal ? 
                new Date(emp.dataDevolucaoReal).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : 'N/A';
            
            const dataDevolucaoPrevista = new Date(emp.dataDevolucaoPrevista);
            const dataDevolucaoRealDate = new Date(emp.dataDevolucaoReal);
            const foiAtrasado = emp.dataDevolucaoReal && dataDevolucaoRealDate > dataDevolucaoPrevista;

            const badgeHTML = foiAtrasado ? '<span class="status-badge atrasado">Devolvido com Atraso</span>' : '';
            const obsSegura = escaparHTML(emp.observacoes || 'Nenhuma.');
            const obsDevSegura = escaparHTML(emp.observacoesDevolucao || 'Nenhuma.');

            card.innerHTML = `
                <div class="loan-info">
                    <div class="user-info">
                        <i class="fas fa-user"></i>
                        <span>${nomeSeguro} (CPF: ${cpfSeguro})</span>
                    </div>
                    <div class="notebook-info">
                        <i class="fas fa-laptop"></i>
                        <span>${tombamentoSeguro}</span>
                    </div>
                    
                    <div class="dates-info">
                        <strong>Emprestado em:</strong> ${dataEmp} | <strong>Devolvido em:</strong> ${dataDevReal}
                        ${badgeHTML}
                    </div>
                    
                    <div class="obs-info">
                        <p><strong>Obs. Retirada:</strong> ${obsSegura}</p>
                        <p><strong>Obs. Devolução:</strong> ${obsDevSegura}</p>
                    </div>
                </div>
            `;
        }
        loanListContainer.appendChild(card);
    });
}


async function buscarEmprestimos() {
    const token = localStorage.getItem('token');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    
    if (!token) {
        showAlert('Erro de Autenticação', 'Você não está autenticado.', 'error');
        return;
    }

    tituloPagina = document.getElementById('titulo-pagina');
    statusDaPagina = sessionStorage.getItem('emprestimoStatus') || 'ativo'; 
    
    loanListContainer = document.querySelector('.loan-list-container');
    const grupoStatus = document.getElementById('grupo-filtro-status');
    const grupoDataEnc = document.getElementById('grupo-filtro-data-enc');
    const grupoAtrasoEnc = document.getElementById('grupo-filtro-atraso-enc');
    const btnBaixarPdf = document.getElementById('btn-baixar-relatorio');

    if (statusDaPagina === 'encerrado') {
        itensPorPaginaEmp = 6; 
        if (loanListContainer) loanListContainer.classList.add('grid-view-encerrado'); 
        if (grupoStatus) grupoStatus.style.display = 'none'; 
        if (grupoDataEnc) grupoDataEnc.style.display = 'flex'; 
        if (grupoAtrasoEnc) grupoAtrasoEnc.style.display = 'flex'; 
        if (btnBaixarPdf) btnBaixarPdf.style.display = 'flex'; 

        const hoje = new Date();
        const inputInicio = document.getElementById('filtro-data-inicio');
        const inputFim = document.getElementById('filtro-data-fim');

        if (inputInicio && !inputInicio.value) {
            const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            inputInicio.value = primeiroDia.toISOString().split('T')[0];
        }
        if (inputFim && !inputFim.value) {
            inputFim.value = hoje.toISOString().split('T')[0];
        }

    } else {
        itensPorPaginaEmp = 10; 
        if (loanListContainer) loanListContainer.classList.remove('grid-view-encerrado');
        if (grupoStatus) grupoStatus.style.display = 'flex'; 
        if (grupoDataEnc) grupoDataEnc.style.display = 'none'; 
        if (grupoAtrasoEnc) grupoAtrasoEnc.style.display = 'none'; 
        if (btnBaixarPdf) btnBaixarPdf.style.display = 'none'; 
    }

    if (tituloPagina) {
        tituloPagina.textContent = statusDaPagina === 'ativo' ? 'Empréstimos Ativos' : 'Empréstimos Encerrados';
    }

    try {
        const response = await fetch(`http://localhost:3000/emprestimos?status=${statusDaPagina}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-cache'
        });

        if (response.status === 401 || response.status === 403) throw new Error('Token inválido ou expirado.');
        if (!response.ok) throw new Error('Falha ao buscar empréstimos.');

        const emprestimos = await response.json();
        todosEmprestimos = emprestimos;
        
        adicionarListenersFiltroEmprestimo();
        adicionarListenersAcoesEmprestimo();
        aplicarFiltrosEmprestimo(); 
        
    } catch (error) {
        console.error('Erro:', error);
        loanListContainer = document.querySelector('.loan-list-container');
        let errorMsg = 'Erro ao carregar empréstimos.';
        if (error.message.includes('Token')) errorMsg = 'Sessão expirada. Faça login novamente.';
        if (loanListContainer) loanListContainer.innerHTML = `<p>${errorMsg}</p>`;
    }
}


function encerrarEmprestimo(card, emprestimoId, userName, notebookTombamento) {
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.innerHTML = `
        <div class="modal-content">
            <h3>Devolução</h3>
            <div class="modal-info"><p>Confirme a devolução do notebook <strong>${escaparHTML(notebookTombamento)}</strong> pelo usuário <strong>${escaparHTML(userName)}</strong>.</p></div>
            
            <div class="modal-check-group">
                <label><input type="checkbox" id="check-condicoes" checked> Notebook devolvido em boas condições</label>
                <label><input type="checkbox" id="check-acessorios" checked> Todos os acessórios (fonte, etc.) foram devolvidos</label>
            </div>
            
            <div class="modal-obs-group">
                <label for="modal-observacoes" id="label-observacoes">Observações (Opcional):</label>
                <textarea id="modal-observacoes" placeholder="Se o notebook NÃO estiver em boas condições, este campo é obrigatório."></textarea>
            </div>
            
            <div class="modal-actions">
                <button class="modal-btn cancel" id="modal-btn-cancelar">Cancelar</button>
                <button class="modal-btn confirm" id="modal-btn-confirmar">Confirmar Devolução</button> 
            </div>
        </div>
    `;
    document.body.appendChild(modalBackdrop);

    const btnCancelar = document.getElementById('modal-btn-cancelar');
    const btnConfirmar = document.getElementById('modal-btn-confirmar');
    const checkCondicoes = document.getElementById('check-condicoes');
    const checkAcessorios = document.getElementById('check-acessorios');
    const inputObs = document.getElementById('modal-observacoes');
    const labelObs = document.getElementById('label-observacoes'); 

    function validarNovaLogica() {
        const boasCondicoes = checkCondicoes.checked;
        const obsPreenchida = inputObs.value.trim() !== '';

        if (!boasCondicoes) {
            labelObs.innerHTML = 'Observações (Obrigatório - Descreva o problema):';
            labelObs.style.color = '#e74c3c'; 
            btnConfirmar.disabled = !obsPreenchida; 
        } else {
            labelObs.innerHTML = 'Observações (Opcional):';
            labelObs.style.color = '#555'; 
            btnConfirmar.disabled = false; 
        }
    }

    checkCondicoes.addEventListener('change', validarNovaLogica);
    inputObs.addEventListener('input', validarNovaLogica);
    validarNovaLogica(); 

    function fecharModal() { document.body.removeChild(modalBackdrop); }
    btnCancelar.addEventListener('click', fecharModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) fecharModal(); });

    btnConfirmar.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        if (!token) return showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error');

        const observacoesDevolucao = inputObs.value;
        const boasCondicoes = checkCondicoes.checked;
        const acessoriosDevolvidos = checkAcessorios.checked;

        let obsFinal = observacoesDevolucao;

        if (!boasCondicoes && obsFinal === '') {
             showAlert('Campo Obrigatório', 'Por favor, descreva o problema nas observações.', 'error');
             return; 
        }
        if (!acessoriosDevolvidos) {
             obsFinal = `[ALERTA: Acessórios faltando.] ` + obsFinal;
        }

        try {
            const response = await fetch(`http://localhost:3000/emprestimos/${emprestimoId}/encerrar`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    observacoesDevolucao: obsFinal.trim() 
                }) 
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showAlert('Sucesso!', result.message, 'success'); 
            fecharModal();
            
            todosEmprestimos = todosEmprestimos.filter(emp => emp.id !== parseInt(emprestimoId));
            aplicarFiltrosEmprestimo(); 

        } catch (error) { 
            showAlert('Erro', error.message, 'error'); 
        }
    });
}


function adicionarListenersAcoesEmprestimo() {
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    
    loanListContainer = document.querySelector('.loan-list-container');
    if (loanListContainer) {
        
        const clone = loanListContainer.cloneNode(true);
        loanListContainer.parentNode.replaceChild(clone, loanListContainer);
        loanListContainer = clone;

        loanListContainer.addEventListener('click', async (e) => {
            const card = e.target.closest('.loan-card');
            if (!card) return;

            if (card.classList.contains('encerrado')) return;

            const actionButton = e.target.closest('.btn-large, .action-btn');

            if (!actionButton) {
                const expandedContent = card.querySelector('.loan-expanded-content');
                const icon = card.querySelector('.expand-icon i');
                
                if (expandedContent) {
                    const isHidden = expandedContent.style.display === 'none';
                    
                    document.querySelectorAll('.loan-expanded-content').forEach(el => el.style.display = 'none');
                    document.querySelectorAll('.expand-icon i').forEach(el => { 
                        el.classList.remove('fa-chevron-up'); 
                        el.classList.add('fa-chevron-down'); 
                    });
                    
                    if (isHidden) {
                        expandedContent.style.display = 'flex';
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                    }
                }
                return;
            }

            if (typeof showCustomConfirm !== 'function') {
                showAlert('Erro Crítico', 'A função de confirmação não foi carregada.', 'error');
                return;
            }

            const emprestimoId = card.dataset.id;
            const userName = card.querySelector('.user-info span').textContent.split(' (')[0];
            const notebookTombamento = card.querySelector('.notebook-info span').textContent.split(' (')[0];
            const action = actionButton.dataset.action;
            const token = localStorage.getItem('token'); 

            if (action === 'whatsapp') {
                const tel = actionButton.dataset.tel;
                const nome = actionButton.dataset.nome;
                const tomb = actionButton.dataset.tomb;
                
                if (!tel || tel === 'undefined' || tel.trim() === '') {
                    showAlert('Sem Telefone', 'O número de telefone deste aluno não carregou ou não está cadastrado.', 'warning');
                    return; 
                }

                const msg = `Olá ${nome}, aqui é da coordenação do programa Limites do Visível. Estou entrando em contato referente ao empréstimo do notebook ${tomb}.`;
                window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
            }
            else if (action === 'encerrar') {
                encerrarEmprestimo(card, emprestimoId, userName, notebookTombamento);
            } 
            else if (action === 'delete') {
                if (!token) { showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error'); return; }
                
                const confirmed = await showCustomConfirm('Excluir Empréstimo', `Tem certeza que deseja EXCLUIR o empréstimo do notebook ${escaparHTML(notebookTombamento)} para ${escaparHTML(userName)}?\n\nATENÇÃO: Isso NÃO conta como devolução.`);
                
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/emprestimos/${emprestimoId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);

                        showAlert('Sucesso!', result.message, 'success'); 
                        todosEmprestimos = todosEmprestimos.filter(emp => emp.id !== parseInt(emprestimoId));
                        aplicarFiltrosEmprestimo(); 
                    } catch (error) {
                        showAlert('Erro ao Excluir', error.message, 'error');
                    }
                }
            }
        });
    }
}


function aplicarFiltrosEmprestimo() {
    const filtroUsuario = document.getElementById('filtro-usuario');
    const filtroNotebook = document.getElementById('filtro-notebook');
    const filtroStatusEl = document.getElementById('filtro-status'); 

    const inputInicio = document.getElementById('filtro-data-inicio') ? document.getElementById('filtro-data-inicio').value : '';
    const inputFim = document.getElementById('filtro-data-fim') ? document.getElementById('filtro-data-fim').value : '';
    const filtroCondicaoEnc = document.getElementById('filtro-condicao-enc') ? document.getElementById('filtro-condicao-enc').value : 'todos';

    const termoUsuario = filtroUsuario ? filtroUsuario.value.toLowerCase() : '';
    const termoNotebook = filtroNotebook ? filtroNotebook.value.toLowerCase() : '';
    const statusFiltro = (filtroStatusEl && statusDaPagina === 'ativo') ? filtroStatusEl.value : 'todos'; 

    const agora = new Date(); 

    emprestimosFiltrados = todosEmprestimos.filter(emp => {
        const matchUsuario = (emp.usuario.nome.toLowerCase().includes(termoUsuario) || 
                                emp.usuario.cpf.toLowerCase().includes(termoUsuario));
        const matchNotebook = emp.notebook.tombamento.toLowerCase().includes(termoNotebook);

        let matchStatus = true; 
        let passaDataEnc = true;
        let passaCondicaoEnc = true;

        if (statusDaPagina === 'ativo') {
            if (statusFiltro === 'atrasados') {
                const dataDevolucao = new Date(emp.dataDevolucaoPrevista);
                matchStatus = dataDevolucao < agora; 
            } else if (statusFiltro === 'em_dia') {
                const dataDevolucao = new Date(emp.dataDevolucaoPrevista);
                matchStatus = dataDevolucao >= agora; 
            }
        } 
        else if (statusDaPagina === 'encerrado') {
            const dataDevReal = new Date(emp.dataDevolucaoReal);
            const dataDevPrevista = new Date(emp.dataDevolucaoPrevista);
            
            const dataDevApenasDia = new Date(dataDevReal.getFullYear(), dataDevReal.getMonth(), dataDevReal.getDate());

            if (inputInicio) {
                const [ano, mes, dia] = inputInicio.split('-');
                const dataInicio = new Date(ano, mes - 1, dia);
                if (dataDevApenasDia < dataInicio) passaDataEnc = false;
            }
            if (inputFim) {
                const [ano, mes, dia] = inputFim.split('-');
                const dataFim = new Date(ano, mes - 1, dia);
                if (dataDevApenasDia > dataFim) passaDataEnc = false;
            }

            if (filtroCondicaoEnc && filtroCondicaoEnc !== 'todos') {
                const devolvidoComAtraso = dataDevReal > dataDevPrevista;
                if (filtroCondicaoEnc === 'com_atraso' && !devolvidoComAtraso) passaCondicaoEnc = false;
                if (filtroCondicaoEnc === 'no_prazo' && devolvidoComAtraso) passaCondicaoEnc = false;
            }
        }

        return matchUsuario && matchNotebook && matchStatus && passaDataEnc && passaCondicaoEnc;
    });

    paginaAtualEmp = 1;
    atualizarPaginaEmp();
}

function atualizarPaginaEmp() {
    const startIndex = (paginaAtualEmp - 1) * itensPorPaginaEmp;
    const endIndex = startIndex + itensPorPaginaEmp;
    const emprestimosDaPagina = emprestimosFiltrados.slice(startIndex, endIndex);
    
    renderizarEmprestimos(emprestimosDaPagina); 
    renderizarPaginacaoEmp(emprestimosFiltrados.length); 
}

function renderizarPaginacaoEmp(totalItens) {
    paginationContainer = document.getElementById('pagination-container-emp');
    if (!paginationContainer) return; 

    paginationContainer.innerHTML = '';
    const totalPaginas = Math.ceil(totalItens / itensPorPaginaEmp);
    if (totalPaginas <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.disabled = (paginaAtualEmp === 1);
    prevButton.addEventListener('click', () => {
        if (paginaAtualEmp > 1) {
            paginaAtualEmp--;
            atualizarPaginaEmp();
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPaginas; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i === paginaAtualEmp) pageLink.classList.add('active');
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            paginaAtualEmp = i;
            atualizarPaginaEmp();
        });
        paginationContainer.appendChild(pageLink);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próximo';
    nextButton.disabled = (paginaAtualEmp === totalPaginas);
    nextButton.addEventListener('click', () => {
        if (paginaAtualEmp < totalPaginas) {
            paginaAtualEmp++;
            atualizarPaginaEmp();
        }
    });
    paginationContainer.appendChild(nextButton);
}

function adicionarListenersFiltroEmprestimo() {
    const debouncedAplicarFiltros = () => {
        clearTimeout(debounceTimerEmp);
        debounceTimerEmp = setTimeout(() => {
            aplicarFiltrosEmprestimo();
        }, 300);
    };

    const filtroUsuario = document.getElementById('filtro-usuario');
    const filtroNotebook = document.getElementById('filtro-notebook');
    const btnBuscar = document.getElementById('btn-buscar-emprestimo');
    const filtroStatus = document.getElementById('filtro-status'); 

    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    const filtroCondicaoEnc = document.getElementById('filtro-condicao-enc');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', (e) => {
            e.preventDefault(); 
            aplicarFiltrosEmprestimo(); 
        });
    }
    
    if (filtroUsuario) filtroUsuario.addEventListener('input', debouncedAplicarFiltros);
    if (filtroNotebook) filtroNotebook.addEventListener('input', debouncedAplicarFiltros);
    if (filtroStatus) filtroStatus.addEventListener('change', aplicarFiltrosEmprestimo);

    if (filtroUsuario) filtroUsuario.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltrosEmprestimo(); }});
    if (filtroNotebook) filtroNotebook.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltrosEmprestimo(); }});

    if (filtroDataInicio) filtroDataInicio.addEventListener('input', debouncedAplicarFiltros);
    if (filtroDataFim) filtroDataFim.addEventListener('input', debouncedAplicarFiltros);
    if (filtroCondicaoEnc) filtroCondicaoEnc.addEventListener('change', aplicarFiltrosEmprestimo);
}

// ==========================================
// EXPORTAÇÃO DE PDF (Tabela Nativa / Vetorial)
// ==========================================
window.baixarRelatorioEncerrados = function() {
    if (emprestimosFiltrados.length === 0) {
        const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
        showAlert('Aviso', 'Não há empréstimos para exportar com estes filtros.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-baixar-relatorio');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    btn.disabled = true;

    // Configura o título com as datas
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let periodoTexto = 'Período Completo';
    const inputInicio = document.getElementById('filtro-data-inicio');
    const inputFim = document.getElementById('filtro-data-fim');
    
    if(inputInicio && inputFim && inputInicio.value && inputFim.value) {
        const dI = inputInicio.value.split('-').reverse().join('/');
        const dF = inputFim.value.split('-').reverse().join('/');
        periodoTexto = `${dI} a ${dF}`;
    }

    // Inicializa o jsPDF (Orientação Paisagem 'l', unidade 'mm', formato 'A4')
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    // 1. Títulos do PDF
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Histórico de Empréstimos Encerrados', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Projeto Limites do Visível | Período: ${periodoTexto}`, 14, 28);
    doc.text(`Gerado em: ${dataHoje} | Total de registros: ${emprestimosFiltrados.length}`, 14, 33);

    // 2. Preparar os Cabeçalhos e as Linhas da Tabela
    const cabecalho = [['Aluno / CPF', 'Notebook', 'Retirada', 'Devolução', 'Status', 'Observações']];
    
    const linhas = emprestimosFiltrados.map(emp => {
        const dataEmp = new Date(emp.dataEmprestimo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        const dataDev = emp.dataDevolucaoReal ? new Date(emp.dataDevolucaoReal).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const dataDevPrevista = new Date(emp.dataDevolucaoPrevista);
        const dataDevolucaoRealDate = new Date(emp.dataDevolucaoReal);
        
        const foiAtrasado = emp.dataDevolucaoReal && dataDevolucaoRealDate > dataDevPrevista;
        const statusTexto = foiAtrasado ? 'COM ATRASO' : 'NO PRAZO';

        return [
            `${emp.usuario.nome}\nCPF: ${emp.usuario.cpf}`,
            emp.notebook.tombamento,
            dataEmp,
            dataDev,
            statusTexto,
            emp.observacoesDevolucao || 'Nenhuma.'
        ];
    });

    // 3. Desenhar a Tabela Mágica com as Linhas (Bordas) Solicitadas
    doc.autoTable({
        head: cabecalho,
        body: linhas,
        startY: 40, 
        theme: 'grid', // O tema 'grid' desenha as linhas horizontais e verticais
        styles: { 
            font: 'helvetica', 
            fontSize: 9,
            cellPadding: 5, // Dá um pequeno respiro no texto dentro da célula
            lineColor: [100, 116, 139], // Define a cor da linha (um tom de cinza azulado bem elegante)
            lineWidth: 0.3 // Engrossa a linha para ficar perfeitamente visível (como no seu desenho)
        },
        headStyles: { 
            fillColor: [44, 62, 80], 
            textColor: 255, 
            fontStyle: 'bold',
            lineColor: [44, 62, 80], // Remove bordas claras do cabeçalho
            lineWidth: 0.3
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Efeito zebra hiper sutil (fundo branco / fundo cinza clarinho)
        },
        columnStyles: {
            0: { cellWidth: 55 }, // Coluna Aluno
            1: { cellWidth: 30 }, // Notebook
            2: { cellWidth: 35 }, // Retirada
            3: { cellWidth: 35 }, // Devolução
            4: { cellWidth: 25, fontStyle: 'bold' }, // Status
            5: { cellWidth: 'auto' } // Observações pega o resto do espaço
        },
        didParseCell: function(data) {
            // Pinta o texto da coluna de "Status" de verde ou vermelho automaticamente
            if (data.section === 'body' && data.column.index === 4) {
                if (data.cell.raw === 'COM ATRASO') {
                    data.cell.styles.textColor = [231, 76, 60]; // Vermelho
                } else {
                    data.cell.styles.textColor = [39, 174, 96]; // Verde
                }
            }
        }
    });

    // 4. Salvar o Arquivo
    doc.save(`Relatorio_Encerrados_${dataHoje.replace(/\//g, '-')}.pdf`);

    // Restaura o botão
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
};

setTimeout(buscarEmprestimos, 0);
})();
