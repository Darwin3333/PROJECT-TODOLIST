// src/components/Dashboard.tsx
import React from 'react';
import type{ User } from '../types/interfaces'; // Importe a interface User
import "./Dashboard.css"
// Definindo as props para o componente Dashboard
interface DashboardProps {
  currentUser: User | null; // Recebe o usuário atual para exibir o nome
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // --- Dados Estáticos (Hardcoded) ---
  // Estes dados serão substituídos por dados dinâmicos do Redis mais tarde.
  // Por enquanto, eles servem apenas para simular a apresentação.

  // 1. Contadores de Status de Tarefas (Para o usuário logado)
  const staticTasksByStatus = {
    pendente: 5,
    'em andamento': 3,
    concluída: 12,
  };

  // 2. Totalizadores por Período (Tarefas concluídas por dia)
  const staticCompletedTasksByDay = [
    { date: '2025-05-25', count: 2 },
    { date: '2025-05-26', count: 4 },
    { date: '2025-05-27', count: 7 }, // Hoje
    { date: '2025-05-28', count: 3 }, // Dia atual (se já tiver dados)
  ];

  // 3. Tags Mais Utilizadas (No geral)
  const staticTopTags = [
    { tag: 'Urgente', count: 15 },
    { tag: 'Estudo', count: 12 },
    { tag: 'Trabalho', count: 10 },
    { tag: 'Pessoal', count: 8 },
    { tag: 'Compras', count: 5 },
  ];

  // 4. Estatísticas de Produtividade
  const staticProductivityStats = {
    avgCompletionTime: '2h 30min', // Ex: Formato de string
    tasksCreatedToday: 4,
    weeklyCompletionRate: '85%', // Ex: Formato de string
  };

  // --- Renderização do Componente ---

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        <h2>Dashboard de Produtividade</h2>
        <div className="alert alert-warning">Você precisa estar logado para visualizar o Dashboard.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>Dashboard de Produtividade de {currentUser.username}</h2>

      <p className="lead">Bem-vindo(a) ao seu Dashboard! Aqui você verá suas métricas de produtividade.</p>
      <p className="text-muted">Os dados abaixo são **estáticos** por enquanto e serão atualizados futuramente.</p>

      <div className="metrics-grid">
        {/* Métrica 1: Contadores de Status de Tarefas */}
        <div className="metric-card">
          <h3>Tarefas por Status</h3>
          <ul>
            <li><strong>Pendente:</strong> {staticTasksByStatus.pendente}</li>
            <li><strong>Em Andamento:</strong> {staticTasksByStatus['em andamento']}</li>
            <li><strong>Concluída:</strong> {staticTasksByStatus.concluída}</li>
          </ul>
        </div>

        {/* Métrica 2: Totalizadores por Período (Tarefas Concluídas por Dia) */}
        <div className="metric-card">
          <h3>Concluídas por Dia</h3>
          <ul>
            {staticCompletedTasksByDay.map((item, index) => (
              <li key={index}><strong>{item.date}:</strong> {item.count} tarefas</li>
            ))}
          </ul>
        </div>

        {/* Métrica 3: Tags Mais Utilizadas */}
        <div className="metric-card">
          <h3>Tags Mais Utilizadas</h3>
          <ul>
            {staticTopTags.map((item, index) => (
              <li key={index}><strong>{item.tag}</strong>: {item.count} usos</li>
            ))}
          </ul>
        </div>

        {/* Métrica 4: Estatísticas de Produtividade */}
        <div className="metric-card">
          <h3>Estatísticas de Produtividade</h3>
          <ul>
            <li><strong>Tarefas Criadas Hoje</strong>: {staticProductivityStats.tasksCreatedToday}</li>
            <li><strong>Tempo Médio Conclusão</strong>: {staticProductivityStats.avgCompletionTime}</li>
            <li><strong>Taxa Conclusão Semanal</strong>: {staticProductivityStats.weeklyCompletionRate}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;