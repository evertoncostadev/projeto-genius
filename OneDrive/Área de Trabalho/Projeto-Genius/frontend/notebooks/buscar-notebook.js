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
let historicoFiltradoNoteModal = [];

// Variáveis para a paginação dentro do Modal
let paginaAtualHistNote = 1;
const itensPorPaginaHistNote = 5; // Quantidade de itens por página no histórico

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

    document.getElementById('edit-note-id').value = notebook.id;
    document.getElementById('edit-note-tombamento').value = notebook.tombamento || '';
    document.getElementById('edit-note-serie').value = notebook.numero_serie || '';
    document.getElementById('edit-note-modelo').value = notebook.modelo || '';

    document.getElementById('btn-salvar-note').style.display = 'none';
    
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    document.getElementById('filtro-usuario-hist').value = '';
    document.getElementById('filtro-data-inicio-hist').value = primeiroDia.toISOString().split('T')[0];
    document.getElementById('filtro-data-fim-hist').value = hoje.toISOString().split('T')[0];

    document.querySelector('.tab-btn-note[data-target="tab-dados-note"]').click();

    paginaAtualHistNote = 1; // Reseta a paginação ao abrir
    filtrarHistoricoNoteLocal(); 
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

// =============================================
// FILTRO E PAGINAÇÃO DO HISTÓRICO (MODAL)
// =============================================
function renderizarHistoricoNote(lista) {
    const container = document.getElementById('lista-historico-note');
    container.innerHTML = '';
    if(lista.length === 0) {
        container.innerHTML = '<p style="color:#666; margin-top: 15px;">Nenhum empréstimo registrado para este período.</p>'; 
        return;
    }
    
    // Sort para os mais recentes primeiro
    lista.sort((a, b) => b.id - a.id);
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    lista.forEach(emp => {
        const dEmp = new Date(emp.data_emprestimo);
        const dReal = new Date(emp.data_devolucao_real);
        const dPrev = new Date(emp.data_devolucao_prevista); 
        
        const agora = new Date();
        if (dReal > agora) dReal.setHours(dReal.getHours() - 3);
        if (dEmp > agora) dEmp.setHours(dEmp.getHours() - 3);

        let dPrevTolerancia = new Date(dPrev.getTime());
        dPrevTolerancia.setMinutes(dPrevTolerancia.getMinutes() + 15);
        const noPrazo = dReal <= dPrevTolerancia;

        const dia = String(dEmp.getDate()).padStart(2, '0');
        const mes = meses[dEmp.getMonth()];
        const ano = dEmp.getFullYear();

        const dataEmpStr = dEmp.toLocaleDateString('pt-BR');
        const horaEmpStr = dEmp.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        const dataRealStr = emp.data_devolucao_real ? dReal.toLocaleDateString('pt-BR') : 'Ainda ativo';
        const horaRealStr = emp.data_devolucao_real ? dReal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '';

        const dataPrevStr = dPrev.toLocaleDateString('pt-BR');
        const horaPrevStr = dPrev.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        const corBorda = (noPrazo || !emp.data_devolucao_real) ? '#22c55e' : '#ef4444';

        container.innerHTML += `
            <div class="hist-card" style="border-left: 5px solid ${corBorda};">
                <div class="hist-date">
                    <span class="mes">${mes}</span>
                    <span class="dia">${dia}</span>
                    <span class="ano">${ano}</span>
                </div>
                <div class="hist-details">
                    <h4 style="margin-bottom: 10px; color: #ffffff;">👤 ${escaparHTML(emp.nome_aluno)} <span style="font-size:0.8rem; font-weight:normal;">(Matrícula: ${escaparHTML(emp.matricula)})</span></h4>
                    
                    <div style="font-size: 0.9rem; color: #475569; margin-bottom: 10px;">
                        <p style="margin: 3px 0;" class="hist-info-line"><span class="status-dot dot-retirado"></span> <strong>Retirado em:</strong> ${dataEmpStr} às ${horaEmpStr}</p>
                        <p style="margin: 3px 0;" class="hist-info-line"><span class="status-dot dot-devolvido"></span> <strong>Devolvido em:</strong> ${emp.data_devolucao_real ? `${dataRealStr} às ${horaRealStr}` : 'Não devolvido'}</p>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin: 3px 0;" class="hist-prazo"><em>Prazo limite: ${dataPrevStr} às ${horaPrevStr}</em></p>
                    </div>

                    <p class="hist-status" style="font-size: 0.85rem; font-weight: bold; color: ${corBorda}; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 10px;">
                        ${emp.data_devolucao_real ? (noPrazo ? '✔ Devolvido No Prazo' : '✖ Devolvido com Atraso') : '⏳ Em andamento'} | <span style="color:#94a3b8; font-weight:normal;" class="obs-text">Obs: ${escaparHTML(emp.observacoes_devolucao || 'Nenhuma')}</span>
                    </p>
                </div>
            </div>
        `;
    });
}

function atualizarPaginaHistNote() {
    const startIndex = (paginaAtualHistNote - 1) * itensPorPaginaHistNote;
    const endIndex = startIndex + itensPorPaginaHistNote;
    const historicoDaPagina = historicoFiltradoNoteModal.slice(startIndex, endIndex);
    
    renderizarHistoricoNote(historicoDaPagina);
    renderizarPaginacaoHistNote(historicoFiltradoNoteModal.length);
}

function renderizarPaginacaoHistNote(totalItens) {
    const paginationContainer = document.getElementById('pagination-historico-note');
    if (!paginationContainer) return; 

    paginationContainer.innerHTML = '';
    const totalPaginas = Math.ceil(totalItens / itensPorPaginaHistNote);
    if (totalPaginas <= 1) return; // Não desenha paginação se couber tudo em 1 tela

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;'; // Seta Esquerda <
    prevButton.disabled = (paginaAtualHistNote === 1);
    prevButton.style.padding = '8px 15px'; // Um pouco menor que o botão principal
    prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (paginaAtualHistNote > 1) { paginaAtualHistNote--; atualizarPaginaHistNote(); }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPaginas; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i === paginaAtualHistNote) pageLink.classList.add('active');
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            paginaAtualHistNote = i;
            atualizarPaginaHistNote();
        });
        paginationContainer.appendChild(pageLink);
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;'; // Seta Direita >
    nextButton.disabled = (paginaAtualHistNote === totalPaginas);
    nextButton.style.padding = '8px 15px';
    nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (paginaAtualHistNote < totalPaginas) { paginaAtualHistNote++; atualizarPaginaHistNote(); }
    });
    paginationContainer.appendChild(nextButton);
}

function filtrarHistoricoNoteLocal() {
    const termoUsuario = document.getElementById('filtro-usuario-hist').value.toLowerCase();
    const dataInicio = document.getElementById('filtro-data-inicio-hist').value;
    const dataFim = document.getElementById('filtro-data-fim-hist').value;

    historicoFiltradoNoteModal = historicoAtualNoteModal.filter(emp => {
        const matchUsuario = (emp.nome_aluno || '').toLowerCase().includes(termoUsuario) ||
                             (emp.matricula || '').toLowerCase().includes(termoUsuario);
        
        let passaData = true;
        const dReal = emp.data_devolucao_real ? new Date(emp.data_devolucao_real) : new Date(emp.data_emprestimo); 
        const dApenasDia = new Date(dReal.getFullYear(), dReal.getMonth(), dReal.getDate());

        if (dataInicio) {
            const [ano, mes, dia] = dataInicio.split('-');
            const dInicio = new Date(ano, mes - 1, dia);
            if (dApenasDia < dInicio) passaData = false;
        }
        if (dataFim) {
            const [ano, mes, dia] = dataFim.split('-');
            const dFim = new Date(ano, mes - 1, dia);
            if (dApenasDia > dFim) passaData = false;
        }

        return matchUsuario && passaData;
    });
    
    paginaAtualHistNote = 1; // Reseta sempre para a página 1 ao filtrar
    atualizarPaginaHistNote(); // Chama a função que corta a lista e cria os botões
}

// Adiciona os gatilhos dos novos campos
document.getElementById('filtro-usuario-hist').addEventListener('input', filtrarHistoricoNoteLocal);
document.getElementById('filtro-data-inicio-hist').addEventListener('change', filtrarHistoricoNoteLocal);
document.getElementById('filtro-data-fim-hist').addEventListener('change', filtrarHistoricoNoteLocal);

// Exportação PDF Dinâmica (HTML2PDF para Dados / AutoTable para Histórico)
document.getElementById('btn-fechar-notebook').onclick = () => document.getElementById('modal-notebook').style.display = 'none';

document.getElementById('btn-baixar-pdf-note').onclick = () => {
    const textoAtual = document.getElementById('texto-btn-pdf-note').innerText;
    const tombamento = document.getElementById('modal-tombamento-titulo').textContent.replace('Tombamento: ', '').trim();
    const marcaModelo = document.getElementById('edit-note-modelo').value || 'Não Informado';
    
    // Aba 1: Print da tela
    if (textoAtual === 'Baixar Dados') {
        const elementoAlvo = document.getElementById('tab-dados-note');
        const opcoes = {
            margin: 10, filename: `Dados_${tombamento}_Genius.pdf`,
            image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opcoes).from(elementoAlvo).save();
    
    // Aba 2: Tabela Corporativa (Ignora a paginação da tela e imprime TODOS os filtrados)
    } else {
        if (historicoFiltradoNoteModal.length === 0) {
            const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;
            showAlert('Aviso', 'Não há histórico para exportar com estes filtros.', 'warning');
            return;
        }

        const btn = document.getElementById('btn-baixar-pdf-note');
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
        btn.disabled = true;

        const dataHoje = new Date().toLocaleDateString('pt-BR');
        let periodoTexto = 'Período Completo';
        const inputInicio = document.getElementById('filtro-data-inicio-hist').value;
        const inputFim = document.getElementById('filtro-data-fim-hist').value;
        
        if(inputInicio && inputFim) {
            const dI = inputInicio.split('-').reverse().join('/');
            const dF = inputFim.split('-').reverse().join('/');
            periodoTexto = `${dI} a ${dF}`;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text(`Histórico de Empréstimos - Notebook ${tombamento}`, 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Modelo / Marca: ${marcaModelo} | Período: ${periodoTexto}`, 14, 28);
        doc.text(`Gerado em: ${dataHoje} | Total de registros: ${historicoFiltradoNoteModal.length}`, 14, 33);

        const cabecalho = [['Aluno / Matrícula', 'Retirada', 'Devolução', 'Status', 'Observações']];
        
        const linhas = historicoFiltradoNoteModal.map(emp => {
            const dEmp = new Date(emp.data_emprestimo);
            const dReal = emp.data_devolucao_real ? new Date(emp.data_devolucao_real) : null;
            const dPrev = new Date(emp.data_devolucao_prevista);
            
            const dataEmpStr = dEmp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
            const dataDev = dReal ? dReal.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Ainda em uso';
            
            let statusTexto = 'EM ANDAMENTO';
            if (dReal) {
                let dPrevTolerancia = new Date(dPrev.getTime());
                dPrevTolerancia.setMinutes(dPrevTolerancia.getMinutes() + 15);
                const noPrazo = dReal <= dPrevTolerancia;
                statusTexto = noPrazo ? 'NO PRAZO' : 'COM ATRASO';
            }

            return [
                `${emp.nome_aluno}\nMat: ${emp.matricula}`,
                dataEmpStr,
                dataDev,
                statusTexto,
                emp.observacoes_devolucao || 'Nenhuma.'
            ];
        });

        doc.autoTable({
            head: cabecalho,
            body: linhas,
            startY: 40, 
            theme: 'grid', 
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, lineColor: [100, 116, 139], lineWidth: 0.3 },
            headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', lineColor: [44, 62, 80], lineWidth: 0.3 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 60 }, // Aluno
                1: { cellWidth: 35 }, // Retirada
                2: { cellWidth: 35 }, // Devolução
                3: { cellWidth: 35, fontStyle: 'bold' }, // Status
                4: { cellWidth: 'auto' } // Observações
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.raw === 'COM ATRASO') { data.cell.styles.textColor = [231, 76, 60]; } 
                    else if (data.cell.raw === 'NO PRAZO') { data.cell.styles.textColor = [39, 174, 96]; }
                    else { data.cell.styles.textColor = [52, 152, 219]; } // Em andamento (Azul)
                }
            }
        });

        doc.save(`Historico_${tombamento}_${dataHoje.replace(/\//g, '-')}.pdf`);

        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

setTimeout(buscarNotebooks, 0);
})();
