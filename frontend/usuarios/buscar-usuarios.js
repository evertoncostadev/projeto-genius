// Em: frontend/usuarios/buscar-usuarios.js

let userListContainer;
let paginationContainer;
let todosUsuarios = [];
let usuariosFiltrados = [];
let paginaAtual = 1;
const itensPorPagina = 10;

function renderizarUsuarios(usuariosParaRenderizar) {
    userListContainer = document.querySelector('.user-list-container');
    if (!userListContainer) return; 
    
    userListContainer.innerHTML = '';
    
    if (usuariosParaRenderizar.length === 0) {
        userListContainer.innerHTML = '<p>Nenhum usuário encontrado para estes filtros.</p>';
        return;
    }

    usuariosParaRenderizar.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.setAttribute('data-id', user.id);
        
        const iconeOlho = user.ativo === false ? 'fa-eye' : 'fa-eye-slash';
        const tituloOlho = user.ativo === false ? 'Ativar' : 'Desativar';
        
        if (user.ativo === false) {
            card.classList.add('desativado');
        }

        card.innerHTML = `
            <div class="user-info">
                <i class="fas fa-user-circle avatar"></i>
                <span class="user-name">${user.nome}</span>
            </div>
            <div class="user-actions">
                <button class="action-btn deactivate" title="${tituloOlho}" data-action="deactivate">
                    <i class="fas ${iconeOlho}"></i>
                </button>
                <button class="action-btn edit" title="Editar" data-action="edit">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="action-btn delete" title="Excluir" data-action="delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        userListContainer.appendChild(card);
    });
}

function renderizarPaginacao(totalItens) {
    paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return; 

    paginationContainer.innerHTML = '';
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    if (totalPaginas <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.disabled = (paginaAtual === 1);
    prevButton.addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            atualizarPagina();
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPaginas; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i === paginaAtual) pageLink.classList.add('active');
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            paginaAtual = i;
            atualizarPagina();
        });
        paginationContainer.appendChild(pageLink);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próximo';
    nextButton.disabled = (paginaAtual === totalPaginas);
    nextButton.addEventListener('click', () => {
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            atualizarPagina();
        }
    });
    paginationContainer.appendChild(nextButton);
}

function atualizarPagina() {
    const startIndex = (paginaAtual - 1) * itensPorPagina;
    const endIndex = startIndex + itensPorPagina;
    const usuariosDaPagina = usuariosFiltrados.slice(startIndex, endIndex);
    renderizarUsuarios(usuariosDaPagina);
    renderizarPaginacao(usuariosFiltrados.length);
}

async function buscarUsuarios() {
    const token = localStorage.getItem('token');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

    if (!token) {
        showAlert('Erro de Autenticação', 'Você não está autenticado.', 'error');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/usuarios', {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-cache' 
        });
        
        if (response.status === 401 || response.status === 403) throw new Error('Token inválido ou expirado.');
        if (!response.ok) throw new Error('Falha na rede ao buscar usuários.');

        const usuarios = await response.json();
        todosUsuarios = usuarios; 
        
        aplicarFiltros(); 
        adicionarListenersFiltro();
        adicionarListenersAcoes();
        
    } catch (error) {
        console.error('Erro:', error);
        userListContainer = document.querySelector('.user-list-container');
        let errorMsg = 'Erro ao carregar usuários.';
        if (error.message.includes('Token')) errorMsg = 'Sua sessão expirou. Por favor, faça login novamente.';
        if (userListContainer) userListContainer.innerHTML = `<p>${errorMsg}</p>`;
    }
}

function aplicarFiltros() {
    const filtroNomeEl = document.getElementById('filtro-nome');
    const filtroCpfEl = document.getElementById('filtro-cpf');
    const filtroCursoEl = document.getElementById('filtro-curso');
    const filtroPeriodoEl = document.getElementById('filtro-periodo');

    const termoNome = filtroNomeEl ? filtroNomeEl.value.toLowerCase() : '';
    const termoCpf = filtroCpfEl ? filtroCpfEl.value.replace(/\D/g, '') : '';
    const termoCurso = filtroCursoEl ? filtroCursoEl.value : '';
    const termoPeriodo = filtroPeriodoEl ? filtroPeriodoEl.value : '';

    usuariosFiltrados = todosUsuarios.filter(user => {
        const matchNome = (user.nome || '').toLowerCase().includes(termoNome);
        const matchCpf = (user.cpf || '').includes(termoCpf);
        const matchCurso = (termoCurso === "" || user.curso === termoCurso);
        const matchPeriodo = (termoPeriodo === "" || user.periodo === termoPeriodo);
        return matchNome && matchCpf && matchCurso && matchPeriodo;
    });

    paginaAtual = 1; 
    atualizarPagina(); 
}

function adicionarListenersFiltro() {
    const filtroNome = document.getElementById('filtro-nome');
    const filtroCpf = document.getElementById('filtro-cpf');
    const filtroCurso = document.getElementById('filtro-curso');
    const filtroPeriodo = document.getElementById('filtro-periodo');
    const btnBuscar = document.getElementById('btn-buscar');

    if (filtroCpf) {
        filtroCpf.addEventListener('input', (e) => {
            if (typeof formatarCPF === 'function') {
                e.target.value = formatarCPF(e.target.value);
            } else {
                console.warn('formatarCPF() não encontrada. Carregando fallback.');
                e.target.value = e.target.value.replace(/\D/g, ''); 
            }
            aplicarFiltros(); 
        });
    }

    if (btnBuscar) {
        btnBuscar.addEventListener('click', (e) => {
            e.preventDefault(); 
            aplicarFiltros();
        });
    }
    if (filtroNome) filtroNome.addEventListener('input', aplicarFiltros);
    if (filtroCurso) filtroCurso.addEventListener('change', aplicarFiltros);
    if (filtroPeriodo) filtroPeriodo.addEventListener('change', aplicarFiltros);

    if (filtroNome) filtroNome.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltros();} });
    if (filtroCpf) filtroCpf.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltros();} });
}

function adicionarListenersAcoes() {
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    
    userListContainer = document.querySelector('.user-list-container');
    if (userListContainer) {
        userListContainer.addEventListener('click', async (e) => {
            const actionButton = e.target.closest('.action-btn');
            if (!actionButton) return;

            const card = actionButton.closest('.user-card');
            const userId = card.dataset.id;
            const userName = card.querySelector('.user-name').textContent;
            const action = actionButton.dataset.action;
            const token = localStorage.getItem('token');

            if (!token) { showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error'); return; }

            if (action === 'edit') {
                window.location.hash = `#usuarios_editar/${userId}`;
            } 
            else if (action === 'delete') {
                const confirmed = typeof showCustomConfirm === 'function' 
                    ? await showCustomConfirm('Excluir Usuário', `Tem certeza que deseja EXCLUIR ${userName}?`)
                    : confirm(`Tem certeza que deseja EXCLUIR ${userName}?`);
                
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/usuarios/${userId}`, {
                            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        
                        showAlert('Sucesso!', result.message, 'success');
                        todosUsuarios = todosUsuarios.filter(u => u.id !== parseInt(userId));
                        aplicarFiltros(); 
                    } catch (error) { 
                        showAlert('Erro ao Excluir', error.message, 'error');
                    }
                }
            } 
            else if (action === 'deactivate') {
                const icone = actionButton.querySelector('i');
                const statusAtual = icone.classList.contains('fa-eye-slash') ? 'desativar' : 'ativar';
                
                const confirmed = typeof showCustomConfirm === 'function'
                    ? await showCustomConfirm('Alterar Status', `Tem certeza que deseja ${statusAtual} ${userName}?`)
                    : confirm(`Tem certeza que deseja ${statusAtual} ${userName}?`);
                
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/usuarios/${userId}/status`, {
                            method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        
                        showAlert('Sucesso!', result.message, 'success'); 
                        const usuarioAtualizado = result.usuario;
                        
                        const indexBD = todosUsuarios.findIndex(u => u.id === usuarioAtualizado.id);
                        if(indexBD !== -1) todosUsuarios[indexBD] = usuarioAtualizado;

                        card.classList.toggle('desativado', usuarioAtualizado.ativo === false);

                        if (usuarioAtualizado.ativo === false) {
                            actionButton.title = 'Ativar';
                            icone.classList.remove('fa-eye-slash');
                            icone.classList.add('fa-eye');
                        } else {
                            actionButton.title = 'Desativar';
                            icone.classList.remove('fa-eye');
                            icone.classList.add('fa-eye-slash');
                        }
                    } catch (error) { 
                        showAlert('Erro ao Alterar Status', error.message, 'error'); 
                    }
                }
            }
        });
    }
}

setTimeout(buscarUsuarios, 0);