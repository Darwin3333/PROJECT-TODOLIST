// src/components/TaskSearch.tsx
import { useState } from 'react';
import { Button } from 'react-bootstrap';

interface TaskSearchProps {
  onSearch: (filters: {
    status?: string;
    data_criacao?: string;
    tag?: string;
    user_id?: string;
  }) => void;
  onClear: () => void;
}

const TaskSearch = ({ onSearch, onClear }: TaskSearchProps) => {
  const [status, setStatus] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [tag, setTag] = useState<string>('');

  const handleSearch = () => {
    const filters: { status?: string; data_criacao?: string; tag?: string } =
      {};
    if (status) filters.status = status;
    if (date) filters.data_criacao = date;
    if (tag) filters.tag = tag;
    onSearch(filters);
  };

  const handleClear = () => {
    setStatus('');
    setDate('');
    setTag('');
    onClear();
  };

  return (
    <div className="task-search-container mb-4 p-3 border rounded bg-light shadow-sm">
      <div className="row g-3 align-items-end">
        <div className="col-md-3 col-sm-6">
          <label htmlFor="searchStatus" className="form-label">
            Status:
          </label>
          <select
            id="searchStatus"
            className="form-select form-select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluída">Concluída</option>
          </select>
        </div>
        <div className="col-md-3 col-sm-6">
          <label htmlFor="searchDate" className="form-label">
            Data de Criação:
          </label>
          <input
            type="date"
            id="searchDate"
            className="form-control form-control-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="col-md-3 col-sm-6">
          <label htmlFor="searchTag" className="form-label">
            Tag:
          </label>
          <input
            type="text"
            id="searchTag"
            className="form-control form-control-sm"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Buscar por Tag"
          />
        </div>
        <div className="col-md-3 col-sm-6 d-flex justify-content-start justify-content-md-end pt-3 pt-sm-0">
          <Button
            variant="primary"
            onClick={handleSearch}
            className="me-2 btn-sm"
          >
            <i className="bi bi-search"></i>
            <span className="ms-1">Buscar</span>
          </Button>
          <Button
            variant="outline-secondary"
            onClick={handleClear}
            className="btn-sm"
          >
            <i className="bi bi-eraser"></i>
            <span className="ms-1">Limpar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskSearch;
