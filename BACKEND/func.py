from pymongo import MongoClient
from conexao import colecao_tarefas, redis_client # Certifique-se que 'conexao.py' está correto
from datetime import datetime
from bson import ObjectId, errors # Importar ObjectId para trabalhar com _id do MongoDB

# NOTA: As funções agora recebem argumentos e retornam dados, não mais usam input()/print() diretamente.

def criar_tarefa(tarefa_data: dict):
    if "data_criacao" not in tarefa_data:
        tarefa_data["data_criacao"] = datetime.now()
    if "tags" not in tarefa_data or not isinstance(tarefa_data["tags"], list):
        tarefa_data["tags"] = []
    if "comentarios" not in tarefa_data or not isinstance(tarefa_data["comentarios"], list):
        tarefa_data["comentarios"] = []
        
    result = colecao_tarefas.insert_one(tarefa_data)

    user_id = str(tarefa_data.get("user_id", "anonimo")) # Garante que user_id é string, fallback para 'anonimo'
    # --- NOVO: Lógica de Métricas Redis para CRIAÇÃO ---
    
    # Métrica 1: Contadores de Status de Tarefas (Pendente)
    initial_status = tarefa_data.get("status", "pendente") # Pega o status da tarefa criada
    redis_client.incr(f"user:{user_id}:tasks:status:{initial_status}")

    # Métrica 4: Tarefas criadas hoje
    today_key = datetime.now().strftime("%Y-%m-%d")
    redis_client.incr(f"user:{user_id}:tasks:created_today:{today_key}")
    # Opcional: Defina um TTL para a chave diária (ex: 24h + margem, para expirar no dia seguinte)
    redis_client.expire(f"user:{user_id}:tasks:created_today:{today_key}", 86400 * 2) # Expira em 2 dias
    # --- FIM NOVO ---

     # --- NOVO: Métrica 3: Tags Mais Utilizadas (na CRIAÇÃO) ---
    tags_da_tarefa = tarefa_data.get("tags", [])
    for tag in tags_da_tarefa:
        # ZINCRBY: Incrementa o score de um membro em um Sorted Set.
        # A chave 'user:<user_id>:tags:top' armazena o ranking de tags para o usuário.
        redis_client.zincrby(f"user:{user_id}:tags:top", 1, tag)
    # --- FIM NOVO ---

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
        tarefa_antiga = colecao_tarefas.find_one({"_id": ObjectId(tarefa_id)})
        # Certifica-se de que nenhum campo como _id é enviado para atualização
        dados_atualizacao.pop('_id', None)
        # Se você tiver a data_criacao e não quiser que ela seja atualizada, remova-a também
        dados_atualizacao.pop('data_criacao', None)

        if "comentarios" in dados_atualizacao and isinstance(dados_atualizacao["comentarios"], list):
            processed_comentarios_update = []
            for comment_dict in dados_atualizacao["comentarios"]:
                if "data" not in comment_dict or comment_dict["data"] is None or (isinstance(comment_dict["data"], str) and comment_dict["data"].strip() == ''):
                    comment_dict["data"] = datetime.now()
                processed_comentarios_update.append(comment_dict)
            dados_atualizacao["comentarios"] = processed_comentarios_update

        result = colecao_tarefas.update_one(
            {"_id": ObjectId(tarefa_id)},
            {"$set": dados_atualizacao}
        )
        # --- NOVO: Lógica de Métricas Redis para ATUALIZAÇÃO ---
        if result and result.modified_count == 1 and tarefa_antiga:
            user_id = str(tarefa_antiga.get("user_id", "anonimo"))
            old_status = tarefa_antiga.get("status", "pendente") # Pega o status antigo
            new_status = dados_atualizacao.get("status", old_status) # Pega o novo status

            if old_status != new_status:
                # Decrementa o contador do status antigo
                redis_client.decr(f"user:{user_id}:tasks:status:{old_status}")
                # Incrementa o contador do novo status
                redis_client.incr(f"user:{user_id}:tasks:status:{new_status}")
                print(f"DEBUG REDIS: Tarefa {tarefa_id} status alterado de '{old_status}' para '{new_status}' para user:{user_id}")

                # --- NOVO: Métrica 2: Totalizadores por Período (Concluídas por Dia) ---
                if new_status == 'concluída':
                    today_key = datetime.now().strftime("%Y-%m-%d")
                    redis_client.incr(f"user:{user_id}:tasks:completed:{today_key}")
                    # Opcional: TTL para limpeza automática de chaves diárias após, digamos, 60 dias
                    redis_client.expire(f"user:{user_id}:tasks:completed:{today_key}", 86400 * 60)
                    print(f"DEBUG REDIS: Tarefa {tarefa_id} concluída, contador diário incrementado para user:{user_id} em {today_key}")
                # --- FIM NOVO ---

            else:
                print(f"DEBUG REDIS: Tarefa {tarefa_id} atualizada, mas status '{old_status}' não mudou para user:{user_id}. Contadores Redis não alterados.")
        else:
            print(f"DEBUG REDIS: Tarefa {tarefa_id} não foi modificada no MongoDB. Métricas Redis não alteradas.")
        # --- FIM NOVO ---

            # --- NOVO: Métrica 3: Tags Mais Utilizadas (na ATUALIZAÇÃO) ---
            old_tags = tarefa_antiga.get("tags", [])
            new_tags = dados_atualizacao.get("tags", [])

            # Tags que foram REMOVIDAS
            for tag in old_tags:
                if tag not in new_tags:
                    redis_client.zincrby(f"user:{user_id}:tags:top", -1, tag) # Decrementa o score
                    print(f"DEBUG REDIS: Tag '{tag}' decrementada para user:{user_id}")

            # Tags que foram ADICIONADAS
            for tag in new_tags:
                if tag not in old_tags:
                    redis_client.zincrby(f"user:{user_id}:tags:top", 1, tag) # Incrementa o score
                    print(f"DEBUG REDIS: Tag '{tag}' incrementada para user:{user_id}")
            # --- FIM NOVO ---

        return result
    except errors.InvalidId: # <--- ADICIONE ESTE BLOCO
        print(f"Erro: ID inválido para adicionar tag '{tarefa_id}'")
        return None
    except Exception as e:
        print(f"Erro ao atualizar tarefa no func.py: {e}")
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
        # Primeiro, obtenha a tarefa ANTES da deleção para saber o status e user_id
        tarefa_a_deletar = colecao_tarefas.find_one({"_id": ObjectId(tarefa_id)})

        object_id = ObjectId(tarefa_id)
        print(f"DEBUG: FUNC - Converteu para ObjectId: {object_id}")
        result = colecao_tarefas.delete_one({"_id": object_id})

        # --- NOVO: Lógica de Métricas Redis para DELEÇÃO ---
        if result and result.deleted_count == 1 and tarefa_a_deletar:
            user_id = str(tarefa_a_deletar.get("user_id", "anonimo"))
            task_status = tarefa_a_deletar.get("status", "pendente") # Pega o status da tarefa deletada
            redis_client.decr(f"user:{user_id}:tasks:status:{task_status}")

             # --- NOVO: Métrica 3: Tags Mais Utilizadas (na DELEÇÃO) ---
            tags_da_tarefa_deletada = tarefa_a_deletar.get("tags", [])
            for tag in tags_da_tarefa_deletada:
                redis_client.zincrby(f"user:{user_id}:tags:top", -1, tag) # Decrementa o score
                print(f"DEBUG REDIS: Tag '{tag}' decrementada devido a deleção para user:{user_id}")
            # --- FIM NOVO ---
        # --- FIM NOVO ---

        return result
    except errors.InvalidId as e_invalid_id: # <--- MUDANÇA AQUI: Capture a exceção com um nome diferente
        print(f"ERRO: FUNC - ID inválido para deletar: '{tarefa_id}' - Detalhes: {e_invalid_id}")
        return None
    except Exception as e:
        print(f"DEBUG: FUNC - ERRO ao converter ObjectId ou deletar: {e}")
    except Exception as e_general:
        print(f"ERRO: FUNC - Erro geral ao deletar tarefa: {e_general}")
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
    

def _reset_redis_metrics():
    """
    Função interna para resetar todas as chaves de métricas do Redis para um usuário.
    Use com cautela, pois apaga todos os contadores relacionados às tarefas.
    """
    print("DEBUG RESET: Resetando métricas Redis...")
    for key in redis_client.scan_iter("user:*:tasks:*"):
        redis_client.delete(key)
    for key in redis_client.scan_iter("user:*:stats:*"): # Se tiver chaves de stats
        redis_client.delete(key)
    for key in redis_client.scan_iter("user:*:tags:top"): # <--- ADICIONADO: Resetar chaves de tags
        redis_client.delete(key)
    print("DEBUG RESET: Métricas Redis resetadas.")

def _recalculate_redis_metrics():
    """
    Recalcula todas as métricas no Redis a partir das tarefas existentes no MongoDB.
    Geralmente chamado após um reset ou na inicialização para garantir consistência.
    """
    print("Iniciando recalculo das métricas Redis a partir do MongoDB...")
    # Resetar todos os contadores antes de recalcular
    _reset_redis_metrics()

    all_tasks = colecao_tarefas.find({}) # Busca todas as tarefas no MongoDB

    for task_db in all_tasks:
        user_id = str(task_db.get("user_id", "anonimo")) # Pega o user_id da tarefa
        status = task_db.get("status", "pendente") # Pega o status da tarefa

        # Métrica 1: Contadores de Status de Tarefas
        redis_client.incr(f"user:{user_id}:tasks:status:{status}")

        # Métrica 4: Tarefas criadas hoje (se a data de criação for hoje)
        # Atenção: task_db["data_criacao"] é um objeto datetime aqui, se func.py salva datetime.now()
        if isinstance(task_db.get("data_criacao"), datetime):
            creation_date_str = task_db["data_criacao"].strftime("%Y-%m-%d")
            today_str = datetime.now().strftime("%Y-%m-%d")
            if creation_date_str == today_str:
                redis_client.incr(f"user:{user_id}:tasks:created_today:{today_str}")
                # Definir TTL para a chave diária (opcional, só para novas inserções ou sincronização)
                # redis_client.expire(f"user:{user_id}:tasks:created_today:{today_str}", 86400 * 2)

        # --- NOVO: Métrica 3: Tags Mais Utilizadas (no Recalculo) ---
        tags_da_tarefa = task_db.get("tags", [])
        for tag in tags_da_tarefa:
            # ZINCRBY: Incrementa o score da tag no Sorted Set.
            # Se a tag não existe, ela é criada com score 0 e depois incrementada para 1.
            redis_client.zincrby(f"user:{user_id}:tags:top", 1, tag)
            print(f"DEBUG RECALC: Tag '{tag}' incrementada para user:{user_id}")
        # --- FIM NOVO ---



        # Adicione aqui a lógica para recalcular outras métricas se já estivessem implementadas:
        # - Totalizadores por Período (tarefas concluídas por dia)
        # - Tags Mais Utilizadas
        # - Estatísticas de Produtividade (tempo médio, taxa de conclusão semanal)
        # ...

    print("Recalculo das métricas Redis concluído.")
