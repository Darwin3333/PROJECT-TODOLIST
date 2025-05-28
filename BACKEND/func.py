from pymongo import MongoClient
from conexao import colecao_tarefas # Certifique-se que 'conexao.py' está correto
from datetime import datetime
from bson import ObjectId, errors # Importar ObjectId para trabalhar com _id do MongoDB

# NOTA: As funções agora recebem argumentos e retornam dados, não mais usam input()/print() diretamente.

def criar_tarefa(tarefa_data: dict):
    """
    Cria uma nova tarefa no banco de dados.
    Recebe um dicionário com os dados da tarefa.
    Retorna o ObjectId da tarefa criada.
    """
    # Adiciona data de criação e inicializa tags/comentários se não existirem
    if "data_criacao" not in tarefa_data:
        tarefa_data["data_criacao"] = datetime.now()
    if "tags" not in tarefa_data or not isinstance(tarefa_data["tags"], list):
        tarefa_data["tags"] = []
    if "comentarios" not in tarefa_data or not isinstance(tarefa_data["comentarios"], list):
        tarefa_data["comentarios"] = []
        
    result = colecao_tarefas.insert_one(tarefa_data)
    return result.inserted_id

def listar_tarefas():
    """
    Lista todas as tarefas no banco de dados, transformando _id para id e formatando datas.
    """
    tarefas_formatadas = []
    for tarefa_db in colecao_tarefas.find():
        tarefa_formatada = {
            "id": str(tarefa_db["_id"]),
            "titulo": tarefa_db.get("titulo"),
            "descricao": tarefa_db.get("descricao"),
            "status": tarefa_db.get("status"),
            "user_id": tarefa_db.get("user_id"),
            "tags": tarefa_db.get("tags", []),
            "comentarios": []
        }

        if isinstance(tarefa_db.get("data_criacao"), datetime):
            tarefa_formatada["data_criacao"] = tarefa_db.get("data_criacao").isoformat()
        else:
            tarefa_formatada["data_criacao"] = str(tarefa_db.get("data_criacao", ""))

        comentarios_db = tarefa_db.get("comentarios", [])
        for comentario_original in comentarios_db:
            comentario_formatado = {
                "autor": comentario_original.get("autor"),
                "comentario": comentario_original.get("comentario"),
                "data": None # <--- MUDANÇA AQUI: Inicializa a data como None
            }
            
            # MUDANÇA CRÍTICA AQUI: Lógica para garantir que data é datetime ou None
            original_data = comentario_original.get("data")
            if original_data and str(original_data).strip() != '': # Se existe e não é string vazia
                if isinstance(original_data, datetime):
                    comentario_formatado["data"] = original_data.isoformat()
                else:
                    try:
                        # Tenta converter string para datetime, depois para ISO string
                        dt_obj = datetime.fromisoformat(str(original_data).replace('Z', '+00:00'))
                        comentario_formatado["data"] = dt_obj.isoformat()
                    except ValueError:
                        comentario_formatado["data"] = None # Se falhar, define como None
            else:
                comentario_formatado["data"] = None # Se a data original é None ou string vazia, define como None
            # FIM DA MUDANÇA CRÍTICA --->

            tarefa_formatada["comentarios"].append(comentario_formatado)
        tarefas_formatadas.append(tarefa_formatada)
    return tarefas_formatadas

def buscar_tarefa_por_id(tarefa_id: str):
    """
    Busca uma tarefa específica pelo seu ID, transformando _id para id e formatando datas.
    Retorna a tarefa encontrada ou None se não existir.
    """
    try:
        obj_id = ObjectId(tarefa_id)
        tarefa_db = colecao_tarefas.find_one({"_id": obj_id})
        if tarefa_db:
            # <--- SUBSTITUA TODO O CONTEÚDO DO IF tarefa_db: POR ISSO:
            tarefa_formatada = {
                "id": str(tarefa_db["_id"]), # Transforma _id para id e string
                "titulo": tarefa_db.get("titulo"),
                "descricao": tarefa_db.get("descricao"),
                "status": tarefa_db.get("status"),
                "user_id": tarefa_db.get("user_id"), # Incluir user_id ao buscar por ID
                "tags": tarefa_db.get("tags", []),
                "comentarios": [] # Inicializa
            }

            # Formatação de data_criacao
            if isinstance(tarefa_db.get("data_criacao"), datetime):
                tarefa_formatada["data_criacao"] = tarefa_db.get("data_criacao").isoformat()
            else:
                tarefa_formatada["data_criacao"] = str(tarefa_db.get("data_criacao", ""))

            # Formatação de comentários
            comentarios_db = tarefa_db.get("comentarios", [])
            for comentario_original in comentarios_db:
                comentario_formatado = {
                    "autor": comentario_original.get("autor"),
                    "comentario": comentario_original.get("comentario"),
                    "data": ""
                }
                if isinstance(comentario_original.get("data"), datetime):
                    comentario_formatado["data"] = comentario_original.get("data").isoformat()
                else:
                    comentario_formatado["data"] = str(comentario_original.get("data", ""))
                tarefa_formatada["comentarios"].append(comentario_formatado)

            return tarefa_formatada
        return None
    except errors.InvalidId: # <--- ADICIONE ESTE BLOCO except
        print(f"Erro: ID inválido '{tarefa_id}'")
        return None
    except Exception as e:
        print(f"Erro ao buscar tarefa por ID no func.py: {e}")
        raise # Re-lança a exceção para ser tratada pela rota


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
    except errors.InvalidId: # <--- ADICIONE ESTE BLOCO
        print(f"Erro: ID inválido para adicionar tag '{tarefa_id}'")
        return None
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
    except errors.InvalidId: # <--- ADICIONE ESTE BLOCO
        print(f"Erro: ID inválido para adicionar tag '{tarefa_id}'")
        return None
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
    except errors.InvalidId: # <--- ADICIONE ESTE BLOCO
        print(f"ERRO: FUNC - ID inválido para deletar: '{tarefa_id}'")
        return None
    except Exception:
        return None


def deletar_tarefa(tarefa_id: str):
    """
    Deleta uma tarefa do banco de dados.
    Recebe o ID da tarefa.
    Retorna o resultado da operação de deleção do MongoDB.
    """
    print(f"DEBUG: FUNC - deletar_tarefa chamada com ID: {tarefa_id}")
    try:
        object_id = ObjectId(tarefa_id)
        print(f"DEBUG: FUNC - Converteu para ObjectId: {object_id}")
        result = colecao_tarefas.delete_one({"_id": object_id})
        return result
    except errors.InvalidId as e_invalid_id: # <--- MUDANÇA AQUI: Capture a exceção com um nome diferente
        print(f"ERRO: FUNC - ID inválido para deletar: '{tarefa_id}' - Detalhes: {e_invalid_id}")
        return None
    except Exception:
        print(f"DEBUG: FUNC - ERRO ao converter ObjectId ou deletar: {e}")
        return None # Ou levantar uma exceção mais específica

def buscar_tarefas_por_criterio(criterio: dict):
    """
    Busca tarefas com base em um critério, formatando os resultados.
    """
    tarefas_encontradas = []
    for tarefa_db in colecao_tarefas.find(criterio):
        # <--- SUBSTITUA TODO O CONTEÚDO DO SEU LOOP for tarefa in colecao_tarefas.find(criterio): POR ISSO:
        tarefa_formatada = {
            "id": str(tarefa_db["_id"]), # Garante 'id' e string
            "titulo": tarefa_db.get("titulo"),
            "descricao": tarefa_db.get("descricao"),
            "status": tarefa_db.get("status"),
            "user_id": tarefa_db.get("user_id"), # Incluir user_id ao buscar por critério
            "tags": tarefa_db.get("tags", []),
            "comentarios": []
        }

        if isinstance(tarefa_db.get("data_criacao"), datetime):
            tarefa_formatada["data_criacao"] = tarefa_db.get("data_criacao").isoformat()
        else:
            tarefa_formatada["data_criacao"] = str(tarefa_db.get("data_criacao", ""))

        comentarios_db = tarefa_db.get("comentarios", [])
        for comentario_original in comentarios_db:
            comentario_formatado = {
                "autor": comentario_original.get("autor"),
                "comentario": comentario_original.get("comentario"),
                "data": ""
            }
            if isinstance(comentario_original.get("data"), datetime):
                comentario_formatado["data"] = comentario_original.get("data").isoformat()
            else:
                comentario_formatado["data"] = str(comentario_original.get("data", ""))
            tarefa_formatada["comentarios"].append(comentario_formatado)

        tarefas_encontradas.append(tarefa_formatada)
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