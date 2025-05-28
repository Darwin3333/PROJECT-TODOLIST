// src/components/TaskSearch.tsx
import { useState } from 'react';
import { Button } from 'react-bootstrap'; // Importe Button do react-bootstrap
import './TaskSearch.css'; // Opcional: crie um CSS para este componente

interface TaskSearchProps {
  onSearch: (filters: { status?: string; date?: string; tag?: string }) => void;
  onClear: () => void; // Para limpar a pesquisa
}

const TaskSearch = ({ onSearch, onClear } : TaskSearchProps) => {
  const [status, setStatus] = useState<string>('');
  const [date, setDate] = useState<string>(''); // Formato AAAA-MM-DD
  const [tag, setTag] = useState<string>('');

  const handleSearch = () => {
    const filters: { status?: string; date?: string; tag?: string } = {};
    if (status) filters.status = status;
    if (date) filters.date = date;
    if (tag) filters.tag = tag;
    onSearch(filters);
  };

  const handleClear = () => {
    setStatus('');
    setDate('');
    setTag('');
    onClear(); // Chame o callback para o App.tsx limpar a lista
  };

  return (
    <div className="task-search-container mb-4 p-3 border rounded bg-light">
      <div className="row g-3"> {/* g-3 para espaçamento entre colunas e linhas */}
        <div className="col-md-3">
          <label htmlFor="searchStatus" className="form-label visually-hidden">Status:</label>
          <select
            id="searchStatus"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluída">Concluída</option>
          </select>
        </div>
        <div className="col-md-3">
          <label htmlFor="searchDate" className="form-label visually-hidden">Data de Criação:</label>
          <input
            type="date" // Usar type="date" para o seletor de data
            id="searchDate"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="AAAA-MM-DD"
          />
        </div>
        <div className="col-md-3">
          <label htmlFor="searchTag" className="form-label visually-hidden">Tag:</label>
          <input
            type="text"
            id="searchTag"
            className="form-control"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Buscar por Tag"
          />
        </div>
        <div className="col-md-3 d-flex justify-content-end">
          <Button variant="primary" onClick={handleSearch} className="me-2">
            Buscar
          </Button>
          <Button variant="danger" onClick={handleClear}>
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskSearch;
