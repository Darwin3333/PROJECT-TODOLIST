import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get('http://localhost:8000/');
        setTasks(response.data.tarefas);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (loading) return <div>Carregando tarefas...</div>;
  if (error) return <div>Erro ao carregar tarefas: {error.message}</div>;

  return (
    <div>
      <h1>Minhas Tarefas</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.titulo} - {task.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
