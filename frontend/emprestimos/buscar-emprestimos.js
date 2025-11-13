// Em: frontend/emprestimos/buscar-emprestimos.js


let loanListContainer;
let tituloPagina;
let todosEmprestimos = [];
let emprestimosFiltrados = [];
let statusDaPagina = 'ativo';
let debounceTimerEmp; 

let paginaAtualEmp = 1;
let itensPorPaginaEmp = 10; 
let paginationContainer;

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

        if (statusDaPagina === 'ativo') {
            const dataDev = new Date(emp.dataDevolucaoPrevista).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const agora = new Date();
            const dataDevolucaoPrevista = new Date(emp.dataDevolucaoPrevista);
            const estaAtrasado = dataDevolucaoPrevista < agora;
            
            if (estaAtrasado) {
                card.classList.add('atrasado-card'); 
            }

            const badgeHTML = estaAtrasado ? '<span class="status-badge atrasado">ATRASAADO</span>' : '<span class="status-badge em-dia">Em Dia</span>';

            card.innerHTML = `
                <div class="loan-info">
                    <div class="user-info">
                        <i class="fas fa-user"></i>
                        <span>${emp.usuario.nome} (CPF: ${emp.usuario.cpf})</span>
                    </div>
                    <div class="notebook-info">
                        <i class="fas fa-laptop"></i>
                        <span>${emp.notebook.tombamento} (${emp.notebook.modelo})</span>
                    </div>
                    <div class="dates-info">
                        <strong>Emprestado em:</strong> ${dataEmp} | <strong>Devolução Prevista:</strong> ${dataDev}
                        ${badgeHTML}
                    </div>
                </div>
                <div class="loan-actions">
                    <button class="action-btn encerrar" title="Dar Baixa (Encerrar)" data-action="encerrar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn delete" title="Excluir Empréstimo" data-action="delete">
                        <i class="fas fa-trash"></i>
                    </button>
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

            card.innerHTML = `
                <div class="loan-info">
                    <div class="user-info">
                        <i class="fas fa-user"></i>
                        <span>${emp.usuario.nome} (CPF: ${emp.usuario.cpf})</span>
                    </div>
                    <div class="notebook-info">
                        <i class="fas fa-laptop"></i>
                        <span>${emp.notebook.tombamento} (${emp.notebook.modelo})</span>
                    </div>
                    
                    <div class="dates-info">
                        <strong>Emprestado em:</strong> ${dataEmp} | <strong>Devolvido em:</strong> ${dataDevReal}
                        ${badgeHTML}
                    </div>
                    
                    <div class="obs-info">
                        <p><strong>Obs. Retirada:</strong> ${emp.observacoes || 'Nenhuma.'}</p>
                        <p><strong>Obs. Devolução:</strong> ${emp.observacoesDevolucao || 'Nenhuma.'}</p>
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
    if (statusDaPagina === 'encerrado') {
        itensPorPaginaEmp = 6; 
        if (loanListContainer) loanListContainer.classList.add('grid-view-encerrado'); 
    } else {
        itensPorPaginaEmp = 10; 
        if (loanListContainer) loanListContainer.classList.remove('grid-view-encerrado');
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
        
        const filtroStatusEl = document.getElementById('filtro-status');
        if (filtroStatusEl && statusDaPagina === 'encerrado') {
            const parentGroup = filtroStatusEl.closest('.filter-group');
            if (parentGroup) {
                parentGroup.style.display = 'none';
            }
        }
        
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
            <div class="modal-info"><p>Confirme a devolução do notebook <strong>${notebookTombamento}</strong> pelo usuário <strong>${userName}</strong>.</p></div>
            
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
        loanListContainer.addEventListener('click', async (e) => {
            const actionButton = e.target.closest('.action-btn');
            if (!actionButton) return;

            if (typeof showCustomConfirm !== 'function') {
                console.error('showCustomConfirm() não foi encontrada. Verifique o dashboard.js');
                showAlert('Erro Crítico', 'A função de confirmação não foi carregada.', 'error');
                return;
            }

            const card = actionButton.closest('.loan-card');
            const emprestimoId = card.dataset.id;
            const userName = card.querySelector('.user-info span').textContent.split(' (')[0];
            const notebookTombamento = card.querySelector('.notebook-info span').textContent.split(' (')[0];
            const action = actionButton.dataset.action;
            const token = localStorage.getItem('token'); 

            if (action === 'encerrar') {
                encerrarEmprestimo(card, emprestimoId, userName, notebookTombamento);
            } 
            else if (action === 'delete') {
                if (!token) { showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error'); return; }
                
                const confirmed = await showCustomConfirm('Excluir Empréstimo', `Tem certeza que deseja EXCLUIR o empréstimo do notebook ${notebookTombamento} para ${userName}?\n\nATENÇÃO: Isso NÃO conta como devolução.`);
                
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

    const termoUsuario = filtroUsuario ? filtroUsuario.value.toLowerCase() : '';
    const termoNotebook = filtroNotebook ? filtroNotebook.value.toLowerCase() : '';
    const statusFiltro = (filtroStatusEl && statusDaPagina === 'ativo') ? filtroStatusEl.value : 'todos'; 

    const agora = new Date(); 

    emprestimosFiltrados = todosEmprestimos.filter(emp => {
        const matchUsuario = (emp.usuario.nome.toLowerCase().includes(termoUsuario) || 
                                emp.usuario.cpf.toLowerCase().includes(termoUsuario));
        const matchNotebook = emp.notebook.tombamento.toLowerCase().includes(termoNotebook);

        let matchStatus = true; 
        if (statusFiltro === 'atrasados') {
            const dataDevolucao = new Date(emp.dataDevolucaoPrevista);
            matchStatus = dataDevolucao < agora; 
        } else if (statusFiltro === 'em_dia') {
            const dataDevolucao = new Date(emp.dataDevolucaoPrevista);
            matchStatus = dataDevolucao >= agora; 
        }

        return matchUsuario && matchNotebook && matchStatus;
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
}


setTimeout(buscarEmprestimos, 0);