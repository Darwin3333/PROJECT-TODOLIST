// src/components/TaskForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import type{ CommentPayload, TaskPayload, User} from '../types/interfaces';
import './TaskForm.css';

export interface TaskFormProps {
  onTaskAdded: () => void;
  currentUser: User | null; // Adicione esta linha
}

const TaskForm = ({ onTaskAdded, currentUser } : TaskFormProps) => {
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

     // Adicione esta verificação se a tarefa SÓ PODE ser criada por um usuário logado
    if (!currentUser) {
      setError("Por favor, faça login para criar uma tarefa.");
      setLoading(false);
      return; // Impede a submissão se não houver usuário logado
    }    

    const newTask: TaskPayload = {
      titulo,
      descricao,
      status,
      tags, // Envia as tags que o usuário adicionou
      comentarios: comments, // Envia os comentários que o usuário adicionou
      user_id: currentUser.id
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
      className='task-form-container'
    >
      <h2>Adicionar Nova Tarefa</h2>
      <form onSubmit={handleSubmit}>
        {/* Campos Título, Descrição, Status - permanecem os mesmos */}
        <div className='form-group'>
          <label htmlFor="titulo">Título:</label>
          <input
            type="text"
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        <div className='form-group'>
          <label htmlFor="descricao">Descrição:</label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={3}
          ></textarea>
        </div>

        <div className='form-group'>
          <label htmlFor="status">Status:</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskPayload['status'])}
          >
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluída">Concluída</option>
          </select>
        </div>

        {/* Campo para Tags */}
        <div className="tags-section">
          <label htmlFor="tagInput">Adicionar Tags:</label>
          <div className="tag-input-group">
            <input
              type="text"
              id="tagInput"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              placeholder="Ex: Urgente, Estudo"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="add-tag-button"
            >
              Adicionar Tag
            </button>
          </div>

          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="tag-item">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="remove-tag-button"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Campo para Comentários */}
        <div className="comments-section"
        >
          <label>Adicionar Comentários:</label>
          <div className="comment-input-group">
            <input
              type="text"
              value={commentAutor}
              onChange={(e) => setCommentAutor(e.target.value)}
              placeholder="Seu nome"
            />
            <textarea
              value={currentCommentText}
              onChange={(e) => setCurrentCommentText(e.target.value)}
              placeholder="Seu comentário..."
              rows={2}
            ></textarea>
            <button
              type="button"
              onClick={handleAddComment}
              className="add-comment-button"
            >
              Adicionar Comentário
            </button>
          </div>

          {comments.length > 0 && (
            <div className="comments-list-container">
              <h5>Comentários Adicionados:</h5>
              <ul className="comments-list">
                {comments.map((comment, index) => (
                  <li key={index} className="comment-item">
                    <div>
                      <strong>{comment.autor}</strong>: {comment.comentario}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveComment(index)}
                      className="remove-comment-button"
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
          className="submit-button"
        >
          {loading ? 'Adicionando...' : 'Adicionar Tarefa'}
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {success && (
        <p className="success-message">{success}</p>
      )}
    </div>
  );
};

export default TaskForm;
