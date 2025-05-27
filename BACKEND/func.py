from pymongo import MongoClient
from conexao import colecao_tarefas # Certifique-se que 'conexao.py' está correto
from datetime import datetime
from bson import ObjectId # Importar ObjectId para trabalhar com _id do MongoDB

# NOTA: As funções agora recebem argumentos e retornam dados, não mais usam input()/print() diretamente.

def criar_tarefa(tarefa_data: dict):
    """
    Cria uma nova tarefa no banco de dados.
    Recebe um dicionário com os dados da tarefa.
    Retorna o ObjectId da tarefa criada.
    """
    # Adiciona data de criação e inicializa tags/comentários se não existirem
    if "data_criacao" not in tarefa_data:
        tarefa_data["data_criacao"] = datetime.now().isoformat()
    if "tags" not in tarefa_data or not isinstance(tarefa_data["tags"], list):
        tarefa_data["tags"] = []
    if "comentarios" not in tarefa_data or not isinstance(tarefa_data["comentarios"], list):
        tarefa_data["comentarios"] = []
        
    result = colecao_tarefas.insert_one(tarefa_data)
    return result.inserted_id

def listar_tarefas():
    """
    Lista todas as tarefas no banco de dados.
    Retorna uma lista de dicionários de tarefas, convertendo ObjectId para string
    e garantindo que data_criacao seja string.
    """
    tarefas = []
    for tarefa in colecao_tarefas.find():
        # REVERTA ESTA LINHA PARA APENAS str(tarefa['_id'])
        # E NÃO RENOMEIE PARA 'id' AQUI TAMBÉM
        tarefa['_id'] = str(tarefa['_id']) # Mantenha esta linha para converter para string

        # Garante que data_criacao é string (mantenha isso)
        if isinstance(tarefa.get('data_criacao'), datetime):
            tarefa['data_criacao'] = tarefa['data_criacao'].isoformat()

        tarefas.append(tarefa)
    return tarefas

def buscar_tarefa_por_id(tarefa_id: str):
    """
    Busca uma tarefa específica pelo seu ID.
    Retorna a tarefa encontrada ou None se não existir.
    """
    try:
        tarefa = colecao_tarefas.find_one({"_id": ObjectId(tarefa_id)})
        if tarefa:
            # Garante que data_criacao é string (mantenha isso)
            if isinstance(tarefa.get('data_criacao'), datetime):
                tarefa['data_criacao'] = tarefa['data_criacao'].isoformat()

          

        return tarefa # Retorne o dicionário com '_id'
    except Exception:
        return None
def atualizar_tarefa(tarefa_id: str, dados_atualizacao: dict):
    """
    Atualiza uma tarefa existente no banco de dados.
    Recebe o ID da tarefa e um dicionário com os campos a serem atualizados.
    Retorna o resultado da operação de atualização do MongoDB.
    """
    try:
        # Certifica-se de que nenhum campo como _id é enviado para atualização
        dados_atualizacao.pop('_id', None)
        # Se você tiver a data_criacao e não quiser que ela seja atualizada, remova-a também
        dados_atualizacao.pop('data_criacao', None)

        result = colecao_tarefas.update_one(
            {"_id": ObjectId(tarefa_id)},
            {"$set": dados_atualizacao}
        )
        return result
    except Exception:
        return None # Ou levantar uma exceção mais específica

def adicionar_tag_a_tarefa(tarefa_id: str, tag_nova: str):
    """
    Adiciona uma nova tag a uma tarefa.
    Retorna o resultado da operação de atualização.
    """
    try:
        result = colecao_tarefas.update_one(
            {"_id": ObjectId(tarefa_id)},
            {"$addToSet": {"tags": tag_nova}} # $addToSet garante que a tag é única
        )
        return result
    except Exception:
        return None

def atualizar_tag_tarefa(tarefa_id: str, tag_antiga: str, tag_nova: str):
    """
    Atualiza uma tag existente por uma nova em uma tarefa.
    Retorna o resultado da operação de atualização.
    """
    try:
        # Remove a tag antiga e adiciona a nova
        result = colecao_tarefas.update_one(
            {"_id": ObjectId(tarefa_id)},
            {"$pull": {"tags": tag_antiga}, "$addToSet": {"tags": tag_nova}}
        )
        return result
    except Exception:
        return None


def deletar_tarefa(tarefa_id: str):
    """
    Deleta uma tarefa do banco de dados.
    Recebe o ID da tarefa.
    Retorna o resultado da operação de deleção do MongoDB.
    """
    try:
        result = colecao_tarefas.delete_one({"_id": ObjectId(tarefa_id)})
        return result
    except Exception:
        return None # Ou levantar uma exceção mais específica

def buscar_tarefas_por_criterio(criterio: dict):
    """
    Busca tarefas com base em um critério.
    Recebe um dicionário com o filtro (ex: {"status": "pendente"}).
    Retorna uma lista de tarefas encontradas.
    """
    tarefas_encontradas = []
    for tarefa in colecao_tarefas.find(criterio):
        tarefa['_id'] = str(tarefa['_id']) # Converte ObjectId para string para JSON
        tarefas_encontradas.append(tarefa)
    return tarefas_encontradas

def adicionar_comentario(tarefa_id: str, autor: str, comentario_texto: str):
    """
    Adiciona um comentário a uma tarefa específica.
    Retorna o resultado da operação de atualização.
    """
    try:
        novo_comentario = {
            "autor": autor,
            "comentario": comentario_texto,
            "data": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        result = colecao_tarefas.update_one(
            {"_id": ObjectId(tarefa_id)},
            {"$push": {"comentarios": novo_comentario}}
        )
        return result
    except Exception:
        return None