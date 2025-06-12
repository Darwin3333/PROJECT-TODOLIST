// App.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Button as BootstrapButton, ButtonGroup } from 'react-bootstrap';

import {
  TaskForm,
  CustomNavbar,
  Dashboard,
  TaskSearch,
  TaskList,
  TaskViewModal,
  TaskEditModal,
} from './components';

import type { Task, User, CommentForPayload } from './types/interfaces';

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
    user_id?: string;
  }>({});

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
    return `Utilizador (${userId.substring(0, 6)}...)`;
  };

  const fetchTasks = async (
    filters: typeof currentSearchFilters = {}
  ): Promise<Task[]> => {
    setLoadingTasks(true);
    setErrorTasks(null);
    let fetchedTasks: Task[] = [];
    try {
      const activeFilters: Record<string, string> = {};
      if (filters.status) activeFilters.status = filters.status;
      if (filters.data_criacao)
        activeFilters.data_criacao = filters.data_criacao;
      if (filters.tag) activeFilters.tag = filters.tag;
      if (filters.user_id) activeFilters.user_id = filters.user_id;

      const url = 'http://localhost:8000/tarefas/buscar/';

      const response = await axios.get<Task[]>(url, { params: activeFilters });
      setTasks(response.data);
      fetchedTasks = response.data;
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404 && Object.keys(filters).length > 0) {
          setTasks([]);
          setErrorTasks(
            'Nenhuma tarefa encontrada com os critérios fornecidos.'
          );
        } else {
          setErrorTasks(
            `Erro ao carregar tarefas: ${
              err.response.data.detail || err.message
            }`
          );
        }
      } else {
        setErrorTasks(`Erro desconhecido ao carregar tarefas: ${err.message}`);
      }
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoadingTasks(false);
    }
    return fetchedTasks;
  };

  useEffect(() => {
    fetchTasks(currentSearchFilters);
  }, [currentSearchFilters]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentSearchFilters({ user_id: user.id_user });
    alert(`Utilizador ${user.username} autenticado! (ID: ${user.id_user})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setTasks([]);
    setCurrentSearchFilters({});
    alert('Logout realizado!');
  };

  const switchToMyTasks = () => {
    if (currentUser && currentUser.id_user) {
      setCurrentSearchFilters((prevFilters) => ({
        status: prevFilters.status,
        data_criacao: prevFilters.data_criacao,
        tag: prevFilters.tag,
        user_id: currentUser.id_user,
      }));
    }
  };

  const switchToAllTasks = () => {
    setCurrentSearchFilters((prevFilters) => {
      const { user_id, ...rest } = prevFilters;
      return rest;
    });
  };

  const handleSearchSubmit = (searchComponentFilters: {
    status?: string;
    data_criacao?: string;
    tag?: string;
  }) => {
    setCurrentSearchFilters((prevFilters) => ({
      ...searchComponentFilters,
      user_id: prevFilters.user_id,
    }));
  };

  const handleClearSearch = () => {
    setCurrentSearchFilters((prevFilters) => {
      const newFilters: typeof currentSearchFilters = {};
      if (prevFilters.user_id) {
        newFilters.user_id = prevFilters.user_id;
      }
      return newFilters;
    });
    setErrorTasks(null);
  };

  const handleTaskAddedOrUpdated = async () => {
    const updatedTasks = await fetchTasks(currentSearchFilters);
    if (taskToView) {
      const refreshedTaskToView = updatedTasks.find(
        (t) => t.id === taskToView.id
      );
      if (refreshedTaskToView) {
        setTaskToView(refreshedTaskToView);
      } else {
        handleCloseViewModal();
      }
    }
  };

  const handleViewTask = (task: Task) => {
    setTaskToView(task);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setTaskToView(null);
  };

  const handleEditTask = (taskId: string) => {
    const taskFound = tasks.find((task) => task.id === taskId);
    if (taskFound) {
      if (currentUser && currentUser.id_user === taskFound.user_id) {
        setTaskToEdit(taskFound);
        setShowEditModal(true);
      } else {
        alert('Você não tem permissão para editar esta tarefa.');
      }
    } else {
      alert('Tarefa não encontrada para edição.');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setTaskToEdit(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser || !currentUser.id_user) {
      alert('Você precisa estar autenticado para excluir tarefas.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await axios.delete(`http://localhost:8000/tarefas/${taskId}`, {
          params: { solicitante_id_user: currentUser.id_user },
        });
        if (taskToView && taskToView.id === taskId) {
          handleCloseViewModal();
        }
        await handleTaskAddedOrUpdated();
      } catch (err: any) {
        if (err.response && err.response.status === 403) {
          alert('Permissão negada: Você não é o dono desta tarefa.');
        } else {
          alert(
            `Erro ao excluir tarefa: ${
              err.response?.data?.detail || err.message
            }`
          );
        }
        console.error('Erro ao excluir tarefa:', err);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-warning text-dark';
      case 'em andamento':
        return 'bg-primary text-white';
      case 'concluída':
        return 'bg-success text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  const handlePostNewComment = async (
    taskId: string,
    commentText: string
  ): Promise<boolean> => {
    if (!currentUser || !currentUser.id_user) {
      alert(
        'Erro: Utilizador não autenticado. Não é possível postar comentário.'
      );
      return false;
    }
    if (!commentText.trim()) {
      alert('O comentário não pode ser vazio.');
      return false;
    }

    const commentPayload: CommentForPayload = {
      comentario: commentText,
      id_autor: currentUser.id_user,
    };

    try {
      const response = await axios.post<Task>(
        `http://localhost:8000/tarefas/${taskId}/comentarios/`,
        commentPayload
      );
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? response.data : task))
      );
      if (taskToView && taskToView.id === taskId) {
        setTaskToView(response.data);
      }
      return true;
    } catch (err: any) {
      alert(
        `Erro ao adicionar comentário: ${
          err.response?.data?.detail || err.message
        }`
      );
      console.error('Erro ao postar comentário:', err);
      return false;
    }
  };

  return (
    <Router>
      <CustomNavbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <div className="container mt-4">
        <Routes>
          <Route
            path="/dashboard"
            element={
              currentUser ? (
                <Dashboard currentUser={currentUser} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/adicionar-tarefa"
            element={
              currentUser ? (
                <TaskForm
                  onTaskAdded={handleTaskAddedOrUpdated}
                  currentUser={currentUser}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/"
            element={
              <div className="row">
                <div className="col-md-10 offset-md-1">
                  <TaskSearch
                    onSearch={handleSearchSubmit}
                    onClear={handleClearSearch}
                  />
                  {currentUser && (
                    <div className="my-3">
                      <ButtonGroup>
                        <BootstrapButton
                          variant={
                            currentSearchFilters.user_id === currentUser.id_user
                              ? 'primary'
                              : 'outline-primary'
                          }
                          onClick={switchToMyTasks}
                          size="sm"
                        >
                          Minhas Tarefas
                        </BootstrapButton>
                        <BootstrapButton
                          variant={
                            !currentSearchFilters.user_id
                              ? 'primary'
                              : 'outline-primary'
                          }
                          onClick={switchToAllTasks}
                          size="sm"
                        >
                          Todas as Tarefas
                        </BootstrapButton>
                      </ButtonGroup>
                    </div>
                  )}
                  <hr className="my-4" />
                  <h3 className="mb-3">
                    {currentSearchFilters.user_id &&
                    currentUser &&
                    currentSearchFilters.user_id === currentUser.id_user
                      ? `Tarefas de ${currentUser.username}`
                      : 'Tarefas Visíveis'}
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
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <TaskViewModal
          show={showViewModal}
          task={taskToView}
          onHide={handleCloseViewModal}
          getUsernameById={getUsernameById}
          getStatusBadgeClass={getStatusBadgeClass}
          currentUser={currentUser}
          onPostNewComment={handlePostNewComment}
        />
        <TaskEditModal
          show={showEditModal}
          taskToEdit={taskToEdit}
          onHide={handleCloseEditModal}
          onTaskUpdated={handleTaskAddedOrUpdated}
          currentUser={currentUser}
        />
      </div>
    </Router>
  );
}

export default App;
