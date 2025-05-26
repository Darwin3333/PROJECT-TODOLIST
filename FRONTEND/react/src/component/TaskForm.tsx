// src/components/TaskForm.tsx
import React, { useState } from 'react';
import axios from 'axios';

// Definindo a interface para os dados do Comentário
// Deve corresponder ao seu Comentario do FastAPI
interface CommentPayload {
  autor: string;
  comentario: string;
  data: string; // A data será gerada no backend, mas o modelo a espera
}

interface TaskPayload {
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  tags: string[];
  comentarios: CommentPayload[];
}

interface TaskFormProps {
  onTaskAdded: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onTaskAdded }) => {
  const [titulo, setTitulo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [status, setStatus] = useState<TaskPayload['status']>('pendente');

  // Estados para Tags
  const [currentTag, setCurrentTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  // Estados para Comentários
  const [commentAutor, setCommentAutor] = useState<string>('');
  const [currentCommentText, setCurrentCommentText] = useState<string>('');
  const [comments, setComments] = useState<CommentPayload[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Função para adicionar uma tag
  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      // Garante que não é vazio e não é duplicado
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  // Função para remover uma tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Função para adicionar um comentário
  const handleAddComment = () => {
    if (commentAutor.trim() && currentCommentText.trim()) {
      const newComment: CommentPayload = {
        autor: commentAutor.trim(),
        comentario: currentCommentText.trim(),
        data: new Date().toISOString(), // Data formatada para a UI, o backend vai gerar a dele
      };
      setComments([...comments, newComment]);
      setCommentAutor('');
      setCurrentCommentText('');
    }
  };

  // Função para remover um comentário
  const handleRemoveComment = (indexToRemove: number) => {
    setComments(comments.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const newTask: TaskPayload = {
      titulo,
      descricao,
      status,
      tags, // Envia as tags que o usuário adicionou
      comentarios: comments, // Envia os comentários que o usuário adicionou
    };

    try {
      const response = await axios.post(
        'http://localhost:8000/tarefas/',
        newTask
      );

      setSuccess(
        `Tarefa "${response.data.titulo}" (ID: ${response.data.id}) criada com sucesso!`
      );

      // Limpa o formulário
      setTitulo('');
      setDescricao('');
      setStatus('pendente');
      setTags([]); // Limpa as tags
      setCurrentTag('');
      setComments([]); // Limpa os comentários
      setCommentAutor('');
      setCurrentCommentText('');

      if (onTaskAdded) {
        onTaskAdded();
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(
          `Erro ao criar tarefa: ${err.response.data.detail || err.message}`
        );
      } else {
        setError(`Erro desconhecido: ${err.message}`);
      }
      console.error('Erro na criação da tarefa:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h2>Adicionar Nova Tarefa</h2>
      <form onSubmit={handleSubmit}>
        {/* Campos Título, Descrição, Status - permanecem os mesmos */}
        <div style={{ marginBottom: '10px' }}>
          <label
            htmlFor="titulo"
            style={{ display: 'block', marginBottom: '5px' }}
          >
            Título:
          </label>
          <input
            type="text"
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label
            htmlFor="descricao"
            style={{ display: 'block', marginBottom: '5px' }}
          >
            Descrição:
          </label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={3}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          ></textarea>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label
            htmlFor="status"
            style={{ display: 'block', marginBottom: '5px' }}
          >
            Status:
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskPayload['status'])}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluída">Concluída</option>
          </select>
        </div>

        {/* Campo para Tags */}
        <div
          style={{
            marginBottom: '15px',
            border: '1px solid #eee',
            padding: '10px',
            borderRadius: '5px',
            backgroundColor: '#fdfdfd',
          }}
        >
          <label
            htmlFor="tagInput"
            style={{ display: 'block', marginBottom: '5px' }}
          >
            Adicionar Tags:
          </label>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <input
              type="text"
              id="tagInput"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              placeholder="Ex: Urgente, Estudo"
              style={{ flexGrow: 1, padding: '8px', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              style={{
                padding: '8px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Adicionar Tag
            </button>
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: '#e0e0e0',
                    padding: '5px 10px',
                    borderRadius: '15px',
                    fontSize: '0.9em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '1.1em',
                      lineHeight: '1',
                      padding: '0',
                    }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Campo para Comentários */}
        <div
          style={{
            marginBottom: '15px',
            border: '1px solid #eee',
            padding: '10px',
            borderRadius: '5px',
            backgroundColor: '#fdfdfd',
          }}
        >
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Adicionar Comentários:
          </label>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              marginBottom: '10px',
            }}
          >
            <input
              type="text"
              value={commentAutor}
              onChange={(e) => setCommentAutor(e.target.value)}
              placeholder="Seu nome"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
            <textarea
              value={currentCommentText}
              onChange={(e) => setCurrentCommentText(e.target.value)}
              placeholder="Seu comentário..."
              rows={2}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            ></textarea>
            <button
              type="button"
              onClick={handleAddComment}
              style={{
                padding: '8px 12px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Adicionar Comentário
            </button>
          </div>
          {comments.length > 0 && (
            <div>
              <h5 style={{ marginBottom: '5px' }}>Comentários Adicionados:</h5>
              <ul style={{ listStyle: 'none', paddingLeft: '0' }}>
                {comments.map((comment, index) => (
                  <li
                    key={index}
                    style={{
                      background: '#e9ecef',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong>{comment.autor}</strong>: {comment.comentario}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveComment(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: '1.1em',
                      }}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Adicionando...' : 'Adicionar Tarefa'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && (
        <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>
      )}
    </div>
  );
};

export default TaskForm;
