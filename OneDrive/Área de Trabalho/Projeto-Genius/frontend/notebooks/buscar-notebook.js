// Em: frontend/notebooks/buscar-notebook.js

(() => {
let notebookListContainer;
let paginationContainer;
let todosNotebooks = [];
let notebooksFiltrados = [];
let paginaAtualNote = 1;
const itensPorPaginaNote = 10; 
let debounceTimerNote; 

let notebookAtualModal = null;
let historicoAtualNoteModal = [];

function escaparHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[match]));
}

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
            <div class="notebook-info" style="cursor: pointer;">
                <i class="fas fa-laptop icon"></i>
                <span class="tombamento">${notebook.tombamento}</span>
            </div>
            <div class="notebook-actions">
                <button class="action-btn deactivate" title="${tituloStatus}" data-action="deactivate" ${estaEmprestado ? 'disabled' : ''}>
                    <i class="fas ${iconeStatus}"></i>
                </button>
                <button class="action-btn edit" title="Ver Informações / Editar" data-action="edit">
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
        if (paginaAtualNote > 1) { paginaAtualNote--; atualizarPaginaNote(); }
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
        if (paginaAtualNote < totalPaginas) { paginaAtualNote++; atualizarPaginaNote(); }
    });
    paginationContainer.appendChild(nextButton);
}

function atualizarPaginaNote() {
    const startIndex = (paginaAtualNote - 1) * itensPorPaginaNote;
    const endIndex = startIndex + itensPorPaginaNote;
    renderizarNotebooks(notebooksFiltrados.slice(startIndex, endIndex));
    renderizarPaginacaoNote(notebooksFiltrados.length);
}

async function buscarNotebooks() {
    const token = localStorage.getItem('token');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

    if (!token) return;
    try {
        const response = await fetch('http://localhost:3000/notebooks', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Falha na rede ao buscar notebooks.');

        todosNotebooks = await response.json(); 
        aplicarFiltrosNotebook(); 
        adicionarListenersFiltroNote();
        adicionarListenersAcoesNote();
    } catch (error) {
        console.error('Erro:', error);
    }
}

function aplicarFiltrosNotebook() {
    const termoTombamento = document.getElementById('filtro-tombamento')?.value.toLowerCase() || '';
    const termoSerie = document.getElementById('filtro-serie')?.value.toLowerCase() || '';

    notebooksFiltrados = todosNotebooks.filter(note => {
        return (note.tombamento || '').toLowerCase().includes(termoTombamento) &&
               (note.numero_serie || '').toLowerCase().includes(termoSerie);
    });
    
    paginaAtualNote = 1;
    atualizarPaginaNote();
}

function adicionarListenersFiltroNote() {
    const debounced = () => { clearTimeout(debounceTimerNote); debounceTimerNote = setTimeout(aplicarFiltrosNotebook, 300); };
    document.getElementById('filtro-tombamento')?.addEventListener('input', debounced);
    document.getElementById('filtro-serie')?.addEventListener('input', debounced);
    document.getElementById('btn-buscar-notebook')?.addEventListener('click', (e) => { e.preventDefault(); aplicarFiltrosNotebook(); });
}

function adicionarListenersAcoesNote() {
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    const showConfirm = typeof showCustomConfirm === 'function' ? showCustomConfirm : async (t, m) => confirm(m);

    notebookListContainer = document.querySelector('.notebook-list-container');
    if (notebookListContainer) {
        
        // Remove listeners antigos criando um clone
        const clone = notebookListContainer.cloneNode(true);
        notebookListContainer.parentNode.replaceChild(clone, notebookListContainer);
        notebookListContainer = clone;

        notebookListContainer.addEventListener('click', async (e) => {
            const card = e.target.closest('.notebook-card');
            if (!card) return;
            const notebookId = card.dataset.id;
            const tombamento = card.querySelector('.tombamento').textContent;
            const actionButton = e.target.closest('.action-btn');
            const token = localStorage.getItem('token');

            // Clicar fora dos botões (na área da info) OU clicar em Editar abre o Modal
            if (!actionButton || actionButton.dataset.action === 'edit') {
                abrirModalNotebook(notebookId);
                return;
            }

            const action = actionButton.dataset.action;

            if (action === 'delete') {
                const confirmed = await showConfirm('Excluir Notebook', `Deseja EXCLUIR o notebook ${tombamento}?`);
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/notebooks/${notebookId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
                        if (!response.ok) throw new Error((await response.json()).message);
                        showAlert('Sucesso!', 'Notebook excluído.', 'success'); 
                        buscarNotebooks();
                    } catch (error) { showAlert('Erro', error.message, 'error'); }
                }
            } 
            else if (action === 'deactivate') {
                const confirmed = await showConfirm('Alterar Status', `Deseja alterar o status do notebook ${tombamento}?`);
                if (confirmed) {
                    try {
                        const response = await fetch(`http://localhost:3000/notebooks/${notebookId}/status`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }});
                        if (!response.ok) throw new Error((await response.json()).message);
                        showAlert('Sucesso!', 'Status atualizado.', 'success'); 
                        buscarNotebooks();
                    } catch (error) { showAlert('Erro', error.message, 'error'); }
                }
            }
        });
    }
}

// =============================================
// LÓGICA DO MODAL DO NOTEBOOK
// =============================================

async function abrirModalNotebook(id) {
    const token = localStorage.getItem('token');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
    try {
        const res = await fetch(`http://localhost:3000/api/notebooks/${id}/historico`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        notebookAtualModal = data.notebook;
        historicoAtualNoteModal = data.historico;
        
        preencherModalNotebook(data);
        document.getElementById('modal-notebook').style.display = 'flex';
    } catch (e) { showAlert("Erro", "Falha ao carregar os dados do equipamento.", "error"); }
}

function preencherModalNotebook({ notebook, ativo, historico }) {
    document.getElementById('modal-tombamento-titulo').textContent = `Tombamento: ${notebook.tombamento}`;
    
    const alerta = document.getElementById('alerta-emprestimo-note');
    if (ativo) {
        alerta.innerHTML = `⚠️ Equipamento atualmente emprestado para: <strong>${escaparHTML(ativo.nome_aluno)}</strong> (Matrícula: ${escaparHTML(ativo.matricula)}).`;
        alerta.style.display = 'block';
    } else { alerta.style.display = 'none'; }

    // Preenche o formulário de edição
    document.getElementById('edit-note-id').value = notebook.id;
    document.getElementById('edit-note-tombamento').value = notebook.tombamento || '';
    document.getElementById('edit-note-serie').value = notebook.numero_serie || '';
    document.getElementById('edit-note-modelo').value = notebook.modelo || '';

    document.getElementById('btn-salvar-note').style.display = 'none';
    
    // Reseta abas e filtros
    document.querySelector('.tab-btn-note[data-target="tab-dados-note"]').click();
    document.getElementById('filtro-dia-hist-note').value = 'todos';
    document.getElementById('filtro-mes-hist-note').value = 'todos';
    document.getElementById('filtro-ano-hist-note').value = 'todos';

    renderizarHistoricoNote(historico);
}

// Controle de Abas
document.querySelectorAll('.tab-btn-note').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn-note').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content-note').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).style.display = 'block';

        const textoBtn = document.getElementById('texto-btn-pdf-note');
        if (textoBtn) {
            textoBtn.innerText = btn.dataset.target === 'tab-dados-note' ? 'Baixar Dados' : 'Baixar Histórico';
        }
    };
});

// Salvamento da edição do Notebook
const formEdicaoNote = document.getElementById('form-edicao-note');
formEdicaoNote.addEventListener('input', () => { document.getElementById('btn-salvar-note').style.display = 'inline-block'; });

formEdicaoNote.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('edit-note-id').value;
    const btnSalvar = document.getElementById('btn-salvar-note');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

    btnSalvar.textContent = 'Salvando...'; btnSalvar.disabled = true;

    const bodyData = {
        tombamento: document.getElementById('edit-note-tombamento').value,
        numero_serie: document.getElementById('edit-note-serie').value,
        modelo: document.getElementById('edit-note-modelo').value
    };

    try {
        const res = await fetch(`http://localhost:3000/notebooks/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (!res.ok) throw new Error((await res.json()).message || 'Erro ao salvar');
        
        showAlert('Sucesso!', 'Notebook atualizado com sucesso!', 'success');
        btnSalvar.style.display = 'none';
        document.getElementById('modal-tombamento-titulo').textContent = `Tombamento: ${bodyData.tombamento}`;
        buscarNotebooks();
    } catch (error) { 
        showAlert('Erro', error.message, 'error'); 
    } finally {
        btnSalvar.textContent = 'Salvar Alterações'; btnSalvar.disabled = false;
    }
});

// Renderização do Histórico e Filtros
// Renderização do Histórico e Filtros
function renderizarHistoricoNote(lista) {
    const container = document.getElementById('lista-historico-note');
    container.innerHTML = '';
    if(lista.length === 0) {
        container.innerHTML = '<p style="color:#666;">Nenhum empréstimo registrado com esta data.</p>'; return;
    }
    lista.sort((a, b) => b.id - a.id);
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    lista.forEach(emp => {
        const dEmp = new Date(emp.data_emprestimo);
        const dReal = new Date(emp.data_devolucao_real);
        const dPrev = new Date(emp.data_devolucao_prevista); // Puxando o prazo limite do banco
        
        const agora = new Date();
        if (dReal > agora) dReal.setHours(dReal.getHours() - 3);
        if (dEmp > agora) dEmp.setHours(dEmp.getHours() - 3);

        // Lógica que calcula se houve atraso (com 15 min de tolerância)
        let dPrevTolerancia = new Date(dPrev.getTime());
        dPrevTolerancia.setMinutes(dPrevTolerancia.getMinutes() + 15);
        const noPrazo = dReal <= dPrevTolerancia;

        const dia = String(dEmp.getDate()).padStart(2, '0');
        const mes = meses[dEmp.getMonth()];
        const ano = dEmp.getFullYear();

        const dataEmpStr = dEmp.toLocaleDateString('pt-BR');
        const horaEmpStr = dEmp.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        const dataRealStr = dReal.toLocaleDateString('pt-BR');
        const horaRealStr = dReal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        const dataPrevStr = dPrev.toLocaleDateString('pt-BR');
        const horaPrevStr = dPrev.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        // Define a cor da borda lateral do card dinamicamente
        const corBorda = noPrazo ? '#22c55e' : '#ef4444';

        container.innerHTML += `
            <div class="hist-card" style="border-left: 5px solid ${corBorda};">
                <div class="hist-date">
                    <span class="mes">${mes}</span>
                    <span class="dia">${dia}</span>
                    <span class="ano">${ano}</span>
                </div>
                <div class="hist-details">
                    <h4 style="margin-bottom: 10px;">👤 ${escaparHTML(emp.nome_aluno)} <span style="font-size:0.8rem; font-weight:normal;">(Matrícula: ${escaparHTML(emp.matricula)})</span></h4>
                    
                    <div style="font-size: 0.9rem; color: #475569; margin-bottom: 10px;">
                        <p style="margin: 3px 0;" class="hist-info-line"><span class="status-dot dot-retirado"></span> <strong>Retirado em:</strong> ${dataEmpStr} às ${horaEmpStr}</p>
                        <p style="margin: 3px 0;" class="hist-info-line"><span class="status-dot dot-devolvido"></span> <strong>Devolvido em:</strong> ${dataRealStr} às ${horaRealStr}</p>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin: 3px 0;" class="hist-prazo"><em>Prazo limite: ${dataPrevStr} às ${horaPrevStr}</em></p>
                    </div>

                    <p class="hist-status" style="font-size: 0.85rem; font-weight: bold; color: ${noPrazo?'#22c55e':'#ef4444'}; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 10px;">
                        ${noPrazo ? '✔ Devolvido No Prazo' : '✖ Devolvido com Atraso'} | <span style="color:#94a3b8; font-weight:normal;" class="obs-text">Obs: ${escaparHTML(emp.observacoes_devolucao || 'Nenhuma')}</span>
                    </p>
                </div>
            </div>
        `;
    });
}

function filtrarHistoricoNoteLocal() {
    const diaFiltro = document.getElementById('filtro-dia-hist-note').value;
    const mesFiltro = document.getElementById('filtro-mes-hist-note').value;
    const anoFiltro = document.getElementById('filtro-ano-hist-note').value;

    const filtrados = historicoAtualNoteModal.filter(emp => {
        const dEmp = new Date(emp.data_emprestimo);
        if (dEmp > new Date()) dEmp.setHours(dEmp.getHours() - 3);

        const dia = String(dEmp.getDate()).padStart(2, '0');
        const mes = String(dEmp.getMonth() + 1).padStart(2, '0');
        const ano = String(dEmp.getFullYear());

        return (diaFiltro === 'todos' || dia === diaFiltro) &&
               (mesFiltro === 'todos' || mes === mesFiltro) &&
               (anoFiltro === 'todos' || ano === anoFiltro);
    });
    renderizarHistoricoNote(filtrados);
}

document.getElementById('filtro-dia-hist-note').addEventListener('change', filtrarHistoricoNoteLocal);
document.getElementById('filtro-mes-hist-note').addEventListener('change', filtrarHistoricoNoteLocal);
document.getElementById('filtro-ano-hist-note').addEventListener('change', filtrarHistoricoNoteLocal);

// Exportação PDF
document.getElementById('btn-fechar-notebook').onclick = () => document.getElementById('modal-notebook').style.display = 'none';

document.getElementById('btn-baixar-pdf-note').onclick = () => {
    const textoAtual = document.getElementById('texto-btn-pdf-note').innerText;
    const tombamento = document.getElementById('modal-tombamento-titulo').textContent.replace('Tombamento: ', '').trim();
    
    let elementoAlvo = textoAtual === 'Baixar Dados' ? document.getElementById('tab-dados-note') : document.getElementById('tab-historico-note');
    let nomeArquivo = textoAtual === 'Baixar Dados' ? `Dados_${tombamento}_Genius.pdf` : `Historico_${tombamento}_Genius.pdf`;
    
    const opcoes = {
        margin: 10, filename: nomeArquivo,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: textoAtual === 'Baixar Histórico' ? 'landscape' : 'portrait' }
    };
    html2pdf().set(opcoes).from(elementoAlvo).save();
};

setTimeout(buscarNotebooks, 0);
})();
