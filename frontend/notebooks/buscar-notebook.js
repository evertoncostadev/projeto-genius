// Em: frontend/notebooks/buscar-notebook.js


let notebookListContainer;
let paginationContainer;
let todosNotebooks = [];
let notebooksFiltrados = [];
let paginaAtualNote = 1;
const itensPorPaginaNote = 10; 
let debounceTimerNote; 

function renderizarNotebooks(notebooks) {
    notebookListContainer = document.querySelector('.notebook-list-container');
    if (!notebookListContainer) return;

    notebookListContainer.innerHTML = '';
    
    if (notebooks.length === 0) {
        notebookListContainer.innerHTML = '<p>Nenhum notebook encontrado para estes filtros.</p>';
        return;
    }

    notebooks.forEach(notebook => {
        const card = document.createElement('div');
        card.className = 'notebook-card';
        card.setAttribute('data-id', notebook.id);
        
        let iconeStatus = 'fa-eye-slash'; 
        let tituloStatus = 'Desativar';
        let estaEmprestado = false;

        if (notebook.status === 'desativado') {
            card.classList.add('desativado');
            iconeStatus = 'fa-eye'; 
            tituloStatus = 'Ativar';
        } else if (notebook.status === 'emprestado') {
            card.classList.add('emprestado');
            iconeStatus = 'fa-lock'; 
            tituloStatus = 'Notebook emprestado';
            estaEmprestado = true; 
        }

        card.innerHTML = `
            <div class="notebook-info">
                <i class="fas fa-laptop icon"></i>
                <span class="tombamento">${notebook.tombamento}</span>
            </div>
            <div class="notebook-actions">
                <button class="action-btn deactivate" title="${tituloStatus}" data-action="deactivate" ${estaEmprestado ? 'disabled' : ''}>
                    <i class="fas ${iconeStatus}"></i>
                </button>
                <button class="action-btn edit" title="Editar" data-action="edit" ${estaEmprestado ? 'disabled' : ''}>
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="action-btn delete" title="Excluir" data-action="delete" ${estaEmprestado ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        notebookListContainer.appendChild(card);
    });
}

function renderizarPaginacaoNote(totalItens) {
    paginationContainer = document.getElementById('pagination-container-note');
    if (!paginationContainer) return; 

    paginationContainer.innerHTML = '';
    const totalPaginas = Math.ceil(totalItens / itensPorPaginaNote);
    if (totalPaginas <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.disabled = (paginaAtualNote === 1);
    prevButton.addEventListener('click', () => {
        if (paginaAtualNote > 1) {
            paginaAtualNote--;
            atualizarPaginaNote();
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPaginas; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i === paginaAtualNote) pageLink.classList.add('active');
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            paginaAtualNote = i;
            atualizarPaginaNote();
        });
        paginationContainer.appendChild(pageLink);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Próximo';
    nextButton.disabled = (paginaAtualNote === totalPaginas);
    nextButton.addEventListener('click', () => {
        if (paginaAtualNote < totalPaginas) {
            paginaAtualNote++;
            atualizarPaginaNote();
        }
    });
    paginationContainer.appendChild(nextButton);
}

function atualizarPaginaNote() {
    const startIndex = (paginaAtualNote - 1) * itensPorPaginaNote;
    const endIndex = startIndex + itensPorPaginaNote;
    const notebooksDaPagina = notebooksFiltrados.slice(startIndex, endIndex);
    renderizarNotebooks(notebooksDaPagina);
    renderizarPaginacaoNote(notebooksFiltrados.length);
}

async function buscarNotebooks() {
    const token = localStorage.getItem('token');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

    if (!token) {
        showAlert('Erro de Autenticação', 'Você não está autenticado.', 'error');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/notebooks', {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-cache' 
        });
        
        if (response.status === 401 || response.status === 403) throw new Error('Token inválido ou expirado.');
        if (!response.ok) throw new Error('Falha na rede ao buscar notebooks.');

        const notebooks = await response.json();
        todosNotebooks = notebooks; 
        
        aplicarFiltrosNotebook(); 
        adicionarListenersFiltroNote();
        adicionarListenersAcoesNote();
        
    } catch (error) {
        console.error('Erro:', error);
        notebookListContainer = document.querySelector('.notebook-list-container');
        let errorMsg = 'Erro ao carregar notebooks.';
        if (error.message.includes('Token')) errorMsg = 'Sessão expirada. Faça login novamente.';
        if (notebookListContainer) notebookListContainer.innerHTML = `<p>${errorMsg}</p>`;
    }
}

function aplicarFiltrosNotebook() {
    const filtroTombamento = document.getElementById('filtro-tombamento');
    const filtroSerie = document.getElementById('filtro-serie');
    const filtroMarca = document.getElementById('filtro-marca');
    const filtroModelo = document.getElementById('filtro-modelo');

    const termoTombamento = filtroTombamento ? filtroTombamento.value.toLowerCase() : '';
    const termoSerie = filtroSerie ? filtroSerie.value.toLowerCase() : '';
    const termoMarca = filtroMarca ? filtroMarca.value : '';
    const termoModelo = filtroModelo ? filtroModelo.value.toLowerCase() : '';

    notebooksFiltrados = todosNotebooks.filter(note => {
        const matchTombamento = (note.tombamento || '').toLowerCase().includes(termoTombamento);
        const matchSerie = (note.numero_serie || '').toLowerCase().includes(termoSerie);
        const matchMarca = (termoMarca === "" || note.marca === termoMarca);
        const matchModelo = (note.modelo || '').toLowerCase().includes(termoModelo);
        return matchTombamento && matchSerie && matchMarca && matchModelo;
    });
    
    paginaAtualNote = 1;
    atualizarPaginaNote();
}

function adicionarListenersFiltroNote() {
    const debouncedAplicarFiltros = () => {
        clearTimeout(debounceTimerNote);
        debounceTimerNote = setTimeout(() => {
            aplicarFiltrosNotebook();
        }, 300);
    };

    const filtroTombamento = document.getElementById('filtro-tombamento');
    const filtroSerie = document.getElementById('filtro-serie');
    const filtroMarca = document.getElementById('filtro-marca');
    const filtroModelo = document.getElementById('filtro-modelo');
    const btnBuscar = document.getElementById('btn-buscar-notebook');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', (e) => {
            e.preventDefault(); 
            aplicarFiltrosNotebook(); 
        });
    }

    if (filtroTombamento) filtroTombamento.addEventListener('input', debouncedAplicarFiltros);
    if (filtroSerie) filtroSerie.addEventListener('input', debouncedAplicarFiltros);
    if (filtroModelo) filtroModelo.addEventListener('input', debouncedAplicarFiltros);
    
    if (filtroMarca) filtroMarca.addEventListener('change', aplicarFiltrosNotebook);

    if (filtroTombamento) filtroTombamento.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltrosNotebook();} });
    if (filtroSerie) filtroSerie.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltrosNotebook();} });
    if (filtroModelo) filtroModelo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarFiltrosNotebook();} });
}


function adicionarListenersAcoesNote() {
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    const showConfirm = typeof showCustomConfirm === 'function' ? showCustomConfirm : confirm;

    notebookListContainer = document.querySelector('.notebook-list-container');
    if (notebookListContainer) {
        notebookListContainer.addEventListener('click', async (e) => {
            const actionButton = e.target.closest('.action-btn');
            if (!actionButton) return;

            const card = actionButton.closest('.notebook-card');
            const notebookId = card.dataset.id;
            const tombamento = card.querySelector('.tombamento').textContent;
            const action = actionButton.dataset.action;
            const token = localStorage.getItem('token');

            if (!token) { showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error'); return; }

            if (action === 'edit') {
                window.location.hash = `#notebooks_editar/${notebookId}`;
            } 
            else if (action === 'delete') {
                const confirmed = await showConfirm('Excluir Notebook', `Tem certeza que deseja EXCLUIR o notebook ${tombamento}?`);
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/notebooks/${notebookId}`, {
                            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        
                        showAlert('Sucesso!', result.message, 'success'); 
                        todosNotebooks = todosNotebooks.filter(n => n.id !== parseInt(notebookId));
                        aplicarFiltrosNotebook();
                    } catch (error) { 
                        showAlert('Erro ao Excluir', error.message, 'error'); 
                    }
                }
            } 
            else if (action === 'deactivate') {
                const icone = actionButton.querySelector('i');
                const statusAtual = icone.classList.contains('fa-eye-slash') ? 'desativar' : 'ativar';

                const confirmed = await showConfirm('Alterar Status', `Tem certeza que deseja ${statusAtual} o notebook ${tombamento}?`);
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/notebooks/${notebookId}/status`, {
                            method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        
                        showAlert('Sucesso!', result.message, 'success'); 
                        const notebook = result.notebook;
                        
                        const indexBD = todosNotebooks.findIndex(n => n.id === notebook.id);
                        if(indexBD !== -1) todosNotebooks[indexBD] = notebook;

                        card.classList.toggle('desativado', notebook.status === 'desativado');

                        if (notebook.status === 'desativado') {
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

setTimeout(buscarNotebooks, 0);