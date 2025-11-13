// frontend/dashboard/home.js

async function carregarDashboard() {
    const token = localStorage.getItem('token');
    const API_URL = 'http://localhost:3000';

    if (!token) {
        console.error('Erro de autenticação: Token não encontrado.');
        return;
    }

    try {
        const [estatisticasRes, atividadeRes] = await Promise.all([
            fetch(`${API_URL}/api/estatisticas`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            }),
            fetch(`${API_URL}/api/atividade-semana`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            })
        ]);

        if (!estatisticasRes.ok) {
            console.error(`Falha ao buscar estatísticas: ${estatisticasRes.status}`);
            return;
        }
        if (!atividadeRes.ok) {
            console.error(`Falha ao buscar atividade da semana: ${atividadeRes.status}`);
            return;
        }

        const estatisticas = await estatisticasRes.json();
        const atividade = await atividadeRes.json();

        atualizarCards(estatisticas);
        renderizarGraficoPizza(estatisticas);
        renderizarGraficoBarras(atividade);

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}


function atualizarCards(data) {
    const elDisponiveis = document.getElementById('count-disponiveis');
    const elEmprestados = document.getElementById('count-emprestados');
    const elDesativados = document.getElementById('count-desativados');

    if (elDisponiveis) elDisponiveis.textContent = data.disponiveis;
    if (elEmprestados) elEmprestados.textContent = data.emprestados;
    if (elDesativados) elDesativados.textContent = data.desativados;
}


function renderizarGraficoPizza(data) {
    const ctx = document.getElementById('pieChartStatus');
    if (!ctx) return;

    let chartStatus = Chart.getChart(ctx);
    if (chartStatus) {
        chartStatus.destroy();
    }

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [
                'Total Cadastrados',
                'Disponíveis',
                'Emprestados',
                'Indisponíveis'
            ],
            datasets: [{
                label: 'Status dos Notebooks',
                data: [
                    data.totalCadastrados,
                    data.disponiveis,
                    data.emprestados,
                    data.desativados
                ],
                backgroundColor: [
                    '#4A90E2',
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Poppins'
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}


function renderizarGraficoBarras(data) {
    const ctx = document.getElementById('barChartSemana');
    if (!ctx) return;

    let chartStatus = Chart.getChart(ctx);
    if (chartStatus) {
        chartStatus.destroy();
    }

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
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return ` Empréstimos: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0 
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

carregarDashboard();