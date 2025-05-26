import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TaskForm from './component/TaskForm'; // Importe o novo componente

// Interface para a tarefa que vem do backend (deve corresponder a TarefaInDB)
interface Task {
  id: string; // O _id do MongoDB vem como string 'id'
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  data_criacao: string;
  tags: string[];
  comentarios: { autor: string; comentario: string; data: string }[];
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  // Função para buscar as tarefas
  const fetchTasks = async () => {
    setLoadingTasks(true);
    setErrorTasks(null);
    try {
      const response = await axios.get<Task[]>(
        'http://localhost:8000/tarefas/'
      );
      setTasks(response.data);
    } catch (err: any) {
      setErrorTasks(`Erro ao carregar tarefas: ${err.message}`);
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Chama fetchTasks na montagem do componente e quando uma tarefa é adicionada
  useEffect(() => {
    fetchTasks();
  }, []); // O array vazio significa que ele roda uma vez na montagem

  // Esta função será passada para TaskForm para recarregar a lista após a criação
  const handleTaskAdded = () => {
    fetchTasks(); // Recarrega a lista de tarefas
  };

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '20px auto',
        padding: '20px',
        border: '1px solid #eee',
        borderRadius: '8px',
        boxShadow: '2px 2px 10px rgba(0,0,0,0.1)',
      }}
    >
      <h1>Minha Lista de Tarefas</h1>

      {/* Renderiza o formulário de adição de tarefas */}
      <TaskForm onTaskAdded={handleTaskAdded} />

      <hr style={{ margin: '30px 0' }} />

      <h3>Tarefas Cadastradas</h3>
      {loadingTasks ? (
        <p>Carregando tarefas...</p>
      ) : errorTasks ? (
        <p style={{ color: 'red' }}>{errorTasks}</p>
      ) : tasks.length === 0 ? (
        <p>
          Nenhuma tarefa cadastrada ainda. Adicione uma usando o formulário
          acima!
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                border: '1px solid #ddd',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '5px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <h4>
                {task.titulo} ({task.status})
              </h4>
              <p>Descrição: {task.descricao}</p>
              <p>Criado em: {task.data_criacao}</p>
              {task.tags && task.tags.length > 0 && (
                <p>Tags: {task.tags.join(', ')}</p>
              )}
              {task.comentarios && task.comentarios.length > 0 && (
                <div>
                  <h5>Comentários:</h5>
                  <ul style={{ listStyle: 'disc', marginLeft: '20px' }}>
                    {task.comentarios.map((comment, idx) => (
                      <li key={idx}>
                        <strong>{comment.autor}</strong> ({comment.data}):{' '}
                        {comment.comentario}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
