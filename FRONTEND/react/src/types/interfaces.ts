export interface CommentPayload {
  autor: string;
  comentario: string;
  data: string; // A data será gerada no backend, mas o modelo a espera
}

export interface TaskPayload {
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  tags: string[];
  comentarios: CommentPayload[];
}

export interface TaskFormProps {
  onTaskAdded: () => void;
}

export interface Task {
  id: string; // O _id do MongoDB vem como string 'id'
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  data_criacao: string;
  tags: string[];
  comentarios: Comment[];
}

export interface Comment {
  autor: string;
  comentario: string;
  data: string;
}

export interface TagInputProps {
  tags: string[]; // Um array das tags atuais
  onAddTag: (tag: string) => void; // Função para adicionar uma nova tag
  onRemoveTag: (tag: string) => void; // Função para remover uma tag existente
}

export interface CommentPayload {
  autor: string;
  comentario: string;
  data: string; // Representa a data como uma string ISO
}

export interface CommentInputProps {
  comments: CommentPayload[]; // Um array dos comentários atuais
  onAddComment: (comment: CommentPayload) => void; // Função para adicionar um novo comentário
  onRemoveComment: (index: number) => void; // Função para remover um comentário por índice
}