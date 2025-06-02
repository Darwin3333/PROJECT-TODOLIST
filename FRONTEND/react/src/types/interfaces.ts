// src/types/interfaces.ts

// --- Interface para Usuário ---
export interface User {
  id_user: string; // UUID do usuário, vindo do backend (substitui o antigo 'id')
  username: string;
  data_criacao?: string;
}

// --- Interfaces para Comentário ---
export interface CommentForPayload {
  id_comentario?: string; // UUID do comentário (opcional: presente se atualizando um existente, ausente para novos)
  id_autor: string;      // UUID do usuário que fez o comentário (obrigatório)
  comentario: string;
  data?: string;
}

// Usado para EXIBIR comentários recebidos do backend
export interface CommentForDisplay {
  id_comentario: string; // UUID do comentário
  id_autor: string;      // UUID do usuário que fez o comentário
  comentario: string;
  data: string;          // String ISO da data, formatada pelo backend (ex: "2024-05-30T10:00:00Z")
}

// --- Interfaces para Tarefa ---

// Usado ao ENVIAR dados para CRIAR uma nova tarefa
export interface TaskToCreatePayload {
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  tags: string[];
  comentarios: CommentForPayload[]; // Lista de comentários novos (sem id_comentario, sem data)
  user_id: string;                 // UUID do usuário dono da tarefa (obrigatório)
}

// Usado ao ENVIAR dados para ATUALIZAR uma tarefa existente
// Todos os campos são opcionais, pois é uma atualização parcial (PATCH/PUT)
export interface TaskToUpdatePayload {
  titulo?: string;
  descricao?: string;
  status?: 'pendente' | 'em andamento' | 'concluída';
  tags?: string[];
  comentarios?: CommentForPayload[]; // Pode conter comentários existentes (com id_comentario) e novos (sem id_comentario)
  // user_id geralmente não é atualizável, então não está aqui.
}

// Usado para EXIBIR tarefas recebidas do backend e para o estado no frontend
export interface Task {
  id: string;                      // UUID da tarefa
  user_id: string;                 // UUID do usuário dono da tarefa
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  tags: string[];
  comentarios: CommentForDisplay[];  // Lista de comentários formatados para exibição
  data_criacao: string;            // String ISO da data, formatada pelo backend
  data_atualizacao: string;        // String ISO da data, formatada pelo backend (agora não opcional)
}


export interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export interface CommentInputProps {
  comments: CommentForPayload[]; // Ou CommentForDisplay, dependendo do contexto do componente
  onAddComment: (comment: CommentForPayload) => void;
  onRemoveComment: (indexOrId: number | string) => void; // Pode ser por índice ou ID do comentário
}