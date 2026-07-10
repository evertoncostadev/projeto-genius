// frontend/dashboard/home.js

async function carregarDashboard() {
    const token = localStorage.getItem('token');
    const API_URL = 'http://localhost:3000';

    if (!token) {
        console.error('Erro de autenticação: Token não encontrado.');
        return;
    }

    try {
        const [estatisticasRes, atividadeRes, operacionalRes] = await Promise.all([
            fetch(`${API_URL}/api/estatisticas`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            }),
            fetch(`${API_URL}/api/atividade-semana`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            }),
            fetch(`${API_URL}/api/dashboard-operacional`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            })
        ]);

        if (estatisticasRes.ok) {
            const estatisticas = await estatisticasRes.json();
            atualizarCardsNotebooks(estatisticas);
        }

        if (atividadeRes.ok) {
            const atividade = await atividadeRes.json();
            renderizarGraficoBarras(atividade);
        }

        if (operacionalRes.ok) {
            const liveData = await operacionalRes.json();
            
            // Cards de Alerta (Linha 2)
            const elPendentes = document.getElementById('live-pendentes');
            if (elPendentes) elPendentes.textContent = liveData.pendentes;
            
            const elAtrasados = document.getElementById('live-atrasados');
            if (elAtrasados) elAtrasados.textContent = liveData.atrasados;
            
            // Lista de Devoluções (Linha 3 - Direita)
            renderizarListaDevolucoes(liveData.proximasDevolucoes || []);
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function atualizarCardsNotebooks(data) {
    const elTotal = document.getElementById('count-total');
    const elDisponiveis = document.getElementById('count-disponiveis');
    const elEmprestados = document.getElementById('count-emprestados');
    const elDesativados = document.getElementById('count-desativados');

    if (elTotal) elTotal.textContent = data.totalCadastrados;
    if (elDisponiveis) elDisponiveis.textContent = data.disponiveis;
    if (elEmprestados) elEmprestados.textContent = data.emprestados;
    if (elDesativados) elDesativados.textContent = data.desativados;
}

function renderizarGraficoBarras(data) {
    const ctx = document.getElementById('barChartSemana');
    if (!ctx) return;

    let chartStatus = Chart.getChart(ctx);
    if (chartStatus) chartStatus.destroy();

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels, 
            datasets: [{
                label: 'Empréstimos por Dia',
                data: data.data, 
                backgroundColor: '#4A90E2',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: { label: function(context) { return ` Empréstimos: ${context.raw}`; } }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderizarListaDevolucoes(lista) {
    const container = document.getElementById('lista-devolucoes');
    if (!container) return;
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; text-align: center; margin-top: 20px; font-size: 0.9rem;">Nenhuma devolução aguardada.</p>';
        return;
    }

    lista.forEach(item => {
        // Ajusta fuso horário se necessário para bater certinho com João Pessoa
        const dataPrev = new Date(item.data_devolucao_prevista);
        const horaStr = dataPrev.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Pega apenas o primeiro nome do aluno para não quebrar o layout
        const nomeCurto = String(item.nome).split(' ')[0];
        
        // Evita injeção (XSS)
        const tombamentoSeguro = String(item.tombamento).replace(/[&<>'"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[match]));

        const divItem = document.createElement('div');
        divItem.style = "display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f2f6;";
        
        divItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user" style="color: #3498db; background: #ebf5fb; padding: 8px; border-radius: 50%; font-size: 0.8rem;"></i>
                <div>
                    <p style="margin: 0; font-weight: 600; color: #2c3a4b; font-size: 0.95rem;">${nomeCurto}</p>
                    <p style="margin: 0; font-size: 0.75rem; color: #7f8c8d;">NB: ${tombamentoSeguro}</p>
                </div>
            </div>
            <div style="text-align: right;">
                <span style="background-color: #f1f2f6; color: #2c3a4b; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; border: 1px solid #dfe4ea;">
                    <i class="far fa-clock" style="margin-right: 4px; color: #7f8c8d;"></i>${horaStr}
                </span>
            </div>
        `;
        container.appendChild(divItem);
    });
}

carregarDashboard();