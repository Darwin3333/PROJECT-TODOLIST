// App.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Button as BootstrapButton, ButtonGroup } from 'react-bootstrap'; // Para os botões de filtro
import {
  TaskForm,
  CustomNavbar,
  Dashboard,
  TaskSearch,
  TaskList,
  TaskViewModal,
  TaskEditModal
} from './components';
import type { Task, User } from './types/interfaces';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [taskToView, setTaskToView] = useState<Task | null>(null);

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);


  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSearchFilters, setCurrentSearchFilters] = useState<{
    status?: string;
    data_criacao?: string;
    tag?: string;
    user_id?: string; // Este campo controlará se são "minhas" ou "todas" (se ausente)
  }>({});

  // Mapa para nomes de usuário (substitua pelos UUIDs e nomes reais do seu DB)
  const NOME_USUARIOS_CONHECIDOS: { [key: string]: string } = {
    'a1b9f8e7-5c3d-4e2a-8f6b-9c1d0a7e4f2a': 'Matheus',
    'c3d8e2f1-9a7b-4d6c-8a1e-0f5b3c9d7e4b': 'Bruno',
  };

  const getUsernameById = (userId: string | undefined): string => {
    if (!userId) return 'Desconhecido';
    if (NOME_USUARIOS_CONHECIDOS[userId]) {
      return NOME_USUARIOS_CONHECIDOS[userId];
    }
    if (currentUser && currentUser.id_user === userId) {
      return currentUser.username;
    }
    return `Usuário (${userId.substring(0, 6)}...)`;
  };

  const fetchTasks = async (filters: typeof currentSearchFilters = {}) => {
    setLoadingTasks(true);
    setErrorTasks(null);
    try {
      const activeFilters: Record<string, string> = {};
      if (filters.status) activeFilters.status = filters.status;
      if (filters.data_criacao) activeFilters.data_criacao = filters.data_criacao;
      if (filters.tag) activeFilters.tag = filters.tag;
      if (filters.user_id) activeFilters.user_id = filters.user_id;

      let url = 'http://localhost:8000/tarefas/';
      // Sempre usa a rota de busca se houver filtros ativos, ou para buscar todas se não houver user_id.
      // Se activeFilters estiver vazio, busca todas as tarefas (comportamento padrão da rota /tarefas/buscar/ sem params).
      if (Object.keys(activeFilters).length > 0 || !filters.user_id) { // Ajuste aqui
         url = 'http://localhost:8000/tarefas/buscar/';
      }
      
      console.log("Buscando tarefas com URL:", url, "e filtros:", activeFilters);
      const response = await axios.get<Task[]>(url, { params: activeFilters });
      setTasks(response.data);
    } catch (err: any) {
      // ... (tratamento de erro como antes) ...
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404 && Object.keys(filters).length > 0) {
          setTasks([]);
          setErrorTasks("Nenhuma tarefa encontrada com os critérios fornecidos.");
        } else {
          setErrorTasks(`Erro ao carregar tarefas: ${err.response.data.detail || err.message}`);
        }
      } else {
        setErrorTasks(`Erro desconhecido ao carregar tarefas: ${err.message}`);
      }
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // useEffect para buscar tarefas quando os filtros mudam.
  useEffect(() => {
    fetchTasks(currentSearchFilters);
  }, [currentSearchFilters]); // Apenas currentSearchFilters como dependência

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Ao logar, define para "Minhas Tarefas" por padrão, limpando outros filtros de busca
    setCurrentSearchFilters({ user_id: user.id_user });
    alert(`Usuário ${user.username} logado! (ID: ${user.id_user})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    // Ao deslogar, define para "Todas as Tarefas" (sem user_id), limpando outros filtros
    setCurrentSearchFilters({});
    alert('Logout realizado!');
  };
  
  // Funções para alternar a visualização de tarefas
  const switchToMyTasks = () => {
    if (currentUser && currentUser.id_user) {
      // Mantém outros filtros (status, data, tag) e adiciona/garante user_id
      setCurrentSearchFilters(prevFilters => ({
        ...prevFilters,
        user_id: currentUser.id_user
      }));
    }
  };

  const switchToAllTasks = () => {
    // Mantém outros filtros (status, data, tag) e remove user_id
    setCurrentSearchFilters(prevFilters => {
      const { user_id, ...rest } = prevFilters;
      return rest;
    });
  };

  const handleSearchSubmit = (searchComponentFilters: { status?: string; data_criacao?: string; tag?: string }) => {
    // Combina os filtros do TaskSearch com o filtro de user_id existente (ou ausência dele)
    setCurrentSearchFilters(prevFilters => ({
      ...searchComponentFilters, // Filtros do TaskSearch (status, data, tag)
      user_id: prevFilters.user_id // Mantém o user_id (ou ausência) definido pelos botões de alternância
    }));
  };

  const handleClearSearch = () => {
    // Limpa status, data, tag, mas mantém o user_id se estiver definido (para "Minhas Tarefas")
    setCurrentSearchFilters(prevFilters => {
      const newFilters: typeof currentSearchFilters = {};
      if (prevFilters.user_id) {
        newFilters.user_id = prevFilters.user_id;
      }
      return newFilters;
    });
    setErrorTasks(null);
  };

  // ... (handleTaskAddedOrUpdated, handleViewTask, etc. como antes) ...
  const handleTaskAddedOrUpdated = () => {
    fetchTasks(currentSearchFilters);
  };
  const handleViewTask = (task: Task) => { setTaskToView(task); setShowViewModal(true); };
  const handleCloseViewModal = () => { setShowViewModal(false); setTaskToView(null); };
  const handleEditTask = (taskId: string) => {
    const taskFound = tasks.find(task => task.id === taskId);
    if (taskFound) {
      if (currentUser && currentUser.id_user === taskFound.user_id) {
        setTaskToEdit(taskFound); setShowEditModal(true);
      } else { alert("Você não tem permissão para editar esta tarefa."); }
    } else { alert("Tarefa não encontrada para edição."); }
  };
  const handleCloseEditModal = () => { setShowEditModal(false); setTaskToEdit(null); };
  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser || !currentUser.id_user) { alert("Você precisa estar logado para excluir tarefas."); return; }
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await axios.delete(`http://localhost:8000/tarefas/${taskId}`, {
          params: { solicitante_id_user: currentUser.id_user }
        });
        handleTaskAddedOrUpdated(); 
      } catch (err: any) { /* ... (tratamento de erro) ... */ }
    }
  };
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-warning text-dark';
      case 'em andamento': return 'bg-primary text-white'; 
      case 'concluída': return 'bg-success text-white'; 
      default: return 'bg-secondary text-white'; 
    }
  };


  return (
    <Router>
      <CustomNavbar currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} />
      <div className="container mt-4">
        <Routes>
          <Route path="/dashboard" element={ currentUser ? <Dashboard currentUser={currentUser} /> : <Navigate to="/" replace /> } />
          <Route path="/adicionar-tarefa" element={ currentUser ? <TaskForm onTaskAdded={handleTaskAddedOrUpdated} currentUser={currentUser} /> : <Navigate to="/" replace /> }/>
          <Route path="/" element={
            <div className="row">
              <div className="col-md-10 offset-md-1">
                <TaskSearch onSearch={handleSearchSubmit} onClear={handleClearSearch} />
                
                {/* Botões para alternar visualização de tarefas */}
                {currentUser && ( // Só mostra se estiver logado
                  <div className="my-3">
                    <ButtonGroup aria-label="Filtro de visualização de tarefas">
                      <BootstrapButton 
                        variant={currentSearchFilters.user_id === currentUser.id_user ? "primary" : "outline-primary"}
                        onClick={switchToMyTasks}
                        size="sm"
                      >
                        Minhas Tarefas
                      </BootstrapButton>
                      <BootstrapButton 
                        variant={!currentSearchFilters.user_id ? "primary" : "outline-primary"}
                        onClick={switchToAllTasks}
                        size="sm"
                      >
                        Todas as Tarefas
                      </BootstrapButton>
                    </ButtonGroup>
                  </div>
                )}
                <hr className="my-4"/>
                <h3 className="mb-3">
                  {currentSearchFilters.user_id && currentUser && currentSearchFilters.user_id === currentUser.id_user
                    ? `Tarefas de ${currentUser.username}`
                    : "Tarefas Visíveis"}
                </h3>
                <TaskList
                  tasks={tasks}
                  loading={loadingTasks}
                  error={errorTasks}
                  currentSearchFilters={currentSearchFilters}
                  onViewTask={handleViewTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  getStatusBadgeClass={getStatusBadgeClass}
                  currentUser={currentUser}
                />
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <TaskViewModal show={showViewModal} task={taskToView} onHide={handleCloseViewModal} getUsernameById={getUsernameById} getStatusBadgeClass={getStatusBadgeClass} currentUser={currentUser} />
        <TaskEditModal show={showEditModal} taskToEdit={taskToEdit} onHide={handleCloseEditModal} onTaskUpdated={handleTaskAddedOrUpdated} currentUser={currentUser} />
      </div>
    </Router>
  );
}

export default App;