// src/components/TaskList.tsx
import type { Task, User } from '../types/interfaces';
import { Button } from 'react-bootstrap';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  currentSearchFilters: {
    status?: string;
    data_criacao?: string;
    tag?: string;
    user_id?: string;
  };
  onViewTask: (task: Task) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  getStatusBadgeClass: (status: string) => string;
  currentUser: User | null;
}

const TaskList = ({
  tasks,
  loading,
  error,
  currentSearchFilters,
  onViewTask,
  onEditTask,
  onDeleteTask,
  getStatusBadgeClass,
  currentUser,
}: TaskListProps) => {
  if (loading) {
    return (
      <div className="alert alert-info mt-3" role="alert">
        Carregando tarefas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger mt-3" role="alert">
        {error}
      </div>
    );
  }

  const hasActiveFilters = Object.values(currentSearchFilters).some(
    (filterValue) => filterValue !== undefined && filterValue !== ''
  );

  if (tasks.length === 0 && hasActiveFilters) {
    return (
      <div className="alert alert-light mt-3" role="alert">
        Nenhuma tarefa encontrada com os critérios fornecidos.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="alert alert-light mt-3" role="alert">
        Nenhuma tarefa cadastrada ainda. Seja o primeiro a adicionar ou ajuste
        seus filtros!
      </div>
    );
  }

  return (
    <div className="mt-3">
      {tasks.map((task) => (
        <div key={task.id} className="card mb-3 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5
                className="card-title mb-0"
                style={{ cursor: 'pointer' }}
                onClick={() => onViewTask(task)}
              >
                {task.titulo}
              </h5>
              <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>
            <p className="card-text text-truncate" style={{ maxWidth: '100%' }}>
              {task.descricao}
            </p>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">
                Criado em:{' '}
                {new Date(task.data_criacao).toLocaleDateString('pt-BR')}
                {task.data_atualizacao !== task.data_criacao && (
                  <span
                    title={new Date(task.data_atualizacao).toLocaleString(
                      'pt-BR'
                    )}
                  >
                    {' | '}Atualizado em:{' '}
                    {new Date(task.data_atualizacao).toLocaleDateString(
                      'pt-BR'
                    )}
                  </span>
                )}
              </small>

              <div className="task-actions">
                <Button
                  variant="outline-info"
                  size="sm"
                  className="me-2"
                  onClick={() => onViewTask(task)}
                  title="Visualizar Tarefa"
                >
                  <i className="bi bi-eye"></i>
                  <span className="d-none d-md-inline ms-1">Visualizar</span>
                </Button>

                {currentUser && currentUser.id_user === task.user_id && (
                  <>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      className="me-2"
                      onClick={() => onEditTask(task.id)}
                      title="Editar Tarefa"
                    >
                      <i className="bi bi-pencil-square"></i>
                      <span className="d-none d-md-inline ms-1">Editar</span>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => onDeleteTask(task.id)}
                      title="Excluir Tarefa"
                    >
                      <i className="bi bi-trash"></i>
                      <span className="d-none d-md-inline ms-1">Excluir</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
