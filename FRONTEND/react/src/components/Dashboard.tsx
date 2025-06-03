// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { User } from '../types/interfaces'; // Certifique-se que o caminho está correto

// Interfaces para os dados das novas métricas (podem ser movidas para types/interfaces.ts se preferir)
interface AverageCompletionTimeData {
  average_seconds: number | null;
  total_completed: number;
  message?: string;
}

interface WeeklyCompletionRateData {
  rate: number | null;
  tasks_created_last_7_days: number;
  tasks_completed_last_7_days: number;
  message?: string;
}

interface CompletedByDayData {
  date: string;
  count: number;
}

interface TopTagData {
  tag: string;
  count: number;
}

interface DashboardProps {
  currentUser: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [tasksByStatus, setTasksByStatus] = useState<{ [key: string]: number }>({
    pendente: 0,
    'em andamento': 0,
    concluída: 0,
  });
  const [tasksCreatedToday, setTasksCreatedToday] = useState<number>(0);
  const [topTags, setTopTags] = useState<TopTagData[]>([]);
  const [completedTasksByDay, setCompletedTasksByDay] = useState<CompletedByDayData[]>([]);
  
  // NOVOS ESTADOS para as novas métricas
  const [averageCompletionTime, setAverageCompletionTime] = useState<AverageCompletionTimeData | null>(null);
  const [weeklyCompletionRate, setWeeklyCompletionRate] = useState<WeeklyCompletionRateData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL_METRICS = 'http://localhost:8000/metrics';

  const fetchAllMetrics = async () => {
    if (!currentUser || !currentUser.id_user) {
      setError("Por favor, faça login para visualizar o Dashboard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userIdParams = { params: { user_id: currentUser.id_user } };

      // Usando Promise.all para buscar todas as métricas em paralelo
      const responses = await Promise.all([
        axios.get(`${API_URL_METRICS}/status`, userIdParams),
        axios.get(`${API_URL_METRICS}/tasks-created-today`, userIdParams),
        axios.get(`${API_URL_METRICS}/top-tags`, { params: { ...userIdParams.params, count: 5 } }),
        axios.get(`${API_URL_METRICS}/completed-by-day`, { params: { ...userIdParams.params, days: 7 } }),
        axios.get(`${API_URL_METRICS}/average-completion-time`, userIdParams), // NOVA CHAMADA
        axios.get(`${API_URL_METRICS}/weekly-completion-rate`, userIdParams)  // NOVA CHAMADA
      ]);

      setTasksByStatus(responses[0].data);
      setTasksCreatedToday(responses[1].data.count);
      setTopTags(responses[2].data);
      setCompletedTasksByDay(responses[3].data);
      setAverageCompletionTime(responses[4].data); // NOVO SETSTATE
      setWeeklyCompletionRate(responses[5].data);  // NOVO SETSTATE

    } catch (err: any) {
      let errorMessage = "Erro desconhecido ao carregar métricas.";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = `Erro ao carregar métricas: ${err.response.data.detail || err.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.id_user) {
      fetchAllMetrics();
      // Opcional: Atualizar métricas a cada X segundos
      // const interval = setInterval(fetchAllMetrics, 30000); // Atualiza a cada 30 segundos
      // return () => clearInterval(interval);
    } else {
      // Limpa os dados se o usuário deslogar
      setTasksByStatus({ pendente: 0, 'em andamento': 0, concluída: 0 });
      setTasksCreatedToday(0);
      setTopTags([]);
      setCompletedTasksByDay([]);
      setAverageCompletionTime(null);
      setWeeklyCompletionRate(null);
      setLoading(false);
    }
  }, [currentUser]); // Refaz a busca se o usuário logado mudar

  // Função para formatar segundos em "X dias, Y horas, Z minutos" ou similar
  const formatDuration = (totalSeconds: number | null | undefined): string => {
    if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) {
      return "N/D";
    }
    if (totalSeconds === 0) return "0 segundos";

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    let parts: string[] = [];
    if (days > 0) parts.push(`${days} dia(s)`);
    if (hours > 0) parts.push(`${hours} hora(s)`);
    if (minutes > 0) parts.push(`${minutes} min`);
    if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} seg`); // Mostra segundos se for menos de 1 min

    return parts.length > 0 ? parts.join(', ') : "Menos de 1 minuto";
  };


  if (!currentUser) {
    return (
      <div className="container mt-4">
        <h2>Dashboard de Produtividade</h2>
        <div className="alert alert-warning" role="alert">
          Você precisa estar logado para visualizar o Dashboard.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <h2>Dashboard de Produtividade de {currentUser.username}</h2>
        <div className="alert alert-info" role="alert">Carregando métricas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <h2>Dashboard de Produtividade de {currentUser.username}</h2>
        <div className="alert alert-danger" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Dashboard de Produtividade de {currentUser.username}</h2>
      <p className="text-muted mb-4">
        Acompanhe seu progresso e eficiência na gestão de tarefas.
      </p>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {/* Tarefas por Status */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title"><i className="bi bi-bar-chart-steps me-2"></i>Tarefas por Status</h5>
              {Object.keys(tasksByStatus).length > 0 ? (
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Pendente <span className="badge bg-warning rounded-pill">{tasksByStatus.pendente || 0}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Em Andamento <span className="badge bg-primary rounded-pill">{tasksByStatus['em andamento'] || 0}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    Concluída <span className="badge bg-success rounded-pill">{tasksByStatus.concluída || 0}</span>
                  </li>
                </ul>
              ) : <p className="text-muted">Nenhuma tarefa encontrada.</p>}
            </div>
          </div>
        </div>

        {/* Tarefas Criadas Hoje */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title"><i className="bi bi-calendar-plus me-2"></i>Criadas Hoje</h5>
              <p className="display-4 fw-bold">{tasksCreatedToday}</p>
            </div>
          </div>
        </div>
        
        {/* Tags Mais Utilizadas */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title"><i className="bi bi-tags me-2"></i>Top Tags</h5>
              {topTags.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {topTags.map((item) => (
                    <li key={item.tag} className="list-group-item d-flex justify-content-between align-items-center">
                      {item.tag}
                      <span className="badge bg-info rounded-pill">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted">Nenhuma tag utilizada ainda.</p>}
            </div>
          </div>
        </div>

        {/* Tempo Médio de Conclusão */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title"><i className="bi bi-clock-history me-2"></i>Tempo Médio de Conclusão</h5>
              {averageCompletionTime && averageCompletionTime.average_seconds !== null ? (
                <>
                  <p className="display-6 fw-bold">{formatDuration(averageCompletionTime.average_seconds)}</p>
                  <small className="text-muted">Baseado em {averageCompletionTime.total_completed} tarefa(s) concluída(s)</small>
                </>
              ) : (
                <p className="text-muted mt-3">{averageCompletionTime?.message || "Calculando..."}</p>
              )}
            </div>
          </div>
        </div>

        {/* Taxa de Conclusão Semanal */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title"><i className="bi bi-check2-circle me-2"></i>Taxa de Conclusão Semanal</h5>
              {weeklyCompletionRate && weeklyCompletionRate.rate !== null ? (
                <>
                  <p className="display-4 fw-bold">{(weeklyCompletionRate.rate * 100).toFixed(0)}%</p>
                  <small className="text-muted">
                    {weeklyCompletionRate.tasks_completed_last_7_days} de {weeklyCompletionRate.tasks_created_last_7_days} tarefas criadas nos últimos 7 dias.
                  </small>
                </>
              ) : (
                <p className="text-muted mt-3">{weeklyCompletionRate?.message || "Calculando..."}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tarefas Concluídas por Dia (Últimos 7 dias) */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title"><i className="bi bi-calendar-check me-2"></i>Concluídas por Dia</h5>
              {completedTasksByDay.length > 0 ? (
                 <ul className="list-group list-group-flush">
                  {completedTasksByDay.slice(0, 7).map((item) => ( // Mostra os últimos 7 dias
                    <li key={item.date} className="list-group-item d-flex justify-content-between align-items-center">
                      {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short'})}
                      <span className="badge bg-secondary rounded-pill">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted">Nenhuma tarefa concluída nos últimos dias.</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;