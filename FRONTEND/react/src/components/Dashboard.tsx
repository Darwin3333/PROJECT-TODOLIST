// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react'; // Adicione useState e useEffect
import axios from 'axios'; // Para fazer chamadas à API
import type{ User } from '../types/interfaces';

interface DashboardProps {
  currentUser: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // --- Estados para os Dados Dinâmicos ---
  const [tasksByStatus, setTasksByStatus] = useState<{ pendente: number; 'em andamento': number; concluída: number }>({ pendente: 0, 'em andamento': 0, concluída: 0 });
  const [tasksCreatedToday, setTasksCreatedToday] = useState<number>(0);

  const [completedTasksByDay, setCompletedTasksByDay] = useState<{ date: string; count: number }[]>([]); // NOVO ESTADO
  const [topTags, setTopTags] = useState<{ tag: string; count: number }[]>([]); // NOVO ESTADO para tags
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = 'http://localhost:8000/metrics'; // Base URL para suas métricas

  const fetchMetrics = async () => {
    if (!currentUser || !currentUser.id) { // Certifique-se que o user_id existe
      setLoading(false);
      setError("Por favor, faça login para visualizar o Dashboard.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Métrica 1: Contadores de Status
      const statusResponse = await axios.get(`${API_URL}/status`, {
        params: { user_id: currentUser.id }
      });
      setTasksByStatus(statusResponse.data);

      // Métrica 4: Tarefas Criadas Hoje
      const createdTodayResponse = await axios.get(`${API_URL}/tasks-created-today`, {
        params: { user_id: currentUser.id }
      });
      setTasksCreatedToday(createdTodayResponse.data.count);

      // --- NOVO: Métrica 3: Tags Mais Utilizadas ---
      const topTagsResponse = await axios.get(`${API_URL}/top-tags`, { params: { user_id: currentUser.id, count: 5 } });
      setTopTags(topTagsResponse.data);
      // --- FIM NOVO ---

      // (Aqui você adicionaria chamadas para as outras métricas quando implementadas)

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(`Erro ao carregar métricas: ${err.response.data.detail || err.message}`);
      } else {
        setError(`Erro desconhecido ao carregar métricas: ${err.message}`);
      }
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Opcional: Atualizar métricas a cada X segundos para dar a sensação de tempo real
    const interval = setInterval(fetchMetrics, 5000); // Atualiza a cada 5 segundos
    return () => clearInterval(interval); // Limpa o intervalo ao desmontar
  }, [currentUser]); // Refaz a busca se o usuário logado mudar

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        <h2>Dashboard de Produtividade</h2>
        <div className="alert alert-warning">Você precisa estar logado para visualizar o Dashboard.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <h2>Dashboard de Produtividade de {currentUser.username}</h2>
        <div className="alert alert-info">Carregando métricas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <h2>Dashboard de Produtividade de {currentUser.username}</h2>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>Dashboard de Produtividade de {currentUser.username}</h2>

      <p className="lead">Bem-vindo(a) ao seu Dashboard!</p>
      <p className="text-muted">Os dados abaixo são atualizados dinamicamente pelo Redis.</p>

      <div className="metrics-grid">
        {/* Métrica 1: Contadores de Status de Tarefas (Dinâmico) */}
        <div className="metric-card">
          <h3>Tarefas por Status</h3>
          <ul>
            <li>Pendente: {tasksByStatus.pendente}</li>
            <li>Em Andamento: {tasksByStatus['em andamento']}</li>
            <li>Concluída: {tasksByStatus.concluída}</li>
          </ul>
        </div>

        {/* Métrica 4: Tarefas Criadas Hoje (Dinâmico) */}
        <div className="metric-card">
          <h3>Tarefas Criadas Hoje</h3>
          <p className="metric-value">{tasksCreatedToday}</p>
        </div>

         <div className="metric-card">
          <h3>Tags Mais Utilizadas</h3>
          {topTags.length > 0 ? (
            <ul>
              {topTags.map((item, index) => (
                <li key={index}>{item.tag}: {item.count} usos</li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma tag utilizada ainda.</p>
          )}
        </div>

         {/* Métrica 2: Concluídas por Dia (Dinâmico) */}
        <div className="metric-card">
          <h3>Concluídas por Dia</h3>
          {completedTasksByDay.length > 0 ? (
            <ul>
              {completedTasksByDay.map((item, index) => (
                <li key={index}>**{item.date}**: {item.count} tarefas</li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma tarefa concluída nos últimos 7 dias.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;